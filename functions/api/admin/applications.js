import { json, adminOk } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  const status = new URL(request.url).searchParams.get("status") || "pending";
  const q = status === "all"
    ? env.DB.prepare("SELECT * FROM applications ORDER BY created_at DESC LIMIT 300")
    : env.DB.prepare("SELECT * FROM applications WHERE status = ? ORDER BY created_at DESC LIMIT 300").bind(status);
  const rows   = await q.all();
  const counts = await env.DB.prepare("SELECT status, COUNT(*) n FROM applications GROUP BY status").all();
  return json({ ok: true, items: rows.results, counts: counts.results });
}
