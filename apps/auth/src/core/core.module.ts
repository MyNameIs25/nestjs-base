import { DynamicModule, Module, Type } from '@nestjs/common';
import { TokensModule } from '@auth/tokens';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthModule } from './strategies/local/local-auth.module';

export interface AuthModuleOptions {
  localEnabled?: boolean;
}

const strategyMap: Record<keyof AuthModuleOptions, Type> = {
  localEnabled: LocalAuthModule,
};

@Module({})
export class CoreModule {
  static register(options: AuthModuleOptions): DynamicModule {
    const strategyImports = Object.entries(strategyMap)
      .filter(([key]) => options[key as keyof AuthModuleOptions])
      .map(([, module]) => module);

    const imports: NonNullable<DynamicModule['imports']> = [
      TokensModule,
      ...strategyImports,
    ];

    return {
      module: CoreModule,
      imports,
      providers: [JwtAuthGuard],
      exports: [TokensModule, JwtAuthGuard],
    };
  }
}
