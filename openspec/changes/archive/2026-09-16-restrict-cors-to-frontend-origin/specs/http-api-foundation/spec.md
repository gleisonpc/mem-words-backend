## MODIFIED Requirements

### Requirement: Política de CORS configurável

O sistema MUST aceitar requisições de qualquer origem enquanto a URL do
frontend não estiver definida.

A lista de origens permitidas MUST ser configurável por variável de ambiente,
de modo que restringir o acesso não exija alteração de código.

Uma entrada da lista MUST poder ser um padrão com `*` representando qualquer
sequência de caracteres, para cobrir famílias de origens que mudam a cada
deploy — como as URLs de revisão que uma plataforma de hospedagem gera por
branch ou por build — sem exigir atualizar a lista a cada nova URL.

#### Scenario: Qualquer origem liberada

- **WHEN** `CORS_ORIGIN` está vazio ou é `*` e chega uma requisição de uma
  origem qualquer
- **THEN** a resposta inclui `Access-Control-Allow-Origin: *`

#### Scenario: Origem permitida com a lista preenchida

- **WHEN** `CORS_ORIGIN` lista origens específicas e a requisição vem de uma
  delas
- **THEN** a resposta inclui `Access-Control-Allow-Origin` com aquela origem

#### Scenario: Origem permitida por padrão com curinga

- **WHEN** `CORS_ORIGIN` inclui uma entrada com `*` e a origem da requisição
  corresponde ao padrão
- **THEN** a resposta inclui `Access-Control-Allow-Origin` com a origem da
  requisição

#### Scenario: Origem não corresponde ao padrão

- **WHEN** `CORS_ORIGIN` inclui uma entrada com `*` e a origem da requisição
  não corresponde ao padrão
- **THEN** a resposta não inclui `Access-Control-Allow-Origin`, e o navegador
  bloqueia a leitura do corpo

#### Scenario: Origem não permitida

- **WHEN** `CORS_ORIGIN` lista origens específicas e a requisição vem de uma
  origem fora da lista
- **THEN** a resposta não inclui `Access-Control-Allow-Origin`, e o navegador
  bloqueia a leitura do corpo

#### Scenario: Preflight

- **WHEN** o navegador envia `OPTIONS` antes de uma requisição
- **THEN** a resposta é `204` com os headers de métodos e cabeçalhos
  permitidos
