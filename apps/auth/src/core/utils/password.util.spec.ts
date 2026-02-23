import { hashPassword, verifyPassword } from './password.util';

describe('PasswordUtil', () => {
  it('should hash and verify a password successfully', async () => {
    const plain = 'my-secure-password-123';
    const hash = await hashPassword(plain);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(plain);

    const valid = await verifyPassword(hash, plain);
    expect(valid).toBe(true);
  });

  it('should return false for wrong password', async () => {
    const hash = await hashPassword('correct-password');
    const valid = await verifyPassword(hash, 'wrong-password');
    expect(valid).toBe(false);
  });

  it('should produce different hashes for same password', async () => {
    const plain = 'same-password';
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);
    expect(hash1).not.toBe(hash2);
  });
});
