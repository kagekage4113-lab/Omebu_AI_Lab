// 静的サイト生成: data/*.json -> dist/ (依存パッケージなし)
// 内部リンクはすべて相対パスなので、GitHub Pages のサブパスでも独自ドメインでもそのまま動く。
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const readJson = (f) => JSON.parse(readFileSync(join(ROOT, "data", f), "utf8"));

const site = readJson("site.json");
const profile = readJson("profile.json");
const works = readJson("works.json");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
const isHttp = (u) => /^https?:\/\//i.test(u);
const catLabel = (id) => site.categories.find((c) => c.id === id)?.label ?? id;
const statusLabel = (id) => site.statuses[id] ?? id;

const out = (path, html) => {
  const file = join(DIST, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
};

// ---------- バリデーション ----------
const slugs = new Set();
for (const w of works) {
  if (!w.slug || slugs.has(w.slug)) throw new Error(`slug が空か重複: ${w.slug}`);
  slugs.add(w.slug);
  if (!site.categories.some((c) => c.id === w.category)) throw new Error(`${w.slug}: 未定義のカテゴリ ${w.category}`);
  if (!site.statuses[w.status]) throw new Error(`${w.slug}: 未定義のステータス ${w.status}`);
}

// ---------- 部品 ----------
const extLink = (url, label, cls = "") =>
  `<a class="${cls}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}<span class="sr-only">(新しいタブで開く)</span></a>`;
const paras = (arr) => arr.map((t) => `<p>${esc(t)}</p>`).join("\n");
const list = (arr) => `<ul>${arr.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;

function placeholderSvg(name) {
  const t = esc(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="仮画像: ${t}">
<defs><pattern id="h" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="24" fill="#eceae4"/><line x1="0" y1="0" x2="0" y2="24" stroke="#dedbd2" stroke-width="8"/></pattern></defs>
<rect width="1280" height="720" fill="url(#h)"/>
<rect x="440" y="290" width="400" height="48" rx="4" fill="#fafaf8" stroke="#8a867b"/>
<text x="640" y="322" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#4a4740" letter-spacing="4">仮画像 / PLACEHOLDER</text>
<text x="640" y="380" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#4a4740">${t}</text>
<text x="640" y="420" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#6b675d">実際の画面ではありません</text>
</svg>`;
}

function thumb(w, root, lazy = true) {
  const t = w.thumbnail;
  const src = t?.src ? root + t.src : `${root}assets/placeholder/${w.slug}.svg`;
  const alt = t?.src ? t.alt || `${w.name}のサムネイル` : `${w.name}の仮画像(実際の画面ではありません)`;
  const size = t?.width && t?.height ? ` width="${t.width}" height="${t.height}"` : ` width="1280" height="720"`;
  return `<img${t?.src ? ' class="art"' : ""} src="${esc(src)}" alt="${esc(alt)}"${size}${lazy ? ' loading="lazy" decoding="async"' : ""}>`;
}

const badge = (w) => `<span class="badge badge-${esc(w.status)}">${esc(statusLabel(w.status))}</span>`;

function card(w, root) {
  return `<article class="card" data-category="${esc(w.category)}">
  <a class="card-media" href="${root}works/${esc(w.slug)}/" tabindex="-1" aria-hidden="true">${thumb(w, root)}</a>
  <div class="card-body">
    <p class="meta">${badge(w)} <span class="cat">${esc(catLabel(w.category))}</span></p>
    <h3><a href="${root}works/${esc(w.slug)}/">${esc(w.name)}</a></h3>
    <p>${esc(w.tagline)}</p>
  </div>
</article>`;
}

// ---------- レイアウト ----------
function layout({ depth, path, title, description, body, current }) {
  const root = "../".repeat(depth) || "./";
  const full = title ? `${title} | ${site.name}` : site.name;
  const base = site.url.replace(/\/$/, "");
  const canonical = base ? `${base}/${path}` : "";
  const nav = [
    ["works", "作品一覧", `${root}works/`],
    ["profile", "開発について", `${root}profile/`],
    ["contact", "お問い合わせ", `${root}contact/`],
  ]
    .map(([id, label, href]) => `<li><a href="${href}"${current === id ? ' aria-current="page"' : ""}>${label}</a></li>`)
    .join("");
  const social = site.social
    .filter((s) => s.url)
    .map((s) => `<li>${extLink(s.url, s.label)}</li>`)
    .join("");
  const copy = site.footer.copyrightHolder || site.name;
  return `<!doctype html>
<html lang="${esc(site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description || site.description)}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">\n<meta property="og:url" content="${esc(canonical)}">` : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}assets/styles.css">
</head>
<body>
<a class="skip" href="#main">本文へスキップ</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="${root}">${esc(site.name)}</a>
    <nav aria-label="メイン"><ul>${nav}${social}</ul></nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <ul class="foot-links">
      <li><a href="${root}works/">作品一覧</a></li>
      <li><a href="${root}profile/">開発について</a></li>
      <li><a href="${root}contact/">お問い合わせ</a></li>
      ${site.privacyPolicy ? `<li><a href="${esc(site.privacyPolicy)}">プライバシーポリシー</a></li>` : ""}
      ${social}
    </ul>
    <p class="copy">&copy; ${new Date().getFullYear()} ${esc(copy)}</p>
  </div>
