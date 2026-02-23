export interface GrpcCallContext {
  metadata?: {
    get(key: string): (string | Buffer)[];
    set(key: string, value: string): void;
  };
}
