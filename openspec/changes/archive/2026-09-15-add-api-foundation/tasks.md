## 1. Base do serviço HTTP

- [x] 1.1 Inicializar o projeto Node.js com Express e as dependências de runtime
- [x] 1.2 Criar `src/app.ts` (instância do Express) e `src/server.ts` (bootstrap HTTP)
- [x] 1.3 Ler `PORT`, `NODE_ENV` e `CORS_ORIGIN` em `src/config/env.ts`

## 2. Health-check

- [x] 2.1 Implementar o controller e a rota de `GET /health`
- [x] 2.2 Verificar que responde `200` com `{ "status": "ok" }` sem autenticação

## 3. CORS

- [x] 3.1 Montar as opções de CORS a partir de `CORS_ORIGIN` em `src/config/cors.ts`
- [x] 3.2 Verificar liberação geral, lista restrita e preflight

## 4. Tratamento de erros

- [x] 4.1 Implementar os handlers de `404` e de erro centralizado
- [x] 4.2 Garantir que erros inesperados não vazem detalhes internos

## 5. TypeScript

- [x] 5.1 Configurar `tsconfig.json` com `strict` e as checagens adicionais
- [x] 5.2 Converter os arquivos de `.js` para `.ts` com tipagem explícita
- [x] 5.3 Ajustar os scripts: `build`, `start`, `dev`, `typecheck`

## 6. Deploy

- [x] 6.1 Criar `render.yaml` com build, start, health check e variáveis
- [x] 6.2 Usar `npm ci --include=dev` para que o compilador exista no build
- [x] 6.3 Escutar em `0.0.0.0` e tratar `SIGTERM`
- [x] 6.4 Fixar a versão do Node em `.node-version`

## 7. Verificação

- [x] 7.1 Rodar `npm run build` e `npm run typecheck` sem erros
- [x] 7.2 Exercitar `/health`, preflight, origem não permitida e rota inexistente
- [x] 7.3 Simular o deploy a partir de uma cópia limpa do repositório
