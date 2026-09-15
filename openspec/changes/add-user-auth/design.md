## Context

A API tinha apenas o health-check e nenhuma persistência. Esta mudança
introduz simultaneamente o banco de dados e a autenticação, porque um não
serve sem o outro: guardar usuários sem autenticá-los não protege nada, e
autenticar sem guardar não sobrevive a um reinício.

Ver `proposal.md` — Why para a motivação.

## Goals / Non-Goals

**Goals:**

- Identidade verificável, para vincular dados a pessoas
- Sessão renovável sem pedir a senha a cada expiração
- Conter o estrago quando um token vazar
- Um esquema de dados que comporte as listas de palavras sem redesenho

**Non-Goals:**

- Papéis, permissões ou administração de contas de terceiros
- Recuperação de senha por e-mail, confirmação de cadastro, OAuth
- As listas de palavras em si

## Decisions

### PostgreSQL gerenciado externamente, e não o banco gratuito da plataforma

O plano gratuito de banco da plataforma de deploy expira e a instância é
removida com os dados. Optou-se por um PostgreSQL gerenciado externo cujo
plano gratuito não tem prazo. Como o acesso é por string de conexão padrão,
trocar de provedor depois é mudança de variável de ambiente.

Relacional, e não documentos: o vínculo usuário ↔ listas de palavras é
naturalmente relacional, e a integridade referencial resolve no banco o que
de outro modo viraria código de limpeza.

### Dois tokens, com papéis distintos

Um único token obrigaria a escolher entre expirar rápido (e pedir a senha o
tempo todo) ou durar muito (e um vazamento valer semanas de acesso).

- **Acesso**: JWT curto, verificado só pela assinatura — sem consulta ao
  banco a cada requisição.
- **Renovação**: vida longa, persistido e portanto revogável.

O token de renovação NÃO é um JWT: como precisa ser consultado e revogado no
banco, claims assinadas não agregam. Um valor aleatório opaco não carrega
informação alguma se interceptado.

### Hash do token de renovação: SHA-256, não bcrypt

Ao contrário de senhas, o token já é aleatório com entropia alta — não há
espaço de busca a proteger contra força bruta. E o hash precisa ser
determinístico para permitir busca por índice, o que o bcrypt (com salt por
registro) impede.

Senhas continuam com bcrypt, onde o custo deliberado é a defesa.

### Rotação com detecção de reuso

Um token de renovação de uso único, trocado a cada uso, transforma o roubo em
evento detectável: se um token já consumido reaparece, ou o legítimo ou o
atacante está usando uma cópia. Não há como distinguir quem é quem, então a
resposta segura é derrubar todas as sessões do usuário.

O registro revogado é mantido no banco justamente para viabilizar essa
detecção — apagá-lo tornaria o reuso indistinguível de um token inválido
qualquer.

### Autorização separada da autenticação

O token diz quem é o usuário, não o que ele pode. Sem uma verificação
explícita de posse, qualquer usuário autenticado alcançaria a conta de outro
trocando o identificador na URL. As rotas sobre a própria conta passam por uma
checagem dedicada.

### Resposta uniforme no login

Diferenciar "e-mail não cadastrado" de "senha incorreta" entrega ao atacante
uma forma barata de descobrir quais endereços têm conta. Mesma mensagem, mesmo
status — e custo de tempo equivalente nos dois caminhos, senão a diferença de
latência vaza a mesma informação.

### Validação e normalização na borda

A validação acontece antes dos controllers e substitui os dados pelos valores
já normalizados, de modo que as camadas seguintes recebam entrada confiável e
não repitam checagens.

### Falha na inicialização por configuração ausente

Segredos de assinatura e string de conexão são obrigatórios e verificados no
boot. Subir sem eles produziria falhas espalhadas em runtime, muito mais caras
de diagnosticar do que uma recusa imediata com o nome da variável faltante.

## Risks / Trade-offs

- **Revogação em massa por detecção de reuso**: um falso positivo — por
  exemplo, um cliente que reenvia a requisição de renovação após um timeout de
  rede — desloga o usuário de todos os dispositivos. Preferiu-se o falso
  positivo incômodo ao falso negativo perigoso.
- **Access token não revogável**: até expirar, ele vale mesmo após o logout.
  É a contrapartida de não consultar o banco a cada requisição; mitigado pela
  vida curta.
- **Custo do bcrypt no login**: cada tentativa consome CPU de propósito. Em
  plano gratuito isso limita o throughput de autenticação — aceitável nesta
  fase, mas é o primeiro ponto a observar sob carga.
- **Sem limite de tentativas de login**: a mensagem uniforme não impede força
  bruta contra uma senha específica. Rate limiting fica como mudança
  subsequente.
