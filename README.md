# Site — Glaycom Marlons Barbearia

Site institucional de uma página, pronto pra publicar. Não precisa instalar nada nem rodar build —
é só HTML, CSS e JS puro. Para ver localmente, dê duplo clique em `index.html`.

## Como publicar (escolha uma opção)

### Opção 1 — GitHub Pages (grátis, com domínio `.github.io`)
1. Crie um repositório no GitHub e suba esta pasta inteira (o `index.html` precisa ficar na raiz do repositório).
2. No repositório: **Settings → Pages → Branch**: selecione `main` e a pasta `/root`, salve.
3. Em alguns minutos o site estará no ar em `https://seu-usuario.github.io/nome-do-repositorio/`.

### Opção 2 — Netlify Drop (mais rápido, sem precisar de conta)
1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arraste a pasta `glaycom-marlons-barbearia` inteira para a área indicada.
3. Pronto — você recebe um link público na hora. Dá pra criar conta depois para trocar o domínio.

### Opção 3 — Vercel
Drag-and-drop também funciona, mas o fluxo recomendado da Vercel é via Git/CLI — para algo simples,
a Opção 2 (Netlify Drop) costuma ser mais direta.

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
  index.html                     # página principal
  404.html
  politica-de-privacidade.html
  assets/css/styles.css
  assets/js/main.js
  img/                           # fotos (placeholders do Pexels)
  site.webmanifest
  robots.txt
  sitemap.xml
```

## Quer mudar algo depois?

Se você tem o Claude Code, é só rodar `/site-institucional` de novo e pedir o que quer ajustar: trocar
cor, adicionar uma página, atualizar quando o negócio mudar, ou refazer para outro cliente.
