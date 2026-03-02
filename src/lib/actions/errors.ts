export type AppErrorCode = 'VALIDATION' | 'PERMISSION' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toErrorResponse(error: unknown): { status: number; body: { error: string; code: AppErrorCode } } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.message, code: error.code } };
  }

  return {
    status: 500,
    body: {
      error: 'Internal server error',
      code: 'INTERNAL',
    },
  };
}
