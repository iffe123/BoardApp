/**
 * Gemini AI API Route Tests
 *
 * Tests the Gemini analysis endpoint logic including:
 * - Request validation
 * - Prompt construction
 * - Response parsing
 * - Error handling
 */

import { NextRequest } from 'next/server';

// Mock undici ProxyAgent
jest.mock('undici', () => ({
  ProxyAgent: jest.fn(),
}));

// Mock global fetch for Gemini API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Set up env vars before importing the route
process.env.GEMINI_API_KEY = 'test-api-key';

import { GET, POST } from '@/app/api/ai/gemini/route';

describe('Gemini AI API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns API documentation with configured status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.name).toBe('Gemini AI Analysis API');
      expect(data.provider).toBe('gemini');
      expect(data.model).toBe('gemini-2.0-flash');
      expect(data.configured).toBe(true);
      expect(data.endpoints.POST).toBeDefined();
    });
  });

  describe('POST', () => {
    it('returns 400 when no data is provided', async () => {
      const request = new NextRequest('http://localhost/api/ai/gemini', {
        method: 'POST',
        body: JSON.stringify({ analysisType: 'financial_health' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Either financialData or meetingData must be provided');
    });

    it('calls Gemini API with correct financial analysis prompt', async () => {
      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                healthScore: 65,
                financialSummary: 'Revenue declining with margin compression',
                financialInsights: [{
                  type: 'warning',
                  metric: 'Revenue',
                  value: '2,300,000',
                  trend: 'declining',
                  insight: 'Revenue dropped 8% QoQ',
                }],
                recommendations: ['Investigate revenue decline', 'Review expense structure'],
              }),
            }],
          },
        }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeminiResponse,
      });

      const request = new NextRequest('http://localhost/api/ai/gemini', {
        method: 'POST',
        body: JSON.stringify({
          analysisType: 'financial_health',
          financialData: [
            {
              period: '2025-Q3',
              revenue: 2500000,
              expenses: 2100000,
              netIncome: 400000,
              cashBalance: 1200000,
              accountsReceivable: 350000,
              accountsPayable: 280000,
            },
            {
              period: '2025-Q4',
              revenue: 2300000,
              expenses: 2250000,
              netIncome: 50000,
              cashBalance: 900000,
              accountsReceivable: 500000,
              accountsPayable: 310000,
            },
          ],
          context: {
            companyName: 'Nordic Tech AB',
            industry: 'SaaS',
            locale: 'en',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(data.analysisType).toBe('financial_health');
      expect(data.model).toBe('gemini-2.0-flash');
      expect(data.provider).toBe('gemini');
      expect(data.healthScore).toBe(65);
      expect(data.financialSummary).toBe('Revenue declining with margin compression');
      expect(data.recommendations).toHaveLength(2);
      expect(data.generatedAt).toBeDefined();

      // Verify fetch was called with correct URL
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('generativelanguage.googleapis.com');
      expect(fetchCall[0]).toContain('gemini-2.0-flash');
      expect(fetchCall[0]).toContain('key=test-api-key');

      // Verify prompt contains the financial data
      const body = JSON.parse(fetchCall[1].body);
      const promptText = body.contents[0].parts[0].text;
      expect(promptText).toContain('Nordic Tech AB');
      expect(promptText).toContain('SaaS');
      expect(promptText).toContain('2025-Q3');
      expect(promptText).toContain('2025-Q4');
      expect(promptText).toContain('financial_health');
    });

    it('calls Gemini API with meeting analysis prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  meetingSummary: 'Board discussed Q4 results',
                  keyDecisions: ['Approved budget'],
                  actionItems: [{ title: 'Review costs', priority: 'high' }],
                }),
              }],
            },
          }],
        }),
      });

      const request = new NextRequest('http://localhost/api/ai/gemini', {
        method: 'POST',
        body: JSON.stringify({
          analysisType: 'meeting_summary',
          meetingData: {
            meeting: { title: 'Q4 Board Meeting' },
            notes: 'Discussed Q4 financial results and approved 2026 budget.',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meetingSummary).toBe('Board discussed Q4 results');
      expect(data.keyDecisions).toContain('Approved budget');
      expect(data.actionItems).toHaveLength(1);
    });

    it('handles Gemini API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const request = new NextRequest('http://localhost/api/ai/gemini', {
        method: 'POST',
        body: JSON.stringify({
          analysisType: 'risk_assessment',
          financialData: [{
            period: '2025-Q4',
            revenue: 1000000,
            expenses: 900000,
            netIncome: 100000,
            cashBalance: 500000,
            accountsReceivable: 200000,
            accountsPayable: 150000,
          }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Gemini API error (429)');
    });

    it('handles non-JSON Gemini response as fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: 'This is a plain text response without JSON formatting.',
              }],
            },
          }],
        }),
      });

      const request = new NextRequest('http://localhost/api/ai/gemini', {
        method: 'POST',
        body: JSON.stringify({
          analysisType: 'comprehensive',
          financialData: [{
            period: '2025-Q4',
            revenue: 1000000,
            expenses: 900000,
            netIncome: 100000,
            cashBalance: 500000,
            accountsReceivable: 200000,
            accountsPayable: 150000,
          }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.executiveSummary).toContain('plain text response');
      expect(data.recommendations).toContain('Analysis completed but JSON parsing failed.');
    });
  });
});
