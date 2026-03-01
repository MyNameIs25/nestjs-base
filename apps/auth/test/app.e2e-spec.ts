import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './../src/auth.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
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
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/health (GET) should return success envelope', () => {
    return request(app.getHttpServer())
      .get('/auth/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toMatchObject({
          success: true,
          data: { status: 'ok' },
        });
        expect(body.timestamp).toBeDefined();
        expect(body.traceId).toBeDefined();
      });
  });

  it('/nonexistent (GET) should return error envelope', () => {
    return request(app.getHttpServer())
      .get('/nonexistent')
      .expect(404)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toMatchObject({
          success: false,
          code: 'A00004',
        });
        expect(body.timestamp).toBeDefined();
        expect(body.traceId).toBeDefined();
      });
  });

  it('/auth/health (GET) should return X-Request-Id header with valid UUID', () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    return request(app.getHttpServer())
      .get('/auth/health')
      .expect(200)
      .expect((res) => {
        const header = res.headers['x-request-id'];
        expect(header).toMatch(uuidRegex);
        const body = res.body as Record<string, unknown>;
        expect(body.traceId).toBe(header);
      });
  });

  it('/auth/health (GET) should echo client-provided x-request-id', () => {
    return request(app.getHttpServer())
      .get('/auth/health')
      .set('x-request-id', 'my-trace-123')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-request-id']).toBe('my-trace-123');
        const body = res.body as Record<string, unknown>;
        expect(body.traceId).toBe('my-trace-123');
      });
  });

  it('POST /auth/local/register should reject invalid payload', () => {
    return request(app.getHttpServer())
      .post('/auth/local/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);
  });

  it('POST /auth/local/login should reject empty password', () => {
    return request(app.getHttpServer())
      .post('/auth/local/login')
      .send({ email: 'test@example.com', password: '' })
      .expect(400);
  });

  it('POST /auth/refresh should reject empty refreshToken', () => {
    return request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: '' })
      .expect(400);
  });

  it('POST /auth/logout should reject request without Bearer token', () => {
    return request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: 'some-token' })
      .expect(401);
  });
});
