const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../server');

test('GET /api returns a healthy status message', async () => {
  const response = await request(app).get('/api');
  assert.equal(response.status, 200);
  assert.match(response.body.message, /Hotel Management API is running/i);
});
