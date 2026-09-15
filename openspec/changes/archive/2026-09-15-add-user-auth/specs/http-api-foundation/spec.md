## MODIFIED Requirements

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
