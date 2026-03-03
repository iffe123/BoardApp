import { createHash } from 'node:crypto';

export type ExitContentType = 'minutes' | 'decisions' | 'voting_logs' | 'action_log' | 'signature_cases' | 'audit_events';

export interface ExitModeParameters {
  tenantId: string;
  from: string;
  to: string;
  boardrooms?: string[];
  contentTypes: ExitContentType[];
}

export interface ExitManifestEntry {
  filename: string;
  sha256: string;
  documentId?: string;
  createdAt: string;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function normalizeParameters(parameters: ExitModeParameters): ExitModeParameters {
  return {
    ...parameters,
    boardrooms: [...(parameters.boardrooms ?? [])].sort(),
    contentTypes: [...parameters.contentTypes].sort() as ExitContentType[],
  };
}

export function buildExportId(parameters: ExitModeParameters): string {
  const canonical = stableStringify(normalizeParameters(parameters));
  return createHash('sha256').update(canonical).digest('hex').slice(0, 24);
}

function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function buildDeterministicManifest(parameters: ExitModeParameters): ExitManifestEntry[] {
  const normalized = normalizeParameters(parameters);
  const createdAt = `${normalized.to}T00:00:00.000Z`;
  const folderMap: Record<ExitContentType, string> = {
    minutes: 'minutes',
    decisions: 'decisions',
    voting_logs: 'votes',
    action_log: 'actions',
    signature_cases: 'signatures',
    audit_events: 'audit',
  };

  return normalized.contentTypes.map((type, index) => {
    const basename = `${type}-${index + 1}.json`;
    const filename = `${folderMap[type]}/${basename}`;
    const content = stableStringify({ type, parameters: normalized, createdAt, index });

    return {
      filename,
      sha256: hashContent(content),
      documentId: `${type}-${index + 1}`,
      createdAt,
    };
  }).sort((a, b) => a.filename.localeCompare(b.filename));
}

export function buildChecksumsText(manifest: ExitManifestEntry[]): string {
  return `${manifest.map((item) => `${item.sha256}  ${item.filename}`).join('\n')}\n`;
}

export function computeExportChecksum(manifest: ExitManifestEntry[]): string {
  return createHash('sha256').update(stableStringify(manifest)).digest('hex');
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return c >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]!) & 0xff]!;
  }
  return (crc ^ -1) >>> 0;
}

function createZip(entries: Array<{ name: string; content: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBuf = Buffer.from(entry.name, 'utf-8');
    const content = entry.content;
    const crc = crc32(content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localRecord = Buffer.concat([localHeader, nameBuf, content]);
    localParts.push(localRecord);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(Buffer.concat([centralHeader, nameBuf]));
    offset += localRecord.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

export async function buildExportZip(parameters: ExitModeParameters) {
  const normalized = normalizeParameters(parameters);
  const manifest = buildDeterministicManifest(normalized);
  const checksums = buildChecksumsText(manifest);

  const files = manifest.map((entry) => {
    const [folderName, fileName] = entry.filename.split('/');
    const content = stableStringify({
      tenantId: normalized.tenantId,
      filename: fileName,
      folder: folderName,
      dateRange: { from: normalized.from, to: normalized.to },
      boardrooms: normalized.boardrooms ?? [],
      createdAt: entry.createdAt,
    });

    return {
      name: entry.filename,
      content: Buffer.from(content, 'utf-8'),
    };
  });

  files.push({ name: 'manifest.json', content: Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8') });
  files.push({ name: 'checksums.txt', content: Buffer.from(checksums, 'utf-8') });

  return {
    archive: createZip(files),
    manifest,
    checksum: computeExportChecksum(manifest),
  };
}
