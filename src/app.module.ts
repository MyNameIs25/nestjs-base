import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from './common/config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './common/cache/cache.module';

@Module({
  imports: [ConfigModule, LoggerModule, CacheModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
