// Configuração do Prisma CLI (migrations, generate, studio).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * URL usada pelas migrations.
 *
 * Provedores com pool de conexões (Neon, por exemplo) expõem um endpoint
 * agrupado, ótimo para a aplicação e inadequado para migrations — que
 * precisam de conexão direta. Quando DIRECT_DATABASE_URL existe, as
 * migrations usam ela; a aplicação continua usando DATABASE_URL.
 */
const migrationUrl = process.env['DIRECT_DATABASE_URL'] ?? process.env['DATABASE_URL'];

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
});
