export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'EmailSendError';
  }
}

export class EmailRateLimitError extends EmailSendError {
  constructor(provider: string, cause?: Error) {
    super('Email rate limit exceeded', provider, cause);
    this.name = 'EmailRateLimitError';
  }
}

export class EmailConfigError extends EmailSendError {
  constructor(provider: string, cause?: Error) {
    super('Email provider configuration error', provider, cause);
    this.name = 'EmailConfigError';
  }
}

export class EmailValidationError extends EmailSendError {
  constructor(message: string, provider: string, cause?: Error) {
    super(message, provider, cause);
    this.name = 'EmailValidationError';
  }
}
