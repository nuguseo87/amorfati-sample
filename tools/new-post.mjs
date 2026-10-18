#!/usr/bin/env node
/**
 * 모임소식 새 글 등록 — 폴더 생성 + posts.json 반영까지 한 번에.
 *
 *   node tools/new-post.mjs --slug 2026-11-02-founder-night \
 *        --title "파운더 나이트 1회" --date 2026-11-02 \
 *        --summary "첫 파운더 나이트가 열렸습니다." \
 *        --photos ~/Desktop/사진들
 *
 * 사진은 긴 변 1200px, JPEG 84 로 줄여 01.jpg 부터 번호를 다시 매긴다.
 * 첫 장이 목록 썸네일(cover)이 된다. 본문은 생성된 index.html 을 열어 고치면 된다.
 *
 * 🔴 사람 얼굴이 담긴 사진은 공개 범위를 먼저 확인할 것.
 *    소식 페이지는 기본이 robots noindex 다(검색 제외, 링크로는 열림).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NEWS = join(ROOT, 'news');

const args = process.argv.slice(2);
const get = (k, d = null) => {
  const i = args.indexOf('--' + k);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};

const slug    = get('slug');
const title   = get('title');
const date    = get('date', new Date().toISOString().slice(0, 10));
const summary = get('summary', '');
const category= get('category', '활동소식');
const photoDir= get('photos');

if (!slug || !title) {
  console.error('사용법: node tools/new-post.mjs --slug <폴더이름> --title "<제목>" [--date YYYY-MM-DD] [--summary "..."] [--photos <사진폴더>]');
  process.exit(1);
}
if (!/^[0-9a-z][0-9a-z-]*$/.test(slug)) {
  console.error('🔴 slug 는 영소문자·숫자·하이픈만. 예: 2026-11-02-founder-night');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('🔴 date 형식은 YYYY-MM-DD 여야 한다.');
  process.exit(1);
}

const dir = join(NEWS, slug);
if (existsSync(dir)) { console.error(`🔴 이미 있다: news/${slug}`); process.exit(1); }
mkdirSync(dir, { recursive: true });

// ── 사진 복사·축소 (sips 는 macOS 기본 도구라 추가 설치가 필요 없다)
let cover = null, n = 0;
if (photoDir) {
  const src = resolve(photoDir.replace(/^~/, process.env.HOME || '~'));
  if (!existsSync(src)) { console.error(`🔴 사진 폴더가 없다: ${src}`); process.exit(1); }
  const files = readdirSync(src)
    .filter(f => /\.(jpe?g|png|heic)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  for (const f of files) {
    const out = join(dir, String(++n).padStart(2, '0') + '.jpg');
    try {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84',
                            '-Z', '1200', join(src, f), '--out', out], { stdio: 'ignore' });
    } catch {
      if (extname(f).toLowerCase() === '.jpg') copyFileSync(join(src, f), out);
      else { n--; console.warn(`  ⚠️ 변환 실패, 건너뜀: ${f}`); continue; }
    }
    if (!cover) cover = String(n).padStart(2, '0') + '.jpg';
  }
  console.log(`  사진 ${n}장 처리`);
}

// ── 본문 뼈대 (기존 소식 페이지와 같은 틀)
const sample = join(NEWS, '2026-10-18-opening', 'index.html');
let html;
if (existsSync(sample)) {
  html = readFileSync(sample, 'utf8')
    .replace(/<title>[^<]*<\/title>/, `<title>${title} — 카페 아모르파티</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${summary}$2`)
    .replace(/(<meta property="og:url" content="https:\/\/www\.amorfaticafe\.net\/news\/)[^"]*(\/")/, `$1${slug}$2`)
    .replace(/(<meta property="og:image" content="https:\/\/www\.amorfaticafe\.net\/news\/)[^/]*(\/)/, `$1${slug}$2`);
  // 본문 영역은 비우고 뼈대만 남긴다 — 글과 사진은 직접 채운다
  html = html.replace(/<div class="body">[\s\S]*?<\/div>\n\n  <div class="facts">/,
    `<div class="body">\n    <p>본문을 여기에 적는다.</p>\n` +
    (cover ? `\n    <figure>\n      <img src="${cover}" alt="${title}">\n      <figcaption>사진 설명</figcaption>\n    </figure>\n` : '') +
    `  </div>\n\n  <div class="facts">`)
    .replace(/<h1>[^<]*<\/h1>/, `<h1>${title}</h1>`)
    .replace(/<div class="date">[^<]*<\/div>/, `<div class="date">${date.replace(/-/g, '. ')}</div>`)
    .replace(/<div class="summary">[\s\S]*?<\/div>/, `<div class="summary">\n    ${summary || '요약을 여기에 적는다.'}\n  </div>`)
    .replace(/<span class="cat">[^<]*<\/span>/, `<span class="cat">${category}</span>`);
} else {
  html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title></head>\n<body><h1>${title}</h1></body></html>\n`;
}
writeFileSync(join(dir, 'index.html'), html);

// ── 목록에 등록
const pj = join(NEWS, 'posts.json');
const list = existsSync(pj) ? JSON.parse(readFileSync(pj, 'utf8')) : [];
if (list.some(p => p.slug === slug)) { console.error('🔴 posts.json 에 같은 slug 가 이미 있다.'); process.exit(1); }
list.push({ slug, title, date, category, summary, cover });
list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
writeFileSync(pj, JSON.stringify(list, null, 2) + '\n');

console.log(`\n✅ news/${slug}/ 생성 · posts.json 등록 (총 ${list.length}건)`);
console.log(`   1) news/${slug}/index.html 을 열어 본문과 사진 설명을 채운다`);
console.log(`   2) git add news && git commit && git push  → 1~2분 뒤 반영`);
console.log(`   주소: https://www.amorfaticafe.net/news/${slug}/`);
