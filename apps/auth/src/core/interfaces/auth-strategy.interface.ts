export const AUTH_STRATEGY = Symbol('AUTH_STRATEGY');

export interface AuthResult {
  user: { id: string; email: string };
  isNewUser: boolean;
}

export interface IAuthStrategy {
  readonly provider: string;
  authenticate(credentials: unknown): Promise<AuthResult>;
}
