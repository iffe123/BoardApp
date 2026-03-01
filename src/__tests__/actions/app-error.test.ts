import { AppError } from '@/lib/errors/AppError';

describe('AppError', () => {
  it('maps API error payload into AppError', () => {
    const error = AppError.fromHttpResponse(400, {
      error: {
        code: 'VALIDATION',
        message: 'tenantId is required',
        details: { field: 'tenantId' },
      },
    });

    expect(error.code).toBe('VALIDATION');
    expect(error.message).toBe('tenantId is required');
    expect(error.details).toEqual({ field: 'tenantId' });
    expect(error.statusCode).toBe(400);
  });

  it('falls back to status mapping when payload shape is unknown', () => {
    const error = AppError.fromHttpResponse(404, { message: 'missing' }, 'Request failed');

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Request failed');
    expect(error.details).toEqual({ message: 'missing' });
  });
});
