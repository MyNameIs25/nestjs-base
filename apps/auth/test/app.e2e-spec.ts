import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from './../src/auth.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.LOG_LEVEL = 'silent';
    process.env.SERVICE_NAME = 'auth';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_NAME = 'auth_db';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) should return success envelope', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toMatchObject({
          success: true,
          data: 'Hello from auth!',
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

  it('/error/biz (GET) should return user error with AUTH error code', () => {
    return request(app.getHttpServer())
      .get('/error/biz')
      .expect(409)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toMatchObject({
          success: false,
          code: 'A01001',
          message: 'Username "john" already exists',
        });
      });
  });

  it('/error/sys (GET) should return system error with devMessage', () => {
    return request(app.getHttpServer())
      .get('/error/sys')
      .expect(500)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toMatchObject({
          success: false,
          code: 'B01001',
          message: 'Auth service unavailable',
          devMessage: 'Redis connection refused on port 6379',
        });
      });
  });

  it('/error/not-found (GET) should return common NOT_FOUND', () => {
    return request(app.getHttpServer())
      .get('/error/not-found')
      .expect(404)
      .expect((res) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toMatchObject({
          success: false,
          code: 'A00004',
          message: 'Not found',
        });
      });
  });
});
