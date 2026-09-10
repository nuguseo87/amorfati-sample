-- 아모르파티 회원신청
CREATE TABLE IF NOT EXISTS applications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  memo        TEXT,
  plan        TEXT NOT NULL DEFAULT 'FOUNDERS100',
  status      TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  source      TEXT,
  agreed_at   TEXT,                              -- 개인정보 동의 시각 (증빙)
  created_at  TEXT NOT NULL,
  reviewed_at TEXT,
  reviewer    TEXT,
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_app_status  ON applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_email   ON applications(email);

-- 중복 신청 방지용(같은 이메일 pending 중복 차단은 애플리케이션에서 처리)
