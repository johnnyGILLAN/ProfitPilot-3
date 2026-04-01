const request = require('supertest');
const app = require('../index');

describe('Backend server', () => {
  it('GET / should return welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/Welcome to Node\.js Starter API/i);
  });
});
