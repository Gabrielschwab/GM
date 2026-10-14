import { getDatabase } from "@netlify/database";

export default async () => {
  const db = getDatabase();
  const services = await db.sql`
    SELECT id, category, name, description, duration_minutes, price_cents, sort_order
    FROM services
    WHERE active = true
    ORDER BY sort_order ASC
  `;
  return Response.json({ services });
};

export const config = { path: "/api/services" };