</footer>
</body>
</html>
`;
}

// ---------- ページ ----------
const byOrder = (a, b) => works.indexOf(a) - works.indexOf(b);

function homePage() {
  const root = "./";
  const featured = works.filter((w) => w.featured).sort(byOrder).slice(0, 3);
  const wip = works.filter((w) => w.status === "in-progress" && !featured.includes(w)).sort(byOrder);
  const body = `
<section class="hero wrap">
  <h1>${esc(site.hero.title)}</h1>
  ${paras(site.hero.lead)}
  <p><a class="btn" href="${root}works/">作品一覧を見る</a></p>
</section>
${has(featured) ? `<section class="wrap section">
  <h2>注目作品</h2>
  <div class="grid grid-featured">${featured.map((w) => card(w, root)).join("\n")}</div>
</section>` : ""}
${has(wip) ? `<section class="wrap section">
  <h2>開発中のプロジェクト</h2>
  <p class="lead">現在取り組んでいるものです。完成した作品ではありません。</p>
  <div class="grid">${wip.map((w) => card(w, root)).join("\n")}</div>
</section>` : ""}
<section class="wrap section">
  <h2>開発方針</h2>
  <ol class="policy">${site.policy.map((p) => `<li><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`).join("")}</ol>
  <p><a href="${root}profile/">開発者について詳しく見る →</a></p>
</section>`;
  return layout({ depth: 0, path: "", title: "", description: site.description, body, current: "" });
}

function worksPage() {
  const root = "../";
  const used = site.categories.filter((c) => works.some((w) => w.category === c.id));
  const filter = used.length > 1 ? `<div class="filter" role="group" aria-label="カテゴリで絞り込み" hidden>
  <button type="button" data-filter="all" aria-pressed="true">すべて</button>
  ${used.map((c) => `<button type="button" data-filter="${esc(c.id)}" aria-pressed="false">${esc(c.label)}</button>`).join("\n  ")}
</div>` : "";
  const body = `
<section class="wrap section page-head">
  <h1>作品一覧</h1>
  <p class="lead">公開作品と開発中の作品を掲載しています。状態は各作品のラベルで区別しています。</p>
  ${filter}
  <div class="grid" id="works-grid">${works.map((w) => card(w, root)).join("\n")}</div>
</section>
<script>
(function(){var f=document.querySelector(".filter");if(!f)return;f.hidden=false;
f.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;
f.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});
document.querySelectorAll("#works-grid .card").forEach(function(c){
c.hidden=b.dataset.filter!=="all"&&c.dataset.category!==b.dataset.filter;});});})();
</script>`;
  return layout({ depth: 1, path: "works/", title: "作品一覧", description: "個人開発のソフトウェア、AIツール、シミュレータ、ゲームの一覧。", body, current: "works" });
}

function section(title, inner) {
  return inner ? `<section class="detail-sec"><h2>${esc(title)}</h2>${inner}</section>` : "";
}

function workPage(w) {
  const root = "../../";
  const features = (w.features || []).map((f) =>
    typeof f === "string" ? `<li>${esc(f)}</li>` : `<li><strong>${esc(f.title)}</strong>${f.text ? `<br>${esc(f.text)}` : ""}</li>`);
  const shots = (w.screenshots || []).map((s) => `<figure><img src="${esc(root + s.src)}" alt="${esc(s.alt || "")}"${s.width && s.height ? ` width="${s.width}" height="${s.height}"` : ""} loading="lazy" decoding="async">${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ""}</figure>`);
  const vids = (w.videos || []).map((v) => {
    const t = esc(v.title || `${w.name}の動作動画`);
    const inner = v.youtube
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${esc(v.youtube)}" title="${t}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
      : `<video controls preload="metadata" ${v.poster ? `poster="${esc(root + v.poster)}"` : ""} src="${esc(root + v.src)}">${t}</video>`;
    return `<figure class="video">${inner}${v.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ""}</figure>`;
  });
  const links = (w.links || []).filter((l) => l.url);
  const changelog = (w.changelog || []).map((c) => `<li><span class="date">${esc(c.date)}${c.version ? ` ${esc(c.version)}` : ""}</span> ${esc(c.notes)}</li>`);

  const body = `
