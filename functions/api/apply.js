import { json, clean, isEmail, digits } from "../_lib.js";

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "bad-json" }, 400); }

  // 허니팟 — 봇이 채우면 저장하지 않고 성공처럼 돌려준다
  if (clean(b.company, 50)) return json({ ok: true });

  const name  = clean(b.name, 40);
  const phone = clean(b.phone, 20);
  const email = clean(b.email, 80);
  const memo  = clean(b.memo, 300);

  if (name.length < 2)          return json({ error: "name" },  400);
  if (digits(phone).length < 9) return json({ error: "phone" }, 400);
  if (!isEmail(email))          return json({ error: "email" }, 400);
  if (!b.agreedAt)              return json({ error: "agree" }, 400);

  // 같은 이메일로 대기 중인 신청이 있으면 중복 접수하지 않는다
  const dup = await env.DB.prepare(
    "SELECT id FROM applications WHERE email = ? AND status = 'pending' LIMIT 1"
  ).bind(email).first();
  if (dup) return json({ ok: true, duplicate: true });

  const res = await env.DB.prepare(
    `INSERT INTO applications (name, phone, email, memo, plan, status, source, agreed_at, created_at)
     VALUES (?, ?, ?, ?, 'FOUNDERS100', 'pending', ?, ?, ?)`
  ).bind(name, phone, email, memo, clean(b.source, 30) || "website",
         clean(b.agreedAt, 40), new Date().toISOString()).run();

  // 알림 실패가 접수를 막지 않는다
  if (env.NOTIFY_WEBHOOK) {
    try {
      await fetch(env.NOTIFY_WEBHOOK, { method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: `[아모르파티] FOUNDERS 100 신규 신청 — ${name} 님` }) });
    } catch (_) {}
  }
  return json({ ok: true, id: res.meta.last_row_id });
}
