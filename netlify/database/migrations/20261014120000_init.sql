-- Schema inicial: serviços e agendamentos da Glaycom Marlons Barbearia

CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price_cents INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_starts_at ON appointments (starts_at);
CREATE INDEX idx_appointments_status ON appointments (status);

-- Serviços de exemplo (mesma estrutura já exibida no site) — preço NULL = "a combinar",
-- troque pelos valores reais via SQL (veja ADMIN.md) quando tiver os preços definitivos.
INSERT INTO services (category, name, description, duration_minutes, price_cents, sort_order) VALUES
  ('Cortes', 'Corte Social', 'Acabamento clássico na tesoura e máquina.', 30, NULL, 1),
  ('Cortes', 'Corte Degradê', 'Transição navalhada, do baixo ao alto.', 40, NULL, 2),
  ('Cortes', 'Corte Infantil', 'Para os pequenos, com paciência.', 30, NULL, 3),
  ('Barba', 'Barba Completa', 'Toalha quente, navalha e finalização.', 30, NULL, 4),
  ('Barba', 'Barboterapia', 'Hidratação e modelagem para fios mais fortes.', 40, NULL, 5),
  ('Barba', 'Sobrancelha na Navalha', 'Alinhamento rápido e preciso.', 15, NULL, 6),
  ('Combos', 'Corte + Barba', 'O pacote completo, do topo ao queixo.', 60, NULL, 7),
  ('Combos', 'Corte + Barba + Sobrancelha', 'Visual fechado pra sair pronto.', 70, NULL, 8);
