/**
 * Mock for next/server module
 * Provides mock implementations of NextRequest and NextResponse for testing
 */

export class NextRequest {
  private _url: URL;
  private _method: string;
  private _body: string | null;
  private _headers: Map<string, string>;

  constructor(url: string | URL, init?: RequestInit) {
    this._url = new URL(url.toString());
    this._method = init?.method || 'GET';
    this._body = typeof init?.body === 'string' ? init.body : null;
    this._headers = new Map();

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          this._headers.set(key.toLowerCase(), value);
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value);
        });
      } else {
        Object.entries(init.headers).forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value);
        });
      }
    }
  }

  get url(): string {
    return this._url.toString();
  }

  get method(): string {
    return this._method;
  }

  get headers(): Headers {
    const headers = new Headers();
    this._headers.forEach((value, key) => {
      headers.set(key, value);
    });
    return headers;
  }

  async json(): Promise<unknown> {
    if (!this._body) return {};
    return JSON.parse(this._body);
  }

  async text(): Promise<string> {
    return this._body || '';
  }
}

export class NextResponse {
  private _body: string;
  private _status: number;
  private _headers: Map<string, string>;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this._body = body?.toString() || '';
    this._status = init?.status || 200;
    this._headers = new Map();

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((value, key) => {
          this._headers.set(key.toLowerCase(), value);
        });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value);
        });
      } else {
        Object.entries(init.headers as Record<string, string>).forEach(([key, value]) => {
          this._headers.set(key.toLowerCase(), value);
        });
      }
    }
  }

  get status(): number {
    return this._status;
  }

  get ok(): boolean {
    return this._status >= 200 && this._status < 300;
  }

  get headers(): Headers {
    const headers = new Headers();
    this._headers.forEach((value, key) => {
      headers.set(key, value);
    });
    return headers;
  }

  async json(): Promise<unknown> {
    return JSON.parse(this._body || '{}');
  }

  async text(): Promise<string> {
    return this._body;
  }

  static json(data: unknown, init?: ResponseInit): NextResponse {
    const body = JSON.stringify(data);
    return new NextResponse(body, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers as Record<string, string>),
      },
    });
  }

  static redirect(url: string | URL, status?: number): NextResponse {
    return new NextResponse(null, {
      status: status || 307,
      headers: {
        location: url.toString(),
      },
    });
  }
}
