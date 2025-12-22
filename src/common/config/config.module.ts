import { Module } from '@nestjs/common';
import { ConfigModule as Config } from '@nestjs/config';
import * as Joi from 'joi';

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().ip().default('127.0.0.1'),
})
const envFilePath = [`.env.${process.env.NODE_ENV || 'development'}`, '.env'];


@Module({
    imports: [
    Config.forRoot({
      isGlobal: true,
      envFilePath,
      validationSchema: schema,
    }),
  ],
})
export class ConfigModule {}
