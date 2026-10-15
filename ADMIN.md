# Agendamento online — guia rápido

## Configuração única (fazer antes de usar o /admin.html)
Preciso que você cadastre a senha de acesso do admin manualmente no painel do Netlify — eu tentei fazer
isso pelo conector automático, mas a variável não ficou salva de verdade (provavelmente por limitação do
plano gratuito da equipe) e não quis insistir às cegas. É rápido:

1. Acesse https://app.netlify.com/projects/glaycom-marlons-barbearia/configuration/env
2. Clique em **Add a variable** → **Add a single variable**
3. Key: `ADMIN_TOKEN`
4. Value: o token que foi enviado separadamente no chat (não está neste arquivo de propósito — veja
   abaixo)
5. Salve, depois publique de novo (`netlify deploy --prod`, ou peça pra eu publicar) para a variável
   valer.

**Sobre o token:** não fica neste arquivo porque este repositório pode ir para o GitHub, e qualquer um
com acesso a ele poderia ver nome e telefone dos seus clientes. Guarde o token que foi enviado
separadamente como uma senha. Se perder ou achar que vazou, me avise que eu gero um novo.

## Ver os agendamentos
Acesse `/admin.html` no site publicado (ex.: `https://glaycom-marlons-barbearia.netlify.app/admin.html`)
e cole o token de acesso quando pedir.

## Atualizar os preços dos serviços
Os preços ainda estão como "a combinar" (`NULL` no banco) porque não tínhamos os valores reais. Pra
atualizar, rode (com a Netlify CLI instalada e logada, `netlify login`):

```bash
netlify database connect --query "UPDATE services SET price_cents = 3500 WHERE name = 'Corte Social';"
```

`price_cents` é o preço em centavos (3500 = R$ 35,00). Repita pra cada serviço — os nomes exatos estão
na migração `netlify/database/migrations/20261014120000_init.sql`.

## Ajustar o horário de funcionamento
O horário de disponibilidade pro agendamento online está fixo no arquivo
`netlify/functions/availability.mjs`, na constante `BUSINESS_HOURS` — é só editar os horários de abertura/
fechamento de cada dia (ou marcar `null` pra fechado) e publicar de novo.

## Como funciona
- O cliente escolhe serviço, data e horário disponível direto no site (seção "Agendar online").
- O site consulta o banco de dados (Postgres gerenciado pelo Netlify) pra saber quais horários já estão
  ocupados, e grava o agendamento só quando confirma — dois clientes não conseguem roubar o mesmo horário
  um do outro.
- Não existe cancelamento pelo site ainda; pra cancelar um agendamento, veja a seção abaixo.

## Cancelar um agendamento
Tem um botão "Cancelar" ao lado de cada agendamento em `/admin.html`. Alternativa manual via SQL:
```bash
netlify database connect --query "UPDATE appointments SET status = 'cancelled' WHERE id = 42;"
```
(troque `42` pelo ID do agendamento)

## Agente de IA no WhatsApp

### Atendimento humano assume a conversa
Se você (ou alguém da equipe) responder manualmente pelo WhatsApp numa conversa que o bot está tocando,
ele detecta e **para de responder automaticamente** naquela conversa — pra não haver bot e humano
respondendo ao mesmo tempo e se atropelando.

- Volta a responder sozinho depois de **2 horas sem nenhuma mensagem sua** naquela conversa.
- Pra devolver pro bot na hora, digite `/bot` na conversa (sem precisar esperar as 2 horas).
- Isso é por conversa (por telefone do cliente) — pausar numa conversa não afeta as outras.

### Trava de número de teste
Enquanto a instância do WhatsApp estiver ligada ao seu número pessoal (não um número dedicado só pra
barbearia), o bot só responde a números na lista `WHATSAPP_TEST_ALLOWLIST` (variável de ambiente no
Netlify) — qualquer outro contato seu é ignorado silenciosamente, pra não confundir gente que não tem
nada a ver com a barbearia. Quando migrar pra um número dedicado, remova essa variável (ou deixe vazia)
pra responder todo mundo.
