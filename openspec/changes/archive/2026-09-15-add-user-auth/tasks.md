## 1. Persistência

- [x] 1.1 Adicionar o ORM e o driver adapter de PostgreSQL
- [x] 1.2 Modelar `User` e `RefreshToken`, com `ON DELETE CASCADE` no vínculo
- [x] 1.3 Gerar a migration inicial e versioná-la no repositório
- [x] 1.4 Criar o cliente de banco em `src/lib/prisma.ts`
- [x] 1.5 Incluir a geração do cliente no build e a aplicação de migrations no deploy

## 2. Configuração

- [x] 2.1 Exigir `DATABASE_URL`, `JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` no boot
- [x] 2.2 Recusar segredos iguais entre si e, em produção, curtos demais
- [x] 2.3 Documentar as variáveis em `.env.example` e declará-las no `render.yaml`

## 3. Primitivas de segurança

- [x] 3.1 Hash e verificação de senha com bcrypt
- [x] 3.2 Emissão e verificação do token de acesso
- [x] 3.3 Geração do token de renovação como valor aleatório opaco
- [x] 3.4 Hash SHA-256 do token de renovação para persistência

## 4. Validação e erros

- [x] 4.1 Schemas de validação com normalização de e-mail antes da checagem
- [x] 4.2 Middleware que valida e substitui os dados pelos valores normalizados
- [x] 4.3 Hierarquia de erros com status e código estáveis
- [x] 4.4 Handler central convertendo os erros em resposta JSON

## 5. Autenticação

- [x] 5.1 Cadastro, recusando e-mail duplicado
- [x] 5.2 Login com resposta e tempo uniformes para credenciais inválidas
- [x] 5.3 Renovação com rotação do token
- [x] 5.4 Detecção de reuso revogando todas as sessões do usuário
- [x] 5.5 Logout idempotente

## 6. Conta do usuário

- [x] 6.1 Middleware de autenticação por `Authorization: Bearer`
- [x] 6.2 Middleware de posse do recurso, recusando conta alheia
- [x] 6.3 Consulta da própria conta
- [x] 6.4 Edição, exigindo a senha atual para troca de senha
- [x] 6.5 Revogar as sessões ativas após troca de senha
- [x] 6.6 Exclusão da própria conta

## 7. Verificação

- [x] 7.1 Exercitar a API contra um PostgreSQL real, com a aplicação compilada
- [x] 7.2 Cobrir os fluxos felizes de cada rota
- [x] 7.3 Cobrir validação, e-mail duplicado e JSON malformado
- [x] 7.4 Cobrir acesso entre usuários distintos (edição e exclusão alheias)
- [x] 7.5 Cobrir rotação, reuso de token, troca de senha, logout e token forjado
- [x] 7.6 Confirmar a remoção em cascata ao excluir a conta
- [x] 7.7 Confirmar que o hash da senha não aparece em nenhuma resposta

## 8. Prontidão do deploy

- [x] 8.1 Expor `GET /health/ready` verificando a conexão com o banco
- [x] 8.2 Responder `503` sem vazar host, credencial ou mensagem do driver
- [x] 8.3 Apontar o health check da plataforma para a prontidão
- [x] 8.4 Permitir uma connection string dedicada às migrations
- [x] 8.5 Verificar que um banco inacessível derruba a prontidão e não o `/health`

## 9. Documentação

- [x] 9.1 Atualizar o README com rotas, variáveis e decisões de segurança
- [x] 9.2 Atualizar o contexto do projeto no OpenSpec
