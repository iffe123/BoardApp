export type AppErrorCode = 'VALIDATION' | 'PERMISSION' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION: 400,
  PERMISSION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

const CODE_BY_STATUS: Record<number, AppErrorCode> = {
  400: 'VALIDATION',
  401: 'PERMISSION',
  403: 'PERMISSION',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  get statusCode(): number {
    return STATUS_BY_CODE[this.code] ?? 500;
  }

  toJSON(): { code: AppErrorCode; message: string; details?: unknown } {
    return {
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }

  static fromUnknown(error: unknown, fallbackMessage = 'Unexpected error'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError('INTERNAL', error.message || fallbackMessage);
    }

    return new AppError('INTERNAL', fallbackMessage, error);
  }

  static fromHttpResponse(
    status: number,
    payload: unknown,
    fallbackMessage = 'Request failed'
  ): AppError {
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const errorPayload = (payload as { error?: unknown }).error;
      if (
        errorPayload &&
        typeof errorPayload === 'object' &&
        'code' in errorPayload &&
        'message' in errorPayload
      ) {
        const typed = errorPayload as { code: AppErrorCode; message: string; details?: unknown };
        return new AppError(typed.code, typed.message, typed.details);
      }
    }

    const code = CODE_BY_STATUS[status] ?? 'INTERNAL';
    return new AppError(code, fallbackMessage, payload);
  }
}
