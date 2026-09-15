# health-check Specification

## Purpose
Expor um sinal simples e barato de que o serviço está no ar e respondendo,
para uso por monitoramento externo e pelo health check da plataforma de
deploy.

## Requirements

### Requirement: Endpoint de health-check

O sistema MUST expor `GET /health` respondendo `200` com o corpo JSON
`{ "status": "ok" }`.

O endpoint MUST NOT exigir autenticação, para que a plataforma de deploy
consiga consultá-lo sem credenciais.

#### Scenario: Serviço no ar

- **WHEN** um cliente faz `GET /health`
- **THEN** a resposta é `200` com o corpo `{ "status": "ok" }`

#### Scenario: Consulta sem credenciais

- **WHEN** a plataforma de deploy faz `GET /health` sem header `Authorization`
- **THEN** a resposta é `200`, e não `401`
