## Why

O projeto precisava de uma base de API executável e publicável antes de
qualquer regra de negócio: um serviço HTTP que o frontend consiga chamar, que
a plataforma de deploy consiga monitorar e que aceite requisições vindas do
navegador. Sem isso não há onde apoiar as funcionalidades seguintes.

Documentado retroativamente: esta mudança descreve o que já foi implementado
e está na branch `main`, para que as próximas mudanças partam de um estado
descrito em specs.

## What Changes

- Serviço HTTP em Node.js com Express, escrito em TypeScript com `strict`
- Endpoint `GET /health` devolvendo `{ "status": "ok" }`
- CORS liberado para qualquer origem, parametrizado por `CORS_ORIGIN` para
  ser restringido quando a URL do frontend existir, sem alteração de código
- Respostas de erro em JSON: `404` para rota desconhecida e tratamento
  centralizado para erros inesperados
- Configuração de deploy versionada (`render.yaml`), com o build compilando o
  TypeScript, health check apontando para `/health`, bind em `0.0.0.0` e
  encerramento gracioso em `SIGTERM`

## Capabilities

### New Capabilities

- `health-check`: sinal de disponibilidade do serviço, consumido por
  monitoramento e pela plataforma de deploy
- `http-api-foundation`: comportamento transversal da API — política de CORS,
  formato das respostas de erro e requisitos de execução em produção

### Modified Capabilities

<!-- Nenhuma: é a primeira mudança do projeto. -->

## Impact

- Código: `src/app.ts`, `src/server.ts`, `src/config/`, `src/routes/`,
  `src/controllers/`, `src/middlewares/errorHandler.ts`
- Dependências: `express`, `cors`, `dotenv`; `typescript` e `tsx` em dev
- Infra: `render.yaml`, `.node-version`, variáveis `PORT`, `NODE_ENV` e
  `CORS_ORIGIN`
- Sem impacto sobre dados — a aplicação ainda não tem persistência
