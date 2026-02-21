import { defineErrorCodes } from './error-codes.factory';

describe('defineErrorCodes', () => {
  it('should create error code definitions with explicit httpStatus', () => {
    const codes = defineErrorCodes(
      { domain: '01' },
      {
        USERNAME_TAKEN: {
          source: 'A',
          seq: 1,
          httpStatus: 409,
          message: 'Username already exists',
        },
      },
    );

    expect(codes.USERNAME_TAKEN).toEqual({
      code: 'A01001',
      httpStatus: 409,
      message: 'Username already exists',
    });
  });

  it('should default httpStatus based on error source', () => {
    const codes = defineErrorCodes(
      { domain: '00' },
      {
        USER_ERROR: { source: 'A', seq: 1, message: 'Bad request' },
        SYS_ERROR: { source: 'B', seq: 1, message: 'Internal error' },
        THIRD_PARTY: { source: 'C', seq: 1, message: 'Third-party error' },
      },
    );

    expect(codes.USER_ERROR.httpStatus).toBe(400);
    expect(codes.SYS_ERROR.httpStatus).toBe(500);
    expect(codes.THIRD_PARTY.httpStatus).toBe(502);
  });

  it('should auto-compose code from source + domain + seq', () => {
    const codes = defineErrorCodes(
      { domain: '03' },
      {
        FIRST: { source: 'A', seq: 42, message: 'first' },
        SECOND: { source: 'B', seq: 1, message: 'second' },
        THIRD: { source: 'C', seq: 999, message: 'third' },
      },
    );

    expect(codes.FIRST.code).toBe('A03042');
    expect(codes.SECOND.code).toBe('B03001');
    expect(codes.THIRD.code).toBe('C03999');
  });

  it('should preserve all keys from input', () => {
    const codes = defineErrorCodes(
      { domain: '01' },
      {
        FIRST: { source: 'A', seq: 1, message: 'first' },
        SECOND: { source: 'B', seq: 1, message: 'second' },
      },
    );

    expect(Object.keys(codes)).toEqual(['FIRST', 'SECOND']);
  });

  describe('domain validation', () => {
    it('should throw on non-2-digit domain', () => {
      expect(() =>
        defineErrorCodes(
          { domain: '1' },
          {
            X: { source: 'A', seq: 1, message: 'x' },
          },
        ),
      ).toThrow('Invalid domain "1"');
    });

    it('should throw on 3-digit domain', () => {
      expect(() =>
        defineErrorCodes(
          { domain: '123' },
          {
            X: { source: 'A', seq: 1, message: 'x' },
          },
        ),
      ).toThrow('Invalid domain "123"');
    });

    it('should throw on non-numeric domain', () => {
      expect(() =>
        defineErrorCodes(
          { domain: 'AB' },
          {
            X: { source: 'A', seq: 1, message: 'x' },
          },
        ),
      ).toThrow('Invalid domain "AB"');
    });
  });

  describe('source validation', () => {
    it('should throw on invalid source', () => {
      expect(() =>
        defineErrorCodes(
          { domain: '01' },
          {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            BAD: { source: 'X' as any, seq: 1, message: 'bad' },
          },
        ),
      ).toThrow('Invalid source "X" for "BAD"');
    });
  });

  describe('seq validation', () => {
    it('should throw on seq = 0', () => {
      expect(() =>
        defineErrorCodes(
          { domain: '01' },
          {
            BAD: { source: 'A', seq: 0, message: 'bad' },
          },
        ),
      ).toThrow('Invalid seq 0 for "BAD"');
    });

    it('should throw on seq > 999', () => {
      expect(() =>
        defineErrorCodes(
          { domain: '01' },
          {
            BAD: { source: 'A', seq: 1000, message: 'bad' },
          },
        ),
      ).toThrow('Invalid seq 1000 for "BAD"');
    });

    it('should throw on non-integer seq', () => {
      expect(() =>
        defineErrorCodes(
          { domain: '01' },
          {
            BAD: { source: 'A', seq: 1.5, message: 'bad' },
          },
        ),
      ).toThrow('Invalid seq 1.5 for "BAD"');
    });
  });

  describe('duplicate code detection', () => {
    it('should throw on duplicate composed codes', () => {
      expect(() =>
        defineErrorCodes(
          { domain: '01' },
          {
            FIRST: { source: 'A', seq: 1, message: 'first' },
            SECOND: { source: 'A', seq: 1, message: 'second' },
          },
        ),
      ).toThrow('Duplicate error code "A01001" found at "SECOND"');
    });
  });
});
