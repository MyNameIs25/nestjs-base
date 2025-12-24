import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          stores: createKeyv(configService.get<string>('REDIS_URL')),
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
