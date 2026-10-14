import { getDatabase } from "@netlify/database";
import { listServices } from "./_lib/booking.mjs";

export default async () => {
  const db = getDatabase();
  const services = await listServices(db);
  return Response.json({ services });
};

export const config = { path: "/api/services" };
