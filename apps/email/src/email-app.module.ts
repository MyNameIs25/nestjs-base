import { Module } from '@nestjs/common';
import { AppLoggerModule } from '@app/common';
import { EmailAppConfigModule } from './config';
import { EmailModule } from './email';

@Module({
  imports: [EmailAppConfigModule, AppLoggerModule.forRoot(), EmailModule],
})
export class EmailAppModule {}
