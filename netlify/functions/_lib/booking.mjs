// Lógica de agendamento compartilhada entre a API do site (services/availability/appointments)
// e o agente de WhatsApp — mantém as duas superfícies consistentes com as mesmas regras.

export const BUSINESS_HOURS = {
  0: null, // domingo: fechado
  1: { open: "09:00", close: "19:00" },
  2: { open: "09:00", close: "19:00" },
  3: { open: "09:00", close: "19:00" },
  4: { open: "09:00", close: "19:00" },
  5: { open: "09:00", close: "19:00" },
  6: { open: "09:00", close: "17:00" },
};

export const TZ_OFFSET = "-03:00";
const SLOT_GRANULARITY_MIN = 30;

export function isValidDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export async function listServices(db) {
  return db.sql`
    SELECT id, category, name, description, duration_minutes, price_cents, sort_order,
           required_staff_id, price_is_from
    FROM services
    WHERE active = true
    ORDER BY sort_order ASC
  `;
}

export async function listStaff(db) {
  return db.sql`
    SELECT id, name, role, sort_order
    FROM staff
    WHERE active = true
    ORDER BY sort_order ASC
  `;
}

/** Retorna { slots: string[] (ISO), duration_minutes } ou { error }. */
export async function computeAvailability(db, { date, serviceId, staffId }) {
  if (!isValidDate(date) || !serviceId) {
    return { error: "Informe date=YYYY-MM-DD e service_id.", status: 400 };
  }

  const [service] = await db.sql`SELECT id, duration_minutes, required_staff_id FROM services WHERE id = ${serviceId} AND active = true`;
  if (!service) return { error: "Serviço não encontrado.", status: 404 };

  const effectiveStaffId = service.required_staff_id || staffId || null;

  const activeStaff = effectiveStaffId
    ? await db.sql`SELECT id FROM staff WHERE id = ${effectiveStaffId} AND active = true`
    : await db.sql`SELECT id FROM staff WHERE active = true ORDER BY sort_order ASC`;
  if (!activeStaff.length) return { error: "Nenhum profissional disponível.", status: 404 };
  const staffIds = activeStaff.map((s) => s.id);

  const dayStart = new Date(`${date}T00:00:00${TZ_OFFSET}`);
  const weekday = dayStart.getUTCDay();
  const hours = BUSINESS_HOURS[weekday];
  if (!hours) return { slots: [], reason: "Fechado nesse dia." };

  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const existing = await db.sql`
    SELECT staff_id, starts_at, ends_at FROM appointments
    WHERE status != 'cancelled' AND staff_id = ANY(${staffIds}) AND starts_at >= ${dayStart.toISOString()} AND starts_at < ${dayEnd.toISOString()}
  `;
  const byStaff = new Map(staffIds.map((id) => [id, []]));
  existing.forEach((apt) => { if (byStaff.has(apt.staff_id)) byStaff.get(apt.staff_id).push(apt); });

  const openDt = new Date(`${date}T${hours.open}:00${TZ_OFFSET}`);
  const closeDt = new Date(`${date}T${hours.close}:00${TZ_OFFSET}`);
  const durationMs = service.duration_minutes * 60 * 1000;
  const stepMs = SLOT_GRANULARITY_MIN * 60 * 1000;
  const now = new Date();

  const slots = [];
  for (let t = openDt.getTime(); t + durationMs <= closeDt.getTime(); t += stepMs) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + durationMs);
    if (slotStart <= now) continue;
    const someStaffFree = staffIds.some((id) => {
      const apts = byStaff.get(id);
      return !apts.some((apt) => slotStart < new Date(apt.ends_at) && slotEnd > new Date(apt.starts_at));
    });
    if (someStaffFree) slots.push(slotStart.toISOString());
  }

  return { slots, duration_minutes: service.duration_minutes };
}

/** Cria o agendamento dentro de uma transação, com atribuição automática de profissional. Retorna { appointment } ou { error, status }. */
export async function createAppointment(db, { serviceId, staffId, customerName, customerPhone, customerEmail, startsAtIso }) {
  const startsAt = new Date(startsAtIso);
  if (!serviceId || !customerName || !customerPhone || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    return { error: "Dados inválidos para o agendamento.", status: 400 };
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const serviceRes = await client.query(
      "SELECT id, duration_minutes, required_staff_id FROM services WHERE id = $1 AND active = true",
      [serviceId]
    );
    const service = serviceRes.rows[0];
    if (!service) {
      await client.query("ROLLBACK");
      return { error: "Serviço não encontrado.", status: 404 };
    }

    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60 * 1000);
    const effectiveStaffId = service.required_staff_id || staffId || null;

    const candidatesRes = effectiveStaffId
      ? await client.query("SELECT id FROM staff WHERE id = $1 AND active = true", [effectiveStaffId])
      : await client.query("SELECT id FROM staff WHERE active = true ORDER BY sort_order ASC");
    const candidateIds = candidatesRes.rows.map((r) => r.id);
    if (!candidateIds.length) {
      await client.query("ROLLBACK");
      return { error: "Nenhum profissional disponível.", status: 404 };
    }

    let assignedStaffId = null;
    for (const sid of candidateIds) {
      const overlapRes = await client.query(
        `SELECT id FROM appointments WHERE status != 'cancelled' AND staff_id = $1 AND starts_at < $2 AND ends_at > $3 FOR UPDATE`,
        [sid, endsAt.toISOString(), startsAt.toISOString()]
      );
      if (overlapRes.rows.length === 0) { assignedStaffId = sid; break; }
    }

    if (!assignedStaffId) {
      await client.query("ROLLBACK");
      return { error: "Esse horário acabou de ser ocupado. Escolha outro.", status: 409 };
    }

    const insertRes = await client.query(
      `INSERT INTO appointments (service_id, staff_id, customer_name, customer_phone, notes, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, staff_id, starts_at, ends_at`,
      [serviceId, assignedStaffId, customerName, customerPhone, customerEmail ? `e-mail: ${customerEmail}` : null, startsAt.toISOString(), endsAt.toISOString()]
    );

    await client.query("COMMIT");
    return { appointment: insertRes.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    return { error: "Erro ao criar agendamento.", status: 500 };
  } finally {
    client.release();
  }
}
