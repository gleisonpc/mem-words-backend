## 1. Suporte a padrão com curinga

- [x] 1.1 Em `src/config/cors.ts`, converter cada entrada de `CORS_ORIGIN` que
      contenha `*` em uma `RegExp` ancorada (escapando os demais caracteres
      especiais de regex, incluindo `.`), mantendo as entradas sem `*` como
      string exata; verificar por leitura que uma entrada sem `*` continua
      virando string, não `RegExp`.
- [x] 1.2 Rodar `npm run typecheck` e verificar que passa sem erro — o tipo
      `StaticOrigin` do pacote `cors` aceita o array misto de `string` e
      `RegExp` sem `as any`.

## 2. Verificação manual dos casos da spec

- [x] 2.1 Subir o servidor local com `CORS_ORIGIN=https://mem-words-frontend.vercel.app,https://mem-words-frontend-*-memo-65b2.vercel.app`
      e, com `curl -H "Origin: <origem>" -i`, confirmar `Access-Control-Allow-Origin`
      presente para a origem de produção exata.
- [x] 2.2 Com o mesmo servidor, confirmar `Access-Control-Allow-Origin`
      presente para uma origem de prévia simulada
      (`https://mem-words-frontend-git-teste-memo-65b2.vercel.app`) e para
      outra (`https://mem-words-frontend-abc123-memo-65b2.vercel.app`).
- [x] 2.3 Confirmar `Access-Control-Allow-Origin` **ausente** para uma origem
      fora da lista e fora do padrão (ex.: `https://outro-site.com`).
- [x] 2.4 Confirmar que uma origem parecida mas fora do padrão não passa —
      por exemplo `https://mem-words-frontend-memo-65b2.vercel.app.evil.com`
      — provando que a ancoragem (`^...$`) e o escape do `.` funcionam.
- [x] 2.5 Com `CORS_ORIGIN` vazio e com `CORS_ORIGIN=*`, confirmar que o
      comportamento de liberar qualquer origem continua idêntico ao anterior
      (regressão do requisito já existente).
- [x] 2.6 Confirmar que um preflight (`curl -X OPTIONS -H "Origin: ..." -H
      "Access-Control-Request-Method: POST" -i`) para uma origem permitida
      responde `204` com os headers de método e cabeçalho.

## 3. Configuração de produção

- [x] 3.1 Atualizar `CORS_ORIGIN` em `render.yaml` para a origem de produção
      do frontend mais o padrão de prévias, com o comentário explicando que o
      domínio de produção é uma suposição a confirmar.
- [x] 3.2 Atualizar o exemplo e o comentário de `CORS_ORIGIN` em
      `.env.example` para mostrar a sintaxe de padrão com `*`.

## 4. Verificação final

- [x] 4.1 Rodar `npm run build` e verificar que compila sem erro.
- [x] 4.2 Confirmar que `package.json` não ganhou dependência nova.
