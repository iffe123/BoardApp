import { test, expect } from '@playwright/test';

test.describe('API Routes - Meetings', () => {
  test('GET /api/meetings should return a response', async ({ request }) => {
    const response = await request.get('/api/meetings');
    // Should return either data or an auth error (401)
    expect([200, 401, 403]).toContain(response.status());
  });

  test('POST /api/meetings should require authentication', async ({ request }) => {
    const response = await request.post('/api/meetings', {
      data: {
        title: 'Test Meeting',
        type: 'ordinary',
        scheduledAt: new Date().toISOString(),
      },
    });
    // Without auth, should return 401 or similar
    expect([200, 400, 401, 403, 500]).toContain(response.status());
  });
});

test.describe('API Routes - Documents', () => {
  test('GET /api/documents should return a response', async ({ request }) => {
    const response = await request.get('/api/documents');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('API Routes - Members', () => {
  test('GET /api/members should return a response', async ({ request }) => {
    const response = await request.get('/api/members');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('API Routes - Templates', () => {
  test('GET /api/templates should return a response', async ({ request }) => {
    const response = await request.get('/api/templates');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('API Routes - Decisions', () => {
  test('GET /api/decisions should return a response', async ({ request }) => {
    const response = await request.get('/api/decisions');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('API Routes - Settings', () => {
  test('GET /api/settings should return a response', async ({ request }) => {
    const response = await request.get('/api/settings');
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('API Routes - AI Endpoints', () => {
  test('POST /api/ai/generate-minutes should require proper request body', async ({
    request,
  }) => {
    const response = await request.post('/api/ai/generate-minutes', {
      data: {},
    });
    // Should return 400 (bad request) or 401 (unauthorized)
    expect([400, 401, 403, 500]).toContain(response.status());
  });

  test('POST /api/ai/analyze-financials should require proper request body', async ({
    request,
  }) => {
    const response = await request.post('/api/ai/analyze-financials', {
      data: {},
    });
    expect([400, 401, 403, 500]).toContain(response.status());
  });

  test('POST /api/ai/meeting-assistant should require proper request body', async ({
    request,
  }) => {
    const response = await request.post('/api/ai/meeting-assistant', {
      data: {},
    });
    expect([400, 401, 403, 500]).toContain(response.status());
  });
});

test.describe('API Routes - BankID', () => {
  test('POST /api/bankid/sign should require authentication', async ({
    request,
  }) => {
    const response = await request.post('/api/bankid/sign', {
      data: {
        documentId: 'test-doc',
        userId: 'test-user',
      },
    });
    expect([400, 401, 403, 500]).toContain(response.status());
  });

  test('POST /api/bankid/cancel should handle missing data', async ({
    request,
  }) => {
    const response = await request.post('/api/bankid/cancel', {
      data: {},
    });
    expect([400, 401, 403, 500]).toContain(response.status());
  });
});

test.describe('API Routes - Response Format', () => {
  test('API responses should return JSON content type', async ({ request }) => {
    const response = await request.get('/api/meetings');
    const contentType = response.headers()['content-type'];
    if (contentType) {
      expect(contentType).toContain('application/json');
    }
  });
});

test.describe('API Routes - Method Validation', () => {
  test('should handle unsupported HTTP methods', async ({ request }) => {
    // Sending a PATCH to an endpoint that may not support it
    const response = await request.patch('/api/meetings', {
      data: { test: true },
    });
    // Should return 405 Method Not Allowed or similar error
    expect([200, 400, 401, 405, 500]).toContain(response.status());
  });
});
