import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService)

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  
  const errorFilterFlag = configService.get<string>('ERROR_FILTER', 'true')
  if (errorFilterFlag) {
    const httpAdapter = app.get(HttpAdapterHost)
    app.useGlobalFilters(new AllExceptionFilter(httpAdapter))
  }

  const cors = configService.get<string>('CORS', 'true')
  if (cors === 'true') {
    app.enableCors()
  }

  const prefix = configService.get<string>('PREFIX', '/api')
  app.setGlobalPrefix(prefix)

  const versionString = configService.get<string>('VERSION', '1')
  let version: string[] = [versionString]
  if (versionString && versionString.indexOf(',')) {
    version = versionString.split(',')
  }
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: versionString ? version : VERSION_NEUTRAL,
  })
  
  const port = configService.get<number>('PORT', 3000)
  await app.listen(port);
}
bootstrap();
