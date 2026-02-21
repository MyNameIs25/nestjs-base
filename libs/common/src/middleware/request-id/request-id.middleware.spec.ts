import type { Request, Response, NextFunction } from 'express';
import {
  RequestIdMiddleware,
  REQUEST_ID_HEADER,
} from './request-id.middleware';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function createMocks(headerValue?: string) {
  const headers =
    headerValue !== undefined ? { [REQUEST_ID_HEADER]: headerValue } : {};
  const req = { headers } as unknown as Request;

  const setHeader = jest.fn();
  const res = { setHeader } as unknown as Response;

  const next = jest.fn() as unknown as NextFunction;

  return { req, res, setHeader, next };
}

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it('should generate a UUID when no header is present', () => {
    const { req, res, setHeader, next } = createMocks();

    middleware.use(req, res, next);

    expect(req.id).toMatch(UUID_REGEX);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('should use client-provided x-request-id header', () => {
    const { req, res, setHeader, next } = createMocks('client-trace-123');

    middleware.use(req, res, next);

    expect(req.id).toBe('client-trace-123');
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-trace-123');
    expect(next).toHaveBeenCalled();
  });

  it('should fall back to UUID on empty-string header', () => {
    const { req, res, setHeader, next } = createMocks('');

    middleware.use(req, res, next);

    expect(req.id).toMatch(UUID_REGEX);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('should set X-Request-Id response header', () => {
    const { req, res, setHeader, next } = createMocks();

    middleware.use(req, res, next);

    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
  });

  it('should call next()', () => {
    const { req, res, next } = createMocks();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
