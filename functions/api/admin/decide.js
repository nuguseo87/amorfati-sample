import { json, adminOk, clean } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!adminOk(request, env)) return json({ error: "unauthorized" }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: "bad-json" }, 400); }
  const id = parseInt(b.id, 10);
  const map = { approve: "approved", reject: "rejected", reset: "pending" };
  const next = map[b.action];
  if (!id || !next) return json({ error: "bad-request" }, 400);
  await env.DB.prepare(
    "UPDATE applications SET status=?, reviewed_at=?, reviewer=?, note=? WHERE id=?"
  ).bind(next, new Date().toISOString(), clean(b.reviewer, 30) || "admin", clean(b.note, 200), id).run();
  return json({ ok: true });
}
