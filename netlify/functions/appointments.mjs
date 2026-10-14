import { getDatabase } from "@netlify/database";

function isAuthorized(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${token}`;
}

async function handleGet(req) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const db = getDatabase();
  const url = new URL(req.url);
  const from = url.searchParams.get("from"); // ISO date, opcional
  const rows = from
    ? await db.sql`
        SELECT a.id, a.customer_name, a.customer_phone, a.starts_at, a.ends_at, a.status, a.notes,
               s.name AS service_name, s.category AS service_category
        FROM appointments a JOIN services s ON s.id = a.service_id
        WHERE a.starts_at >= ${from} AND a.status != 'cancelled'
        ORDER BY a.starts_at ASC
      `
    : await db.sql`
        SELECT a.id, a.customer_name, a.customer_phone, a.starts_at, a.ends_at, a.status, a.notes,
               s.name AS service_name, s.category AS service_category
        FROM appointments a JOIN services s ON s.id = a.service_id
        WHERE a.status != 'cancelled'
        ORDER BY a.starts_at ASC
      `;
  return Response.json({ appointments: rows });
}

async function handlePost(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const serviceId = Number(body.service_id);
  const customerName = String(body.customer_name || "").trim();
  const customerPhone = String(body.customer_phone || "").trim();
  const startsAtRaw = body.starts_at;

  if (!serviceId || !customerName || !customerPhone || !startsAtRaw) {
    return Response.json({ error: "Preencha serviço, nome, telefone e horário." }, { status: 400 });
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    return Response.json({ error: "Horário inválido ou no passado." }, { status: 400 });
  }

  const db = getDatabase();
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const serviceRes = await client.query(
      "SELECT id, duration_minutes FROM services WHERE id = $1 AND active = true",
      [serviceId]
    );
    const service = serviceRes.rows[0];
    if (!service) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60 * 1000);

    const overlapRes = await client.query(
      `SELECT id FROM appointments
       WHERE status != 'cancelled' AND starts_at < $1 AND ends_at > $2
       FOR UPDATE`,
      [endsAt.toISOString(), startsAt.toISOString()]
    );
    if (overlapRes.rows.length > 0) {
      await client.query("ROLLBACK");
      return Response.json({ error: "Esse horário acabou de ser ocupado. Escolha outro." }, { status: 409 });
    }

    const insertRes = await client.query(
      `INSERT INTO appointments (service_id, customer_name, customer_phone, starts_at, ends_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, starts_at, ends_at`,
      [serviceId, customerName, customerPhone, startsAt.toISOString(), endsAt.toISOString()]
    );

    await client.query("COMMIT");
    return Response.json({ appointment: insertRes.rows[0] }, { status: 201 });
  } catch (err) {
    await client.query("ROLLBACK");
    return Response.json({ error: "Erro ao criar agendamento." }, { status: 500 });
  } finally {
    client.release();
  }
}

export default async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("_diag") === "1") {
    return Response.json({ hasAdminToken: typeof process.env.ADMIN_TOKEN === "string" });
  }
  if (req.method === "GET") return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/appointments" };
