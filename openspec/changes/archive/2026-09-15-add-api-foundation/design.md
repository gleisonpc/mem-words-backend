## Context

Projeto novo, sem código anterior. A escolha da stack condiciona tudo o que
vem depois, e o destino de publicação (Render, plano gratuito) impõe
restrições concretas: o processo precisa ser alcançável de fora do container,
responder a um health check e sobreviver aos ciclos de deploy.

Ver `proposal.md` — Why para a motivação.

## Goals / Non-Goals

**Goals:**

- Uma base executável em produção, não apenas localmente
- Estrutura em camadas que comporte rotas e regras de negócio sem
  reorganização posterior
- Configuração por variáveis de ambiente, de modo que mudar de ambiente não
  exija alteração de código

**Non-Goals:**

- Qualquer rota de negócio além do health-check
- Persistência de dados
- Autenticação

## Decisions

### TypeScript com `strict`, em vez de JavaScript

O código nasceu em JavaScript e foi migrado para TypeScript ainda nesta fase.
Migrar cedo custa pouco; migrar depois de existirem regras de negócio custa
caro. Além do `strict`, foram ativadas `noUncheckedIndexedAccess` e
`exactOptionalPropertyTypes` — ambas pegam classes de erro que o `strict`
sozinho deixa passar.

Consequência: `module`/`moduleResolution` em `nodenext` obriga imports
relativos a usar a extensão `.js`, mesmo apontando para arquivos `.ts`.

### Camadas: routes → controllers → (services)

Rotas registram caminhos, controllers lidam com HTTP. A camada de services
ainda não existe porque não há regra de negócio, mas o desenho já a prevê,
para que a primeira funcionalidade não force um rearranjo.

### CORS parametrizado desde o início

A alternativa seria fixar `*` no código e alterá-lo quando o frontend
existisse. Ler de `CORS_ORIGIN` custa o mesmo agora e evita um deploy de
código só para restringir origem — a restrição vira mudança de configuração.

### Configuração de deploy versionada (`render.yaml`)

O build command padrão da plataforma é `npm install`, que não compila o
TypeScript. Deixar isso implícito no painel é frágil: quebrou uma vez
exatamente assim (`Cannot find module dist/server.js`). Versionar o blueprint
mantém build, health check e variáveis junto do código que eles publicam.

Detalhe não óbvio: a plataforma define `NODE_ENV=production`, e nesse modo o
npm pula as `devDependencies` — onde está o compilador. Por isso o build usa
`npm ci --include=dev`.

### Bind em `0.0.0.0` e `SIGTERM` tratado

O padrão do Node serviria, mas o bind explícito documenta a exigência da
plataforma. O `SIGTERM` é enviado a cada deploy: sem tratá-lo, o processo é
morto à força e derruba requisições em andamento.

## Risks / Trade-offs

- **Erros de tipo do `nodenext`**: a extensão `.js` em imports de arquivos
  `.ts` confunde quem não conhece a convenção. Mitigado documentando no README.
- **Plano gratuito da plataforma**: o serviço hiberna após inatividade, e a
  primeira requisição depois disso é lenta. Aceitável nesta fase.
- **CORS aberto**: liberar qualquer origem é uma exposição consciente e
  temporária, com o mecanismo de restrição já pronto para ser acionado.
