import { buildDeterministicManifest, computeExportChecksum } from '@/lib/exit-mode';

describe('Exit mode manifest determinism', () => {
  it('produces same checksum for same parameters in different order', () => {
    const first = {
      tenantId: 'tenant-1',
      from: '2025-01-01',
      to: '2025-12-31',
      boardrooms: ['B', 'A'],
      contentTypes: ['decisions', 'minutes'] as const,
    };

    const second = {
      tenantId: 'tenant-1',
      from: '2025-01-01',
      to: '2025-12-31',
      boardrooms: ['A', 'B'],
      contentTypes: ['minutes', 'decisions'] as const,
    };

    const checksumOne = computeExportChecksum(buildDeterministicManifest({ ...first, contentTypes: [...first.contentTypes] }));
    const checksumTwo = computeExportChecksum(buildDeterministicManifest({ ...second, contentTypes: [...second.contentTypes] }));

    expect(checksumOne).toBe(checksumTwo);
  });
});
