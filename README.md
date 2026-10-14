# Site — Glaycom Marlons Barbearia

Site institucional **com agendamento online real**: Postgres gerenciado pelo Netlify guarda serviços e
agendamentos, três Netlify Functions servem a API (`/api/services`, `/api/availability`,
`/api/appointments`), e `/admin.html` mostra a agenda pra barbearia. Não é mais 100% zero-config — precisa
do Netlify pra rodar (o banco e as funções não funcionam em GitHub Pages/Netlify Drop simples).

**No ar em:** https://glaycom-marlons-barbearia.netlify.app

## Publicar atualizações
O projeto já está conectado à sua conta Netlify (site `glaycom-marlons-barbearia`). Depois de editar e
commitar, publique com a Netlify CLI:
```bash
npm install -g netlify-cli
netlify login
netlify link   # na primeira vez, escolha o site glaycom-marlons-barbearia
netlify deploy --prod
```
Isso aplica migrações pendentes do banco automaticamente antes de publicar.

## Configuração pendente no painel do Netlify
A variável de ambiente `ADMIN_TOKEN` (protege o `/admin.html`) precisa ser configurada manualmente —
veja `ADMIN.md`.

## Checklist do que trocar (procure por `<!-- TROCAR -->` no código)

- [ ] **Logo**: no `index.html`, troque o bloco `<svg class="brand-mark">` (aparece no cabeçalho e no
      rodapé) por `<img src="img/logo.svg" alt="Glaycom Marlons Barbearia" class="brand-mark">` quando
      tiver a arte final. Hoje é um emblema "GM" provisório.
- [ ] **Preços dos serviços**: todos aparecem como `R$ --` na seção "O que fazemos" — substitua pelos
      valores reais de cada corte/serviço.
- [ ] **Horário de funcionamento**: a tabela na seção Localização ainda é um exemplo (só confirmamos que
      fecha às 19h) — confirme os dias e horários completos da semana, incluindo domingo.
- [ ] **Depoimentos**: os três depoimentos são exemplos de estrutura — troque pelos depoimentos reais de
      clientes (com autorização deles para usar nome/bairro).
- [ ] **Razão social e CNPJ**: no rodapé, troque pelos dados oficiais da empresa.
- [ ] **Fotos**: todas as fotos são do banco gratuito Pexels (uso comercial liberado, sem precisar dar
      crédito) — são reais, mas temporárias. Troque pelas fotos da sua própria barbearia quando tiver:
      1. Baixe suas fotos ou tire novas fotos do ambiente/cortes.
      2. Salve na pasta `/img` com os mesmos nomes de arquivo (ex.: `hero.jpg`, `galeria-cadeira.jpg`) —
         assim você nem precisa editar o HTML, só substituir o arquivo.
      3. Cada bloco já tem o recorte certo (`aspect-ratio`), então a foto nova encaixa sem quebrar o layout.
      Licença Pexels: não revenda a foto crua, e pessoas identificáveis não podem aparecer de forma ofensiva.
- [ ] **Domínio**: depois de escolher onde o site vai morar, atualize o `<link rel="canonical">`, as tags
      `og:url`/`og:image`, o `robots.txt` e o `sitemap.xml` com a URL definitiva.

## Estrutura de arquivos

```
glaycom-marlons-barbearia/
  index.html                     # página principal (inclui a seção "Agendar online")
  admin.html                     # painel interno — ver agendamentos (protegido por token)
  404.html
  politica-de-privacidade.html
  assets/css/styles.css
  assets/js/main.js
  assets/js/booking.js           # lógica do widget de agendamento
  img/                           # fotos (placeholders do Pexels)
  netlify/functions/             # API: services.mjs, availability.mjs, appointments.mjs
  netlify/database/migrations/   # schema do banco (serviços + agendamentos)
  netlify.toml
  package.json
  site.webmanifest
  robots.txt
  sitemap.xml
  ADMIN.md                       # como ver agendamentos, mudar preços e horários
```

## Quer mudar algo depois?

Se você tem o Claude Code, é só rodar `/site-institucional` de novo e pedir o que quer ajustar: trocar
cor, adicionar uma página, atualizar quando o negócio mudar, ou refazer para outro cliente.
