import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PaymentsModule } from './../src/payments.module';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.LOG_LEVEL = 'silent';
    process.env.SERVICE_NAME = 'payments';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PaymentsModule],
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
          data: 'Hello from payments!',
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
});
