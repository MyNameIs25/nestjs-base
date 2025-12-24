import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from './common/config/config.module';
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './common/cache/cache.module';
import { MailModule } from './common/mail/mail.module';

@Module({
  imports: [ConfigModule, LoggerModule, CacheModule, MailModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
