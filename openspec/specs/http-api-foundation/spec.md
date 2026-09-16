# http-api-foundation Specification

## Purpose
Definir o comportamento transversal da API HTTP — de onde ela aceita
requisições, como comunica erros e o que precisa garantir para rodar em
produção — para que cada funcionalidade nova não redecida essas questões.

## Requirements

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

### Requirement: Respostas de erro em JSON

O sistema MUST responder erros em JSON, nunca em HTML, para que o cliente
consiga tratá-los de forma uniforme.

Cada resposta de erro MUST incluir um código estável, legível por máquina e
independente da mensagem, para que o cliente possa reagir ao tipo do erro sem
depender do texto.

Erros de validação MUST detalhar quais campos falharam e por quê.

Erros inesperados MUST NOT expor detalhes internos — mensagem original,
consulta ao banco, caminho de arquivo ou stack trace.

#### Scenario: Rota inexistente

- **WHEN** um cliente chama uma rota que não existe
- **THEN** a resposta é `404` com um corpo JSON de erro contendo um código

#### Scenario: Corpo JSON malformado

- **WHEN** o cliente envia um corpo que não é JSON válido
- **THEN** a resposta é `400` com um corpo JSON de erro contendo um código

#### Scenario: Falha de validação

- **WHEN** os dados enviados não atendem às regras de formato
- **THEN** a resposta é `400`, com o código de validação e a lista de campos
  que falharam

#### Scenario: Falha inesperada

- **WHEN** ocorre um erro não previsto durante o processamento
- **THEN** a resposta é `500` com uma mensagem genérica, sem detalhes internos

### Requirement: Execução em produção

O serviço MUST escutar na porta indicada pela plataforma e em todas as
interfaces de rede, para que o health check externo o alcance.

O serviço MUST encerrar de forma graciosa ao receber `SIGTERM`, concluindo as
requisições em andamento antes de sair.

A publicação MUST compilar o TypeScript antes de iniciar o processo.

#### Scenario: Porta definida pela plataforma

- **WHEN** a plataforma injeta a porta por variável de ambiente
- **THEN** o serviço escuta nessa porta

#### Scenario: Alcançável de fora do container

- **WHEN** o health check externo consulta o serviço por um endereço que não
  é `localhost`
- **THEN** a requisição é atendida

#### Scenario: Encerramento em deploy

- **WHEN** o processo recebe `SIGTERM`
- **THEN** ele para de aceitar conexões, conclui as requisições em andamento
  e encerra com código de saída `0`
