import { getDatabase } from "@netlify/database";
import { createAppointment } from "./_lib/booking.mjs";

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
               s.name AS service_name, s.category AS service_category,
               st.name AS staff_name
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        LEFT JOIN staff st ON st.id = a.staff_id
        WHERE a.starts_at >= ${from} AND a.status != 'cancelled'
        ORDER BY a.starts_at ASC
      `
    : await db.sql`
        SELECT a.id, a.customer_name, a.customer_phone, a.starts_at, a.ends_at, a.status, a.notes,
               s.name AS service_name, s.category AS service_category,
               st.name AS staff_name
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        LEFT JOIN staff st ON st.id = a.staff_id
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

  const db = getDatabase();
  const result = await createAppointment(db, {
    serviceId: Number(body.service_id),
    staffId: body.staff_id ? Number(body.staff_id) : null,
    customerName: String(body.customer_name || "").trim(),
    customerPhone: String(body.customer_phone || "").trim(),
    customerEmail: body.customer_email ? String(body.customer_email).trim() : null,
    startsAtIso: body.starts_at,
  });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 400 });
  return Response.json({ appointment: result.appointment }, { status: 201 });
}

async function handleDelete(req) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) {
    return Response.json({ error: "Informe o id do agendamento." }, { status: 400 });
  }
  const db = getDatabase();
  const rows = await db.sql`UPDATE appointments SET status = 'cancelled' WHERE id = ${id} RETURNING id`;
  if (!rows.length) {
    return Response.json({ error: "Agendamento não encontrado." }, { status: 404 });
  }
  return Response.json({ cancelled: id });
}

export default async (req) => {
  if (req.method === "GET") return handleGet(req);
  if (req.method === "POST") return handlePost(req);
  if (req.method === "DELETE") return handleDelete(req);
  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/appointments" };
