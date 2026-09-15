## Purpose

Garantir que os dados sobrevivam a reinícios e deploys, e que os vínculos
entre usuário e seus dados permaneçam íntegros — base sobre a qual as listas
de palavras serão associadas a cada pessoa.

## ADDED Requirements

### Requirement: Armazenamento durável

O sistema MUST persistir usuários e sessões em um banco de dados relacional,
de modo que os dados sobrevivam a reinícios do processo e a novos deploys.

A conexão MUST ser configurada por variável de ambiente, e a aplicação MUST
recusar iniciar sem ela.

#### Scenario: Dados sobrevivem ao reinício

- **WHEN** o processo é reiniciado
- **THEN** as contas criadas antes continuam existindo e autenticando

#### Scenario: Conexão não configurada

- **WHEN** a aplicação inicia sem a variável de conexão
- **THEN** ela falha na inicialização indicando a variável faltante

### Requirement: Evolução versionada do esquema

Alterações no esquema do banco MUST ser expressas como migrations
versionadas no repositório, e MUST ser aplicadas automaticamente no deploy.

A aplicação das migrations MUST poder usar uma connection string distinta da
usada em runtime, porque provedores com pool de conexões expõem um endpoint
agrupado inadequado para migrations, que exigem conexão direta.

Quando a connection string dedicada não for informada, o sistema MUST usar a
mesma da aplicação.

#### Scenario: Deploy com migration pendente

- **WHEN** um deploy carrega uma migration ainda não aplicada
- **THEN** ela é aplicada antes de o serviço passar a atender requisições

#### Scenario: Provedor com pool de conexões

- **WHEN** a connection string dedicada a migrations está configurada
- **THEN** as migrations usam essa conexão, e a aplicação segue usando a sua

#### Scenario: Sem connection string dedicada

- **WHEN** apenas a connection string da aplicação está configurada
- **THEN** as migrations usam essa mesma conexão

### Requirement: Integridade referencial dos dados do usuário

Os dados vinculados a um usuário MUST referenciá-lo por chave estrangeira, e
MUST ser removidos automaticamente quando a conta for excluída, sem deixar
registros órfãos.

#### Scenario: Exclusão de conta remove os dados vinculados

- **WHEN** uma conta é excluída
- **THEN** as sessões daquele usuário são removidas junto

#### Scenario: Vínculo inexistente é recusado

- **WHEN** se tenta gravar um registro apontando para um usuário que não existe
- **THEN** a gravação é recusada pelo banco
