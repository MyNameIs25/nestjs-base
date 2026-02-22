import { Inject } from '@nestjs/common';
import { DRIZZLE } from './database.constants';

export const InjectDrizzle = (): ParameterDecorator => Inject(DRIZZLE);
