# Agendamento online — guia rápido

## Ver os agendamentos
Acesse `/admin.html` no site publicado (ex.: `https://glaycom-marlons-barbearia.netlify.app/admin.html`)
e cole o token de acesso quando pedir.

**O token não fica neste arquivo de propósito** (este repositório pode ir para o GitHub, e qualquer um
com acesso a ele poderia ver nome e telefone dos seus clientes). Guarde o token que foi enviado
separadamente como uma senha. Se perder ou achar que vazou, me avise que eu gero um novo e atualizo a
variável de ambiente no Netlify (`ADMIN_TOKEN`) — o antigo para de funcionar na hora.

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

## Cancelar um agendamento manualmente
```bash
netlify database connect --query "UPDATE appointments SET status = 'cancelled' WHERE id = 42;"
```
(troque `42` pelo ID do agendamento, visível em `/admin.html`)
