-- Substitui o catálogo de exemplo pelos dados reais da barbearia (enviados pelo cliente).
-- Alguns serviços têm preço diferente quando feitos especificamente pelo Glaycon —
-- required_staff_id força esse serviço a ser sempre atribuído a esse profissional.

ALTER TABLE services ADD COLUMN required_staff_id INTEGER REFERENCES staff(id);
ALTER TABLE services ADD COLUMN price_is_from BOOLEAN NOT NULL DEFAULT false;

-- Profissionais reais (substituem os placeholders "Profissional 1/2")
UPDATE staff SET name = 'Alan', role = 'Barbeiro' WHERE id = 1;
UPDATE staff SET name = 'Glaycon', role = 'Barbeiro' WHERE id = 2;
INSERT INTO staff (name, role, sort_order) VALUES ('Rhuan', 'Barbeiro', 3);

-- Desativa o catálogo de exemplo (mantém as linhas por causa da FK com agendamentos já criados)
UPDATE services SET active = false;

INSERT INTO services (category, name, description, duration_minutes, price_cents, sort_order, active, required_staff_id, price_is_from) VALUES
  -- Cortes
  ('Cortes', 'Corte', NULL, 45, 3500, 10, true, NULL, false),
  ('Cortes', 'Corte com Glaycon', NULL, 45, 4500, 11, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Cortes', 'Corte Infantil', NULL, 45, 4000, 12, true, NULL, false),
  ('Cortes', 'Corte infantil com Glaycon', NULL, 45, 5000, 13, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Cortes', 'Platinado', NULL, 225, 18000, 14, true, NULL, false),

  -- Barba
  ('Barba', 'Barba', NULL, 15, 2500, 20, true, NULL, false),
  ('Barba', 'Barba com Glaycon', NULL, 30, 3000, 21, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Barba', 'Barba + sobrancelhas', NULL, 30, 3000, 22, true, NULL, false),
  ('Barba', 'Barba com ozonioterapia', NULL, 45, 5000, 23, true, NULL, false),
  ('Barba', 'Raspagem + Barba', NULL, 45, 3500, 24, true, NULL, false),
  ('Barba', 'Bigode', NULL, 15, 1000, 25, true, NULL, false),
  ('Barba', 'Cavanhaque', NULL, 15, 1500, 26, true, NULL, false),

  -- Sobrancelha / pezinho
  ('Sobrancelha', 'Sobrancelha', NULL, 15, 1500, 30, true, NULL, false),
  ('Sobrancelha', 'Pezinho', NULL, 15, 1500, 31, true, NULL, false),
  ('Sobrancelha', 'Pezinho com Glaycon', NULL, 15, 1500, 32, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),

  -- Combos
  ('Combos', 'Corte + Barba', NULL, 60, 6000, 40, true, NULL, false),
  ('Combos', 'Corte + Barba com Glaycon', NULL, 90, 7000, 41, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Combos', 'Corte + Barba + Sobrancelha', NULL, 60, 6500, 42, true, NULL, false),
  ('Combos', 'Corte + Barba + Sobrancelha com Glaycon', NULL, 75, 8000, 43, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Combos', 'Corte + Cavanhaque', NULL, 60, 5000, 44, true, NULL, false),
  ('Combos', 'Corte + Cavanhaque com Glaycon', NULL, 60, 5500, 45, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Combos', 'Corte + Cavanhaque + Sobrancelha', NULL, 60, 5500, 46, true, NULL, false),
  ('Combos', 'Corte + Cavanhaque + Sobrancelha com Glaycon', NULL, 60, 6500, 47, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Combos', 'Corte + Sobrancelha', NULL, 45, 4500, 48, true, NULL, false),
  ('Combos', 'Corte + Sobrancelha com Glaycon', NULL, 45, 5500, 49, true, (SELECT id FROM staff WHERE name = 'Glaycon'), false),
  ('Combos', 'Corte + Platinado', NULL, 120, 18000, 50, true, NULL, false),

  -- Estética / tratamentos
  ('Estética', 'Relaxamento', NULL, 15, 2500, 60, true, NULL, false),
  ('Estética', 'Tintura preta (cabelo todo)', NULL, 15, 2500, 61, true, NULL, false),
  ('Estética', 'Hidratação', NULL, 15, 2500, 62, true, NULL, false),
  ('Estética', 'Hidratação Profundo', NULL, 15, 4500, 63, true, NULL, false),
  ('Estética', 'Limpeza de pele', NULL, 30, 8000, 64, true, NULL, false),
  ('Estética', 'Luzes', 'Valor pode variar conforme o comprimento/volume do cabelo.', 90, 12000, 65, true, NULL, true),
  ('Estética', 'Pigmentação Disfarçado', NULL, 30, 2000, 66, true, NULL, false),
  ('Estética', 'Pigmentação Colorida', NULL, 150, 9500, 67, true, NULL, false);
