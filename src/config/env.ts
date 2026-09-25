import 'dotenv/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface Env {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly corsOrigin: string;
  readonly databaseUrl: string;
  readonly jwtAccessSecret: string;
  readonly jwtRefreshSecret: string;
  readonly jwtAccessExpiresIn: string;
  readonly jwtRefreshExpiresIn: string;
  readonly googleClientId: string;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  return value === 'test' || value === 'production' ? value : 'development';
}

function parsePort(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? 3000 : parsed;
}

const nodeEnv = parseNodeEnv(process.env['NODE_ENV']);

/**
 * Lê uma variável obrigatória.
 *
 * Falha no boot em vez de deixar a aplicação subir sem segredo de JWT ou
 * sem banco — um erro na inicialização é muito mais fácil de diagnosticar
 * do que requisições falhando em produção.
 */
function required(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. ` +
        'Consulte o .env.example para a lista completa.',
    );
  }

  return value;
}

const jwtAccessSecret = required('JWT_ACCESS_SECRET');
const jwtRefreshSecret = required('JWT_REFRESH_SECRET');
const googleClientId = required('GOOGLE_CLIENT_ID');

if (jwtAccessSecret === jwtRefreshSecret) {
  throw new Error('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET devem ser diferentes.');
}

if (nodeEnv === 'production') {
  for (const [name, value] of [
    ['JWT_ACCESS_SECRET', jwtAccessSecret],
    ['JWT_REFRESH_SECRET', jwtRefreshSecret],
  ] as const) {
    if (value.length < 32) {
      throw new Error(`${name} deve ter ao menos 32 caracteres em produção.`);
    }
  }
}

export const env: Env = {
  nodeEnv,
  port: parsePort(process.env['PORT']),
  corsOrigin: process.env['CORS_ORIGIN'] ?? '*',
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
  jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  googleClientId,
};

export default env;
