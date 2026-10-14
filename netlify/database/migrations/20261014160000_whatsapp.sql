-- Histórico de conversas do agente de WhatsApp (por telefone do cliente).

CREATE TABLE whatsapp_messages (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  external_id TEXT, -- id da mensagem na Evolution API, usado pra evitar reprocessar retry de webhook
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_whatsapp_messages_external_id ON whatsapp_messages (external_id) WHERE external_id IS NOT NULL;

CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages (phone, created_at);
