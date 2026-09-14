import 'dotenv/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface Env {
  readonly nodeEnv: NodeEnv;
  readonly port: number;
  readonly corsOrigin: string;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  return value === 'test' || value === 'production' ? value : 'development';
}

function parsePort(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? 3000 : parsed;
}

export const env: Env = {
  nodeEnv: parseNodeEnv(process.env['NODE_ENV']),
  port: parsePort(process.env['PORT']),
  corsOrigin: process.env['CORS_ORIGIN'] ?? '*',
};

export default env;
