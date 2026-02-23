import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ZodValidationPipe } from 'nestjs-zod';
import { ThrottlerGuard } from '@nestjs/throttler';
import { DRIZZLE } from '@app/common/database/database.constants';
import type { DrizzleDB } from '@app/common';
import { refreshTokens } from '../src/tokens/schemas/refresh-token.schema';
import { userAuthMethods } from '../src/auth-methods/schemas/user-auth-method.schema';
import { users } from '../src/users/schemas/user.schema';
import { AuthModule } from '../src/auth.module';

interface TokenPairResponse {
  success: boolean;
  data: { accessToken: string; refreshToken: string };
}

interface ErrorResponse {
  success: boolean;
  code: string;
}

describe('Auth Flow (e2e)', () => {
  let app: INestApplication<App>;
  let db: DrizzleDB;

  const testEmail = 'test@example.com';
  const testPassword = 'TestPass1!';

  beforeAll(async () => {
    process.env.LOG_LEVEL = 'silent';
    process.env.SERVICE_NAME = 'auth';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'auth_db';
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    process.env.JWT_SECRET =
      'super-secret-key-change-in-production-min-32-chars';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();

    db = moduleFixture.get<DrizzleDB>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(refreshTokens);
    await db.delete(userAuthMethods);
    await db.delete(users);
  });

  /** Helper: register a user and return the token pair */
  async function registerUser(
    email = testEmail,
    password = testPassword,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await request(app.getHttpServer())
      .post('/auth/local/register')
      .send({ email, password });
    return (res.body as TokenPairResponse).data;
  }

  it('POST /auth/local/register → returns token pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/local/register')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    const body = res.body as TokenPairResponse;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/local/register → duplicate email returns 409', async () => {
    await registerUser();

    const res = await request(app.getHttpServer())
      .post('/auth/local/register')
      .send({ email: testEmail, password: testPassword })
      .expect(409);

    const body = res.body as ErrorResponse;
    expect(body.success).toBe(false);
    expect(body.code).toBe('A01004');
  });

  it('POST /auth/local/login → returns token pair', async () => {
    await registerUser();

    const res = await request(app.getHttpServer())
      .post('/auth/local/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const body = res.body as TokenPairResponse;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/local/login → wrong password returns 401', async () => {
    await registerUser();

    const res = await request(app.getHttpServer())
      .post('/auth/local/login')
      .send({ email: testEmail, password: 'WrongPass1!' })
      .expect(401);

    const body = res.body as ErrorResponse;
    expect(body.success).toBe(false);
    expect(body.code).toBe('A01002');
  });

  it('POST /auth/refresh → returns new token pair', async () => {
    const tokens = await registerUser();

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);

    const body = res.body as TokenPairResponse;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('POST /auth/refresh → reused token returns 401 (token reuse detected)', async () => {
    const tokens = await registerUser();

    // First refresh succeeds
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);

    // Second refresh with the same (now-old) token triggers reuse detection
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);

    const body = res.body as ErrorResponse;
    expect(body.success).toBe(false);
    expect(body.code).toBe('B01006');
  });

  it('POST /auth/logout → succeeds', async () => {
    const tokens = await registerUser();

    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);

    const body = res.body as { success: boolean; data: { message: string } };
    expect(body.success).toBe(true);
    expect(body.data.message).toBeDefined();
  });

  it('POST /auth/logout → refresh after logout fails', async () => {
    const tokens = await registerUser();

    // Logout revokes the refresh token
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);

    // Attempting to refresh with the revoked token should fail
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);

    const body = res.body as ErrorResponse;
    expect(body.success).toBe(false);
  });
});
