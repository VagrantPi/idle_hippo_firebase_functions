import {describe, it, beforeEach} from 'node:test';
import assert from 'node:assert/strict';

// Import built functions from compiled lib path at runtime by relative require.
// During tests, we run after building, so these paths exist.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const functions = require('../src/index.js');

type Req = {
  method: string;
  headers?: Record<string, string>;
  body?: any;
  get: (name: string) => string | undefined;
};

class MockRes {
  statusCode = 200;
  headers: Record<string, string> = {};
  body: any;
  private doneResolve!: () => void;
  finished = new Promise<void>((resolve) => {
    this.doneResolve = resolve;
  });

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  json(payload: any) {
    this.body = payload;
    this.doneResolve();
    return this;
  }
  send(payload: any) {
    this.body = payload;
    this.doneResolve();
    return this;
  }
}

function makeReq(init: Partial<Req>): Req {
  const headers = Object.fromEntries(
    Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  return {
    method: init.method || 'POST',
    headers,
    body: init.body,
    get: (name: string) => headers[name.toLowerCase()],
  } as Req;
}

describe('verifyPurchase (mock)', () => {
  beforeEach(() => {
    // Ensure mock mode by default
    delete process.env.USE_PLAY_API;
    delete process.env.API_KEY;
  });

  it('returns 200 ok with mock data', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        packageName: 'com.example.idleHippo',
        productId: 'foo',
        purchaseToken: 'bar',
      },
    });
    const res = new MockRes();
    await functions.verifyPurchase(req, res);
    await res.finished;

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.purchaseState, 0);
    assert.equal(res.body.consumptionState, 0);
    assert.equal(res.body.orderId, 'MOCK.ORDER');
    assert.ok(typeof res.body.purchaseTimeMillis === 'string');
  });

  it('returns 400 when missing fields', async () => {
    const req = makeReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { packageName: 'com.example.idleHippo' },
    });
    const res = new MockRes();
    await functions.verifyPurchase(req, res);
    await res.finished;

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
  });

  it('handles CORS preflight', async () => {
    const req = makeReq({ method: 'OPTIONS' });
    const res = new MockRes();
    await functions.verifyPurchase(req, res);
    await res.finished;
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers['access-control-allow-origin'], '*');
  });

  it('requires API key when configured', async () => {
    process.env.API_KEY = 'secret';
    const req = makeReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: {
        packageName: 'com.example.idleHippo',
        productId: 'foo',
        purchaseToken: 'bar',
      },
    });
    const res = new MockRes();
    await functions.verifyPurchase(req, res);
    await res.finished;
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
  });
});
 
