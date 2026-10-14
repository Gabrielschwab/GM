import { getDatabase } from "@netlify/database";
import { computeAvailability } from "./_lib/booking.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const serviceId = Number(url.searchParams.get("service_id"));
  const staffIdParam = url.searchParams.get("staff_id");
  const staffId = staffIdParam ? Number(staffIdParam) : null;

  const db = getDatabase();
  const result = await computeAvailability(db, { date, serviceId, staffId });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 400 });
  return Response.json(result);
};

export const config = { path: "/api/availability" };
