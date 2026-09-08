/**
 * Test script for CampusHub API & Security Endpoints
 */

async function runTests() {
  const baseUrl = 'http://localhost:5000/api';

  console.log('--- 1. Testing Health Check ---');
  const healthRes = await fetch(`${baseUrl}/health`);
  const healthJson = await healthRes.json();
  console.log('Health Response:', healthRes.status, healthJson);
  if (healthJson.status !== 'ok' || healthJson.service !== 'CampusHub REST API') {
    throw new Error('Health check failed expectation');
  }

  console.log('\n--- 2. Testing Invalid Email on /auth/send-otp ---');
  const invalidEmailRes = await fetch(`${baseUrl}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' })
  });
  const invalidEmailJson = await invalidEmailRes.json();
  console.log('Invalid Email Response:', invalidEmailRes.status, invalidEmailJson);

  console.log('\n--- 3. Testing Protected Route Without Token ---');
  const protectedRes = await fetch(`${baseUrl}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Team', eventName: 'Hackathon 2026' })
  });
  const protectedJson = await protectedRes.json();
  console.log('Protected Route Response:', protectedRes.status, protectedJson);

  console.log('\n--- 4. Testing Product Creation Without Auth ---');
  const prodRes = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Laptop', price: '₹20000' })
  });
  const prodJson = await prodRes.json();
  console.log('Product Protected Response:', prodRes.status, prodJson);

  console.log('\n--- 5. Testing Rate Limiting on /auth/send-otp ---');
  let rateLimited = false;
  for (let i = 0; i < 8; i++) {
    const res = await fetch(`${baseUrl}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rate_test@cgc.edu.in' })
    });
    if (res.status === 429) {
      const data = await res.json();
      console.log(`Hit Rate Limit as expected on attempt ${i + 1}: Status 429`, data.message);
      rateLimited = true;
      break;
    }
  }
  console.log('Rate limiter active:', rateLimited);

  console.log('\nAll API automated sanity checks completed successfully!');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
