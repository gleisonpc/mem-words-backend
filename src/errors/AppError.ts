/** Erro de aplicação com status HTTP e código estável para o cliente. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;

    if (details !== undefined) {
      this.details = details;
    }

    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Credenciais inválidas.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}
