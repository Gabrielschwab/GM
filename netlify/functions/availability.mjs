import { getDatabase } from "@netlify/database";

// Horário de funcionamento (exemplo — ajuste aqui quando o horário real for confirmado).
// 0 = domingo ... 6 = sábado. Fuso fixo America/Sao_Paulo (UTC-03:00, sem horário de verão).
const BUSINESS_HOURS = {
  0: null, // domingo: fechado
  1: { open: "09:00", close: "19:00" },
  2: { open: "09:00", close: "19:00" },
  3: { open: "09:00", close: "19:00" },
  4: { open: "09:00", close: "19:00" },
  5: { open: "09:00", close: "19:00" },
  6: { open: "09:00", close: "17:00" },
};

const TZ_OFFSET = "-03:00";
const SLOT_GRANULARITY_MIN = 30;

function isValidDate(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export default async (req) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const serviceId = Number(url.searchParams.get("service_id"));
  const staffIdParam = url.searchParams.get("staff_id");
  const staffId = staffIdParam ? Number(staffIdParam) : null;

  if (!isValidDate(date) || !serviceId) {
    return Response.json({ error: "Parâmetros inválidos: informe date=YYYY-MM-DD e service_id." }, { status: 400 });
  }

  const db = getDatabase();
  const [service] = await db.sql`SELECT id, duration_minutes FROM services WHERE id = ${serviceId} AND active = true`;
  if (!service) {
    return Response.json({ error: "Serviço não encontrado." }, { status: 404 });
  }

  const activeStaff = staffId
    ? await db.sql`SELECT id FROM staff WHERE id = ${staffId} AND active = true`
    : await db.sql`SELECT id FROM staff WHERE active = true ORDER BY sort_order ASC`;
  if (!activeStaff.length) {
    return Response.json({ error: "Nenhum profissional disponível." }, { status: 404 });
  }
  const staffIds = activeStaff.map((s) => s.id);

  const dayStart = new Date(`${date}T00:00:00${TZ_OFFSET}`);
  const weekday = dayStart.getUTCDay();
  const hours = BUSINESS_HOURS[weekday];
  if (!hours) {
    return Response.json({ slots: [], reason: "Fechado nesse dia." });
  }

  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const existing = await db.sql`
    SELECT staff_id, starts_at, ends_at FROM appointments
    WHERE status != 'cancelled' AND staff_id = ANY(${staffIds}) AND starts_at >= ${dayStart.toISOString()} AND starts_at < ${dayEnd.toISOString()}
  `;
  const byStaff = new Map(staffIds.map((id) => [id, []]));
  existing.forEach((apt) => {
    if (byStaff.has(apt.staff_id)) byStaff.get(apt.staff_id).push(apt);
  });

  const openDt = new Date(`${date}T${hours.open}:00${TZ_OFFSET}`);
  const closeDt = new Date(`${date}T${hours.close}:00${TZ_OFFSET}`);
  const durationMs = service.duration_minutes * 60 * 1000;
  const stepMs = SLOT_GRANULARITY_MIN * 60 * 1000;
  const now = new Date();

  const slots = [];
  for (let t = openDt.getTime(); t + durationMs <= closeDt.getTime(); t += stepMs) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + durationMs);
    if (slotStart <= now) continue; // não oferece horário no passado

    // disponível se PELO MENOS UM profissional (dentre os considerados) está livre nesse horário
    const someStaffFree = staffIds.some((id) => {
      const apts = byStaff.get(id);
      return !apts.some((apt) => slotStart < new Date(apt.ends_at) && slotEnd > new Date(apt.starts_at));
    });
    if (someStaffFree) slots.push(slotStart.toISOString());
  }

  return Response.json({ slots, duration_minutes: service.duration_minutes });
};

export const config = { path: "/api/availability" };
