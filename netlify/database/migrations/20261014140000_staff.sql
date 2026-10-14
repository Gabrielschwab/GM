-- Adiciona profissionais (funcionários) e vincula agendamentos a um profissional específico.
-- Nomes abaixo são placeholders — confirme os nomes reais da equipe e atualize via SQL (ver ADMIN.md).

CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE appointments ADD COLUMN staff_id INTEGER REFERENCES staff(id);
CREATE INDEX idx_appointments_staff_id ON appointments (staff_id);

INSERT INTO staff (name, role, sort_order) VALUES
  ('Profissional 1', 'Barbeiro', 1),
  ('Profissional 2', 'Barbeiro', 2);
