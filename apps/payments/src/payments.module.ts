import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AppConfigModule.forRoot()],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
