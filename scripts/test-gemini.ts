/**
 * Firebase AI Logic Integration Test
 *
 * Run this locally to verify the Gemini integration works:
 *   npx tsx scripts/test-gemini.ts
 *
 * Prerequisites:
 *   - .env.local must have NEXT_PUBLIC_FIREBASE_* variables set
 *   - Gemini Developer API must be enabled in Firebase Console
 */

import { initializeApp } from 'firebase/app';
import { getAI, GoogleAIBackend, getGenerativeModel } from 'firebase/ai';

// Load env vars from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testGemini() {
  console.log('=== Firebase AI Logic (Gemini) Integration Test ===\n');

  // Step 1: Verify config
  console.log('1. Checking Firebase config...');
  if (!firebaseConfig.apiKey) {
    console.error('   FAIL: NEXT_PUBLIC_FIREBASE_API_KEY is not set in .env.local');
    process.exit(1);
  }
  console.log(`   OK: Project ID = ${firebaseConfig.projectId}`);

  // Step 2: Initialize Firebase
  console.log('\n2. Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  console.log('   OK: Firebase app initialized');

  // Step 3: Initialize AI with GoogleAIBackend
  console.log('\n3. Initializing Firebase AI Logic...');
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  console.log('   OK: Firebase AI initialized with GoogleAIBackend');

  // Step 4: Get Gemini model
  console.log('\n4. Getting Gemini model...');
  const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });
  console.log('   OK: Model reference created (gemini-2.0-flash)');

  // Step 5: Test simple generation
  console.log('\n5. Testing text generation...');
  try {
    const result = await model.generateContent('Say "Hello from GovernanceOS!" in one sentence.');
    const text = result.response.text();
    console.log(`   OK: Response received!`);
    console.log(`   Response: "${text}"`);
  } catch (error) {
    console.error(`   FAIL: ${error instanceof Error ? error.message : error}`);
    console.log('\n   Troubleshooting:');
    console.log('   - Is the Gemini Developer API enabled in Firebase Console → AI Logic?');
    console.log('   - Are your Firebase config values correct?');
    process.exit(1);
  }

  // Step 6: Test token counting
  console.log('\n6. Testing token counting...');
  try {
    const tokenResult = await model.countTokens('Test input for board governance analysis');
    console.log(`   OK: Token count = ${tokenResult.totalTokens}`);
  } catch (error) {
    console.error(`   FAIL: ${error instanceof Error ? error.message : error}`);
  }

  // Step 7: Test a structured analysis prompt (like our API would use)
  console.log('\n7. Testing structured financial analysis...');
  try {
    const analysisPrompt = `You are an experienced CFO. Analyze this financial data and respond with JSON only (no code fences):

## Financial Data
| Period | Revenue | Expenses | Net Income |
|--------|---------|----------|------------|
| Q3 2025 | 2,500,000 | 2,100,000 | 400,000 |
| Q4 2025 | 2,300,000 | 2,250,000 | 50,000 |

Respond with: { "healthScore": number, "financialSummary": "string", "recommendations": ["string"] }`;

    const result = await model.generateContent(analysisPrompt);
    const responseText = result.response.text();

    // Try to parse JSON
    let parsed;
    try {
      let jsonStr = responseText;
      const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      parsed = JSON.parse(jsonStr);
      console.log('   OK: Structured JSON response received!');
      console.log(`   Health Score: ${parsed.healthScore}`);
      console.log(`   Summary: ${parsed.financialSummary?.substring(0, 100)}...`);
    } catch {
      console.log('   WARN: Response was not valid JSON, but text was received');
      console.log(`   Response: ${responseText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error(`   FAIL: ${error instanceof Error ? error.message : error}`);
  }

  console.log('\n=== Test Complete ===');
}

testGemini();
