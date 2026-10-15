-- Controla quando o atendimento humano assumiu uma conversa, pra pausar o bot.

CREATE TABLE whatsapp_conversation_state (
  phone TEXT PRIMARY KEY,
  paused BOOLEAN NOT NULL DEFAULT false,
  paused_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
