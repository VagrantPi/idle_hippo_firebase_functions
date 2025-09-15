import {describe, it, beforeEach} from 'node:test';
import assert from 'node:assert/strict';

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
    method: init.method || 'GET',
    headers,
    body: init.body,
    get: (name: string) => headers[name.toLowerCase()],
  } as Req;
}

describe('healthz', () => {
  beforeEach(() => {
    delete process.env.USE_PLAY_API;
    delete process.env.API_KEY;
  });

  it('reports mock true when USE_PLAY_API=false', async () => {
    process.env.USE_PLAY_API = 'false';
    const req = makeReq({ method: 'GET' });
    const res = new MockRes();
    await functions.healthz(req, res);
    await res.finished;
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.mock, true);
  });

  it('reports mock false when USE_PLAY_API=true', async () => {
    process.env.USE_PLAY_API = 'true';
    const req = makeReq({ method: 'GET' });
    const res = new MockRes();
    await functions.healthz(req, res);
    await res.finished;
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.mock, false);
  });

  it('handles CORS preflight (OPTIONS) with 204 and headers', async () => {
    const req = makeReq({ method: 'OPTIONS' });
    const res = new MockRes();
    await functions.healthz(req, res);
    await res.finished;
    assert.equal(res.statusCode, 204);
    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.ok(res.headers['access-control-allow-methods']);
  });
});

