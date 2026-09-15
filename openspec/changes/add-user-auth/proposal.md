## Why

A aplicação precisa saber de quem é cada lista de palavras. Sem contas de
usuário e sem persistência não há a quem vincular os dados, e a API só
consegue responder o health-check.

Documentado retroativamente: descreve a implementação entregue no PR #2.

## What Changes

- Persistência em PostgreSQL via Prisma, substituindo a ausência de banco
- Cadastro, login, renovação de sessão e logout
- Consulta, edição e exclusão da própria conta, protegidas por token
- Autorização por dono do recurso: um usuário autenticado não alcança a conta
  de outro
- Erros passam a carregar um campo `code` estável, além da mensagem

## Capabilities

### New Capabilities

- `user-auth`: identidade do usuário — cadastro, autenticação por credenciais
  e ciclo de vida da sessão
- `user-management`: operações do usuário sobre a própria conta
- `data-persistence`: requisitos de armazenamento e integridade referencial

### Modified Capabilities

- `http-api-foundation`: as respostas de erro passam a incluir um código
  estável, e a API ganha um esquema de autenticação por token

## Impact

- Código: `src/services/`, `src/controllers/{auth,user}.controller.ts`,
  `src/routes/{auth,user}.routes.ts`, `src/middlewares/{authenticate,validate}.ts`,
  `src/schemas/`, `src/errors/`, `src/lib/{prisma,jwt,password}.ts`
- Dados: tabelas `users` e `refresh_tokens`; migration inicial versionada
- Dependências: `@prisma/client`, `@prisma/adapter-pg`, `jsonwebtoken`,
  `bcryptjs`, `zod`; `prisma` em dev
- Configuração: `DATABASE_URL`, `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET`
  passam a ser obrigatórias — a aplicação não sobe sem elas
- Build: `prisma generate` passa a rodar antes do `tsc`; o deploy aplica as
  migrations pendentes
