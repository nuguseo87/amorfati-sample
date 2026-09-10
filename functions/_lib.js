/** 아모르파티 공용 유틸 — Pages Functions
 *  같은 도메인에서 서빙되므로 CORS 가 필요 없다. */
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8" },
  });

export const clean  = (v, max) => String(v ?? "").trim().slice(0, max);
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const digits = v => v.replace(/[^0-9]/g, "");

/** 관리자 토큰 — 상수시간 비교 (타이밍 공격 방지) */
export function adminOk(req, env) {
  const got = req.headers.get("X-Admin-Token") || "";
  const want = env.ADMIN_TOKEN || "";
  if (!want || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}
