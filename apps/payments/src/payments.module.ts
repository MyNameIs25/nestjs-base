import { Module } from '@nestjs/common';
import { AppConfigModule, AppLoggerModule } from '@app/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AppConfigModule.forRoot(), AppLoggerModule.forRoot()],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
