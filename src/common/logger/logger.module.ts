import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston'
import createDailyRotateTransport, { consoleTransports } from './createRotateTransport';

@Module({
    imports: [
        WinstonModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const logOn = configService.get('LOG_ON') === 'true';
                return {
                    transports: [
                        consoleTransports,
                        ...(logOn ? [
                            createDailyRotateTransport('info', 'application'),
                            createDailyRotateTransport('warn', 'error')
                        ] : [])
                    ]
                }
            },
        })
    ]
})
export class LoggerModule {}
