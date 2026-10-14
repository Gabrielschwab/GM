import { getDatabase } from "@netlify/database";

export default async () => {
  const db = getDatabase();
  const staff = await db.sql`
    SELECT id, name, role, photo_url, sort_order
    FROM staff
    WHERE active = true
    ORDER BY sort_order ASC
  `;
  return Response.json({ staff });
};

export const config = { path: "/api/staff" };