<article class="wrap detail">
  <p class="crumb"><a href="${root}works/">作品一覧</a> /</p>
  <p class="meta">${badge(w)} <span class="cat">${esc(catLabel(w.category))}</span></p>
  <h1>${esc(w.name)}</h1>
  <p class="lead">${esc(w.tagline)}</p>
  <div class="hero-media">${thumb(w, root, false)}</div>
  ${w.unverified ? `<p class="notice">この作品の情報は確認中です。確定していない内容は掲載していません。詳細が決まり次第、更新します。</p>` : ""}
  ${section("概要", paras(w.summary || []))}
  ${section("開発のきっかけ・解決したい課題", paras(w.background || []))}
  ${section("こんな人・こんな場面で", has(w.useCases) ? list(w.useCases) : "")}
  ${section("主な機能", has(features) ? `<ul>${features.join("")}</ul>` : "")}
  ${section("スクリーンショット・動作動画", has(shots) || has(vids) ? `<div class="media">${vids.join("")}${shots.join("")}</div>` : "")}
  ${section("技術構成", has(w.tech) ? list(w.tech) : "")}
  ${section("利用方法・導入手順", paras(w.howToUse || []))}
  ${section("公開状況", w.availability ? `<p>${esc(w.availability)}</p>` : "")}
  ${section("リンク", has(links) ? `<ul>${links.map((l) => `<li>${isHttp(l.url) ? extLink(l.url, l.label) : `<a href="${esc(l.url)}">${esc(l.label)}</a>`}</li>`).join("")}</ul>` : "")}
  ${section("現在の制約・注意事項", has(w.constraints) ? list(w.constraints) : "")}
  ${section("今後の開発予定", has(w.roadmap) ? list(w.roadmap) : "")}
  ${section("更新履歴", has(changelog) ? `<ul class="changelog">${changelog.join("")}</ul>` : "")}
</article>`;
  return layout({ depth: 2, path: `works/${w.slug}/`, title: w.name, description: w.tagline, body, current: "works" });
}

function profilePage() {
  const root = "../";
  const secs = profile.sections.map((s) =>
    section(s.title, (has(s.body) ? paras(s.body) : "") + (has(s.list) ? list(s.list) : ""))).join("");
  const body = `
<div class="wrap detail">
  <h1>${esc(profile.title)}</h1>
  ${profile.name ? `<p class="lead">${esc(profile.name)}</p>` : ""}
  ${profile.photo ? `<p><img class="avatar" src="${esc(root + profile.photo.src)}" alt="${esc(profile.photo.alt || "")}" width="160" height="160"></p>` : ""}
  ${paras(profile.intro)}
  ${secs}
  ${profile.showWorks ? section("主な制作物", `<ul>${works.map((w) => `<li><a href="${root}works/${esc(w.slug)}/">${esc(w.name)}</a>(${esc(statusLabel(w.status))})</li>`).join("")}</ul>`) : ""}
  ${section("外部リンク", site.social.some((s) => s.url) ? `<ul>${site.social.filter((s) => s.url).map((s) => `<li>${extLink(s.url, s.label)}</li>`).join("")}</ul>` : "")}
</div>`;
  return layout({ depth: 1, path: "profile/", title: profile.title, description: "開発者の考え方、開発方針、取り組んでいる分野。", body, current: "profile" });
}

function contactPage() {
  const methods = site.contact.methods.filter((m) => m.url);
  const body = `
<div class="wrap detail">
  <h1>お問い合わせ</h1>
  ${has(methods)
    ? `<p>${esc(site.contact.lead)}</p><ul>${methods.map((m) => `<li>${isHttp(m.url) ? extLink(m.url, m.label) : `<a href="${esc(m.url)}">${esc(m.label)}</a>`}</li>`).join("")}</ul>`
    : `<p class="notice">${esc(site.contact.emptyNote)}</p>`}
</div>`;
  return layout({ depth: 1, path: "contact/", title: "お問い合わせ", description: "お問い合わせ先・外部リンク。", body, current: "contact" });
}

// ---------- 出力 ----------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
if (existsSync(join(ROOT, "public"))) cpSync(join(ROOT, "public"), DIST, { recursive: true });
cpSync(join(ROOT, "src", "styles.css"), join(DIST, "assets", "styles.css"));
cpSync(join(ROOT, "src", "favicon.svg"), join(DIST, "assets", "favicon.svg"));

for (const w of works) out(`assets/placeholder/${w.slug}.svg`, placeholderSvg(w.name));

out("index.html", homePage());
out("works/index.html", worksPage());
for (const w of works) out(`works/${w.slug}/index.html`, workPage(w));
out("profile/index.html", profilePage());
out("contact/index.html", contactPage());
out(".nojekyll", "");

if (site.url) {
  const base = site.url.replace(/\/$/, "");
  const urls = ["", "works/", "profile/", "contact/", ...works.map((w) => `works/${w.slug}/`)];
  out("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${esc(`${base}/${u}`)}</loc></url>`).join("\n")}\n</urlset>\n`);
  out("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
}
console.log(`built ${works.length} works -> dist/`);
