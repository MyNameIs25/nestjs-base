import { Module } from '@nestjs/common';
import { EmailAppConfigModule } from '../config';
import { EmailProviderModule } from '../providers';
import { EmailService } from './email.service';
import { EmailGrpcController } from './email.grpc-controller';

@Module({
  imports: [EmailAppConfigModule, EmailProviderModule],
  controllers: [EmailGrpcController],
  providers: [EmailService],
})
export class EmailModule {}
