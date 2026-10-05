// SELÈ STUDIO — tools/test/seo.test.mjs (P9) — gen-en + seo on temp fixtures (Addendum A11 P9 acceptance).
//
//   SELE_TOOLS=/abs/path/to/tools node --test tools/test/seo.test.mjs
//
// Builds a temp site (a home-like template page, the projects index, two case pages — one noindex —, the film
// page, the services hub, a prose service page, the journal index, a prose article and the bilingual 404) with the
// REAL data/seo.mjs registry and the real inline boot script, then runs the pipeline gen-en → seo → gen-en --check →
// seo --check and asserts every A11 P9 item; finally one negative fixture per A8.7 error (and per gen-en error).
// Nothing outside the temp dirs is written.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
process.env.SELE_TODAY = '2026-09-28';

const genEn = await import(path.join(REPO, 'tools/gen-en.mjs'));
const seo = await import(path.join(REPO, 'tools/seo.mjs'));
const core = await import(path.join(REPO, 'tools/lib/seo-core.mjs'));
const { bootScript } = await import(path.join(REPO, 'tools/sync-partials.mjs'));
const cheerio = genEn.loadCheerio();

const HEB = /[֐-׿]/;
const BOOT = bootScript(fs.readFileSync(path.join(REPO, 'partials/head.html'), 'utf8'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sele-p9-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });
let n = 0;
const newDir = (name) => path.join(TMP, `${String(++n).padStart(2, '0')}-${name}`);

// ------------------------------------------------------------------ fixture content
/** data/site.json → serviceArea as the owner set it (28/09/2026) */
const AREA = {
  he: 'המרכז והדרום', en: 'central and southern Israel',
  regions: [
    { he: 'מחוז המרכז', en: 'Central District', wikidata: 'https://www.wikidata.org/wiki/Q188785' },
    { he: 'מחוז הדרום', en: 'Southern District', wikidata: 'https://www.wikidata.org/wiki/Q188781' },
  ],
  in: { he: 'במרכז ובדרום הארץ', en: 'in central and southern Israel' },
  line: { he: 'פרויקטים במרכז ובדרום הארץ', en: 'Projects across central and southern Israel' },
};
const COMMON = {
  'common.skip': { he: 'דילוג לתוכן', en: 'Skip to content' },
  'common.nav.aria': { he: 'ניווט ראשי', en: 'Main navigation' },
  'common.nav.projects': { he: 'פרויקטים', en: 'Projects' },
  'common.nav.services': { he: 'שירותים', en: 'Services' },
  'common.nav.journal': { he: 'מגזין', en: 'Journal' },
  'common.menu.open': { he: 'תפריט', en: 'Menu' },
  'common.menu.title': { he: 'תפריט האתר', en: 'Site menu' },
  'common.lang.pillClose': { he: 'סגירת ההצעה', en: 'Dismiss' },
  'common.crumb.home': { he: 'ראשי', en: 'Home' },
  'common.breadcrumb.aria': { he: 'מיקום באתר', en: 'You are here' },
  'common.status.render': { he: 'הדמיה', en: 'Render' },
  'common.svc.kitchen': { he: 'עיצוב מטבח', en: 'Kitchen design' },
  'common.footer.entity': {
    he: '<bdi lang="en">SELÈ STUDIO</bdi> הוא סטודיו בוטיק לאדריכלות ועיצוב פנים בישראל.',
    en: 'SELÈ STUDIO is a boutique architecture and interior design studio in Israel.',
  },
};
const HOME = {
  'home.h1': { he: 'סטודיו לאדריכלות ועיצוב פנים', en: 'Architecture and interior design studio' },
  'home.hiddenH3': { he: 'כותרת במקטע מוסתר', en: 'A heading in a hidden section' },
  'home.skip': { he: 'דילוג על הרצף', en: 'Skip this sequence' },
  'home.hero.alt': { he: 'מטבח עם אי אבן, נגרות אלון עד התקרה ונישה מוארת בקיר האבן', en: 'A kitchen with a stone island, floor-to-ceiling oak joinery and a lit stone niche' },
  'home.hero.caption': { he: 'חזית המטבח.', en: 'The kitchen front.' },
  'home.works.h2': { he: 'עבודות נבחרות', en: 'Selected work' },
  'home.titleAlt': { he: 'The Stone Kitchen', en: 'מטבח האבן' },
  'home.note': {
    he: 'טקסט עם <bdi lang="en">SELÈ STUDIO</bdi> ו<a href="/film/?ref=home#top">סרט קצר</a>.',
    en: 'A note on <bdi lang="he">ג\'פנדי</bdi> style and <a href="/film/?ref=home#top">a short film</a>.',
  },
  'home.count': { he: '{n} חללים מוצגים', en: '{n} spaces shown' },
  'home.count.init': { he: '5 חללים מוצגים', en: '5 spaces shown' },
  'home.case1': { he: 'מטבח האבן', en: 'The Stone Kitchen' },
  'home.film': { he: 'סרט קצר', en: 'A short film' },
  'home.article': { he: 'מדריך טרוורטין', en: 'A travertine guide' },
  'home.entityLabel': { he: 'הגוף המשפטי:', en: 'Legal entity:' },
};
const PROJECTS = {
  'projects.index.h1': { he: 'פרויקטים נבחרים', en: 'Selected projects' },
  'projects.stone-oak-kitchen.title': { he: 'מטבח האבן', en: 'The Stone Kitchen' },
  'projects.stone-oak-kitchen.h1Sub': { he: 'מטבח עם אי אבן ונגרות אלון', en: 'A stone-island kitchen with oak joinery' },
  'projects.stone-oak-kitchen.alt': { he: 'מטבח במבט חזיתי: אי מאבן עורקית ונגרות אלון בהיר עד התקרה. הדמיה.', en: 'A frontal view of a kitchen: a veined-stone island and full-height light-oak joinery. Render.' },
  'projects.stone-oak-kitchen.plateAlt': { he: 'האי במבט אלכסוני עם אור שמש על המשטח', en: 'The island at an angle with sunlight across the worktop' },
  'projects.stone-oak-kitchen.plateCaption': { he: 'האי באלכסון.', en: 'The island at an angle.' },
  'projects.dark-oak-kitchen.title': { he: 'מטבח באלון כהה', en: 'The Dark-Oak Kitchen' },
  'projects.dark-oak-kitchen.alt': { he: 'פינת מטבח באלון כהה עם כיור אבן אינטגרלי ומדפים מוארים', en: 'A dark-oak kitchen corner with an integrated stone sink and backlit shelving' },
  'projects.index.film': { he: 'סרט קצר מתוך העבודות', en: 'A short film from our work' },
};
const FILM = {
  'film.crumb': { he: 'סרט הסטודיו', en: 'Studio film' },
  'film.h1': { he: 'סרט קצר מתוך העבודות', en: 'A short film from our work' },
  'film.lead': { he: 'סרט שקט שנבנה מהדמיות התכנון של הסטודיו.', en: "A silent film built from the studio's design visualizations." },
  'film.videoLabel': { he: 'סרט הסטודיו: מבט על העבודות', en: 'The studio film: a look at our work' },
  'film.link': { he: 'מטבח האבן', en: 'The Stone Kitchen' },
};
const SERVICES = {
  'services.h1': { he: 'שירותי עיצוב פנים, מהתכנון ועד הסטיילינג', en: 'Interior design services, from planning to styling' },
};
const LEGAL = {
  'legal.notfound.h1': { he: 'הדלת הזו סגורה', en: 'This door is closed' },
  'legal.notfound.home': { he: 'לעמוד הבית', en: 'Home page' },
  'legal.notfound.docTitle': { he: 'העמוד לא נמצא | SELÈ STUDIO', en: 'Page not found | SELÈ STUDIO' },
  'legal.notfound.desc': { he: 'הדלת הזו סגורה, אבל יש עוד הרבה חדרים.', en: 'This door is closed, but there are plenty of other rooms.' },
  'legal.notfound.ogAlt': { he: 'SELÈ STUDIO — אדריכלות ועיצוב פנים', en: 'SELÈ STUDIO — architecture and interior design' },
};
const PROSE = {
  'prose.section.materials': { he: 'חומרים ופרטים', en: 'Materials & details' },
  'prose.toc.label': { he: 'בעמוד הזה', en: 'On this page' },
  'prose.meta.by': { he: 'מאת', en: 'By' },
  'prose.meta.published': { he: 'פורסם', en: 'Published' },
};
const HE_SENT = 'מטבח טוב מתחיל בהקשבה לאופן שבו אתם מבשלים, מארחים ומנקים, ורק אחר כך בבחירת אבן, עץ ותאורה שמתאימים לבית.';
const EN_SENT = 'A good kitchen starts by listening to how you cook, host and clean, and only then to the stone, wood and light that suit the home.';
const SVC = { 'service-kitchen-design.h1': { he: 'עיצוב מטבח שמתחיל בהרגלים שלכם', en: 'Kitchen design that starts with your habits' },
  'service-kitchen-design.crumb': { he: 'עיצוב מטבח', en: 'Kitchen design' },
  'service-kitchen-design.alt': { he: 'מטבח עם אי אבן ונגרות אלון בהיר, נישה מוארת וענפי זית באור שמש', en: 'A kitchen with a stone island and light-oak joinery, a lit niche and olive branches in sunlight' },
  'service-kitchen-design.h2': { he: 'מה כולל תכנון מטבח', en: 'What kitchen planning includes' },
  'service-kitchen-design.faqH': { he: 'שאלות נפוצות על עיצוב מטבח', en: 'Kitchen design FAQ' },
  'service-kitchen-design.q0': { he: 'כמה מקום צריך בשביל אי במטבח?', en: 'How much space does a kitchen island need?' },
  'service-kitchen-design.a0': { he: 'זה תלוי במעברים סביב האי ובאופן שבו משתמשים במטבח.', en: 'It depends on the walkways around it and how the kitchen is used.' },
  'service-kitchen-design.q1': { he: 'מתי בוחרים את האבן?', en: 'When do you choose the stone?' },
  'service-kitchen-design.a1': { he: 'אחרי שהתכנון סגור ולפני הזמנת הנגרות.', en: 'After the layout is fixed and before the joinery is ordered.' } };
for (let i = 0; i < 32; i++) SVC[`service-kitchen-design.b${i}`] = { he: HE_SENT, en: EN_SENT };
const JOURNAL = { 'journal.h1': { he: 'מגזין עיצוב פנים', en: 'Interior design journal' },
  'journal.card': { he: 'טרוורטין: המדריך', en: 'Travertine: the guide' } };
const ART = { 'journal-travertine-guide.h1': { he: 'טרוורטין בבית: המדריך המלא', en: 'Travertine at home: the complete guide' },
  'journal-travertine-guide.crumb': { he: 'טרוורטין', en: 'Travertine' },
  'journal-travertine-guide.date': { he: '1 באוקטובר 2026', en: 'October 1, 2026' },
  'journal-travertine-guide.alt': { he: 'חדר רחצה עם משטח כפול מטרוורטין ומראות מוארות מאחור', en: 'A bathroom with a double travertine vanity and backlit mirrors' },
  'journal-travertine-guide.h2': { he: 'מהו טרוורטין', en: 'What travertine is' },
  'journal-travertine-guide.p': { he: 'אבן גיר נקבובית עם גוון חם.', en: 'A porous limestone with a warm tone.' },
  'journal-travertine-guide.faqH': { he: 'שאלות נפוצות על טרוורטין', en: 'Travertine FAQ' },
  'journal-travertine-guide.q0': { he: 'האם טרוורטין מתאים למקלחת?', en: 'Is travertine suitable for a shower?' },
  'journal-travertine-guide.a0': { he: 'כן, כשהוא ממולא ואטום כראוי.', en: 'Yes, when it is filled and sealed properly.' } };

const dictModule = (o) => `export default ${JSON.stringify(o, null, 1)};\n`;

function chrome({ langHref, bilingual = false }) {
  return {
    top: `  <a class="skip-link" href="#main" data-i18n="common.skip">דילוג לתוכן</a>
  <header class="site-header">
    <nav aria-label="ניווט ראשי" data-i18n-attr="aria-label:common.nav.aria">
      <a href="/projects/" data-i18n="common.nav.projects">פרויקטים</a>
      <a href="/services/" data-i18n="common.nav.services">שירותים</a>
      <a href="/journal/" data-i18n="common.nav.journal">מגזין</a>
    </nav>
    <a class="menu-btn" href="#footer-nav" role="button"><span data-i18n="common.menu.open">תפריט</span></a>
    <a class="lang-toggle" href="${langHref}" hreflang="en" lang="en" dir="ltr" aria-label="EN, English version" data-lang-switch>EN</a>
  </header>
  <div class="lang-pill" hidden data-lang-pill><a class="lang-pill__link" href="${langHref}" hreflang="en" lang="en" dir="ltr" data-lang-switch="pill">English version →</a><button type="button" aria-label="סגירת ההצעה" data-i18n-attr="aria-label:common.lang.pillClose">×</button></div>
  <div class="site-menu" role="dialog" hidden><h2 data-i18n="common.menu.title">תפריט האתר</h2></div>`,
    foot: `  <footer class="site-footer" id="footer-nav"><p data-i18n-html="common.footer.entity"><bdi lang="en">SELÈ STUDIO</bdi> הוא סטודיו בוטיק לאדריכלות ועיצוב פנים בישראל.</p>
    <p><a href="mailto:office@sele-studio.com"><span lang="en">office@sele-studio.com</span></a> · <a href="/favicon.ico"><span lang="en">ico</span></a></p></footer>`,
    bilingual,
  };
}

function crumbsHtml(items) {
  if (!items) return '';
  const li = items.map((c, i) => (i < items.length - 1
    ? `<li class="crumbs__item"><a href="${c.href}" data-i18n="${c.key}">${c.he}</a></li>`
    : `<li class="crumbs__item"><span aria-current="page" data-i18n="${c.key}">${c.he}</span></li>`)).join('');
  return `    <nav class="crumbs label" aria-label="מיקום באתר" data-i18n-attr="aria-label:common.breadcrumb.aria"><ol class="crumbs__list">${li}</ol></nav>\n`;
}
const HOME_C = { href: '/', key: 'common.crumb.home', he: 'ראשי' };
const PROJ_C = { href: '/projects/', key: 'common.nav.projects', he: 'פרויקטים' };

function page({ rel, pageId, dict, build = null, nav = 'none', crumbs = null, main, headExtra = '', bilingual = false }) {
  const url = rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? '/' + rel.slice(0, -10) : '/' + rel;
  const langHref = rel === 'index.html' || rel.endsWith('/index.html') ? '/en' + url : '/en/';
  const c = chrome({ langHref, bilingual });
  return `<!DOCTYPE html>
<html lang="he" dir="rtl"${bilingual ? ' data-bilingual' : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <!-- @seo -->
  <title>SELÈ STUDIO</title>
  <!-- /@seo -->
  <!-- @partial:head -->
<script>${BOOT}</script>
<link rel="preload" href="/assets/fonts/frank-ruhl-libre-hebrew.woff2" as="font" type="font/woff2" crossorigin data-font-en="/assets/fonts/bodoni-moda-latin.woff2">
<link rel="preload" href="/assets/fonts/assistant-hebrew.woff2" as="font" type="font/woff2" crossorigin data-font-en="/assets/fonts/jost-latin.woff2">
  <!-- /@partial:head -->
${headExtra}</head>
<body data-page="${pageId}" data-i18n-dict="${dict}"${build ? ` data-i18n-build="${build}"` : ''} data-nav="${nav}">
${c.top}
  <main id="main" tabindex="-1">
${crumbsHtml(crumbs)}${main}
  </main>
${c.foot}
</body>
</html>
`;
}

const IMG = (src, w, h, alt, key, extra = '') => `<img src="${src}" width="${w}" height="${h}" alt="${alt}" data-i18n-attr="alt:${key}"${extra}>`;

function fixturePages() {
  const P = {};
  P['index.html'] = page({ rel: 'index.html', pageId: 'home', dict: 'home', nav: 'home',
    headExtra: `  <link rel="preload" as="image" href="/assets/img/kitchen-stone-01.jpg" media="(max-width: 767px)" fetchpriority="high">
  <link rel="preload" as="image" href="/assets/img/kitchen-stone-01.jpg" media="(min-width: 768px)" fetchpriority="high">
`,
    main: `    <h1 data-i18n="home.h1">סטודיו לאדריכלות ועיצוב פנים</h1>
    <section hidden><h3 data-i18n="home.hiddenH3">כותרת במקטע מוסתר</h3></section>
    <a class="skip-seq" href="#home-after" data-i18n="home.skip">דילוג על הרצף</a>
    <figure class="frame"><picture>${IMG('/assets/img/kitchen-stone-01.jpg', 1312, 1199, 'מטבח עם אי אבן, נגרות אלון עד התקרה ונישה מוארת בקיר האבן', 'home.hero.alt', ' fetchpriority="high"')}</picture><figcaption class="caption"><span class="caption__status" data-i18n="common.status.render">הדמיה</span><span class="caption__text" data-i18n="home.hero.caption">חזית המטבח.</span></figcaption></figure>
    <h2 id="home-after" data-i18n="home.works.h2">עבודות נבחרות</h2>
    <p><bdi lang="en" data-i18n="home.titleAlt">The Stone Kitchen</bdi></p>
    <p data-i18n-html="home.note">טקסט עם <bdi lang="en">SELÈ STUDIO</bdi> ו<a href="/film/?ref=home#top">סרט קצר</a>.</p>
    <p data-i18n-tpl="home.count" data-i18n-init="home.count.init">5 חללים מוצגים</p>
    <ul>
      <li><a href="/projects/stone-oak-kitchen/" data-i18n="home.case1">מטבח האבן</a></li>
      <li><a href="/film/?ref=home#top" data-i18n="home.film">סרט קצר</a></li>
      <li><a href="/services/kitchen-design/" data-i18n="common.svc.kitchen">עיצוב מטבח</a></li>
      <li><a href="/journal/travertine-guide/" data-i18n="home.article">מדריך טרוורטין</a></li>
    </ul>
    <p hidden data-owner="entity"><span data-i18n="home.entityLabel">הגוף המשפטי:</span> <span>ס.ס. סטודיו בע"מ</span></p>
    <form action="https://formsubmit.co/office@sele-studio.com" method="post"><input type="hidden" name="_next" value="https://sele-studio.com/contact/thanks/"></form>` });
  P['projects/index.html'] = page({ rel: 'projects/index.html', pageId: 'projects', dict: 'projects', nav: 'projects',
    crumbs: [HOME_C, { ...PROJ_C }],
    main: `    <h1 data-i18n="projects.index.h1">פרויקטים נבחרים</h1>
    <ul><li><a href="/projects/stone-oak-kitchen/" data-i18n="projects.stone-oak-kitchen.title">מטבח האבן</a></li>
    <li><a href="/projects/dark-oak-kitchen/" data-i18n="projects.dark-oak-kitchen.title">מטבח באלון כהה</a></li></ul>
    <a class="link" href="/film/" data-i18n="projects.index.film">סרט קצר מתוך העבודות</a>` });
  P['projects/stone-oak-kitchen/index.html'] = page({ rel: 'projects/stone-oak-kitchen/index.html', pageId: 'case', dict: 'projects', nav: 'projects',
    headExtra: '  <link rel="preload" as="image" href="/assets/img/kitchen-stone-01.jpg" fetchpriority="high">\n',
    crumbs: [HOME_C, PROJ_C, { key: 'projects.stone-oak-kitchen.title', he: 'מטבח האבן' }],
    main: `    <figure class="frame flat">${IMG('/assets/img/kitchen-stone-01.jpg', 1312, 1199, 'מטבח במבט חזיתי: אי מאבן עורקית ונגרות אלון בהיר עד התקרה. הדמיה.', 'projects.stone-oak-kitchen.alt', ' fetchpriority="high"')}</figure>
    <h1><span data-i18n="projects.stone-oak-kitchen.title">מטבח האבן</span><span class="h1-sub" data-i18n="projects.stone-oak-kitchen.h1Sub">מטבח עם אי אבן ונגרות אלון</span></h1>
    <figure class="frame arch" id="pl-2">${IMG('/assets/img/kitchen-stone-02.jpg', 1312, 1199, 'האי במבט אלכסוני עם אור שמש על המשטח', 'projects.stone-oak-kitchen.plateAlt', ' loading="lazy"')}<figcaption class="caption"><span class="caption__status" data-i18n="common.status.render">הדמיה</span><span class="caption__text" data-i18n="projects.stone-oak-kitchen.plateCaption">האי באלכסון.</span></figcaption></figure>
    <p><a href="/film/" data-i18n="projects.index.film">סרט קצר מתוך העבודות</a></p>` });
  P['projects/dark-oak-kitchen/index.html'] = page({ rel: 'projects/dark-oak-kitchen/index.html', pageId: 'case', dict: 'projects', nav: 'projects',
    crumbs: [HOME_C, PROJ_C, { key: 'projects.dark-oak-kitchen.title', he: 'מטבח באלון כהה' }],
    main: `    <h1 data-i18n="projects.dark-oak-kitchen.title">מטבח באלון כהה</h1>
    <figure class="frame arch">${IMG('/assets/img/kitchen-dark-01.jpg', 1023, 1537, 'פינת מטבח באלון כהה עם כיור אבן אינטגרלי ומדפים מוארים', 'projects.dark-oak-kitchen.alt', ' loading="lazy"')}</figure>` });
  P['film/index.html'] = page({ rel: 'film/index.html', pageId: 'film', dict: 'film', nav: 'projects',
    crumbs: [HOME_C, PROJ_C, { key: 'film.crumb', he: 'סרט הסטודיו' }],
    main: `    <h1 data-i18n="film.h1">סרט קצר מתוך העבודות</h1>
    <p id="fm-lead" data-i18n="film.lead">סרט שקט שנבנה מהדמיות התכנון של הסטודיו.</p>
    <video controls playsinline preload="none" width="1600" height="900" poster="/assets/video/hero-16x9-poster.jpg" aria-label="סרט הסטודיו: מבט על העבודות" data-i18n-attr="aria-label:film.videoLabel"><source src="/assets/video/hero-16x9.mp4" type="video/mp4"></video>
    <p><a href="/projects/stone-oak-kitchen/" data-i18n="film.link">מטבח האבן</a></p>` });
  P['services/index.html'] = page({ rel: 'services/index.html', pageId: 'services', dict: 'services', nav: 'services',
    crumbs: [HOME_C, { href: '/services/', key: 'common.nav.services', he: 'שירותים' }],
    main: `    <h1 data-i18n="services.h1">שירותי עיצוב פנים, מהתכנון ועד הסטיילינג</h1>
    <ol><li><a href="/services/kitchen-design/"><span data-i18n="common.svc.kitchen">עיצוב מטבח</span></a></li></ol>` });
  const S = (k) => SVC[`service-kitchen-design.${k}`].he;
  const paras = Array.from({ length: 32 }, (_, i) => `    <p data-i18n="service-kitchen-design.b${i}">${HE_SENT}</p>`).join('\n');
  P['services/kitchen-design/index.html'] = page({ rel: 'services/kitchen-design/index.html', pageId: 'service', dict: 'prose', build: 'service-kitchen-design', nav: 'services',
    headExtra: '  <link rel="preload" as="image" href="/assets/img/kitchen-stone-02.jpg" fetchpriority="high">\n',
    crumbs: [HOME_C, { href: '/services/', key: 'common.nav.services', he: 'שירותים' }, { key: 'service-kitchen-design.crumb', he: S('crumb') }],
    main: `    <h1 class="pr-h1" data-i18n="service-kitchen-design.h1">${S('h1')}</h1>
    <figure class="frame arch-door pr-hero">${IMG('/assets/img/kitchen-stone-02.jpg', 1312, 1199, S('alt'), 'service-kitchen-design.alt', ' fetchpriority="high"')}<figcaption class="caption"><span class="caption__status" data-i18n="common.status.render">הדמיה</span></figcaption></figure>
    <h2 id="what-kitchen-planning-includes" data-i18n="service-kitchen-design.h2">${S('h2')}</h2>
${paras}
    <section class="pr-faq" id="pr-faq" aria-labelledby="pr-faq-h">
      <h2 id="pr-faq-h" data-i18n="service-kitchen-design.faqH">${S('faqH')}</h2>
      <details class="pr-faq__item" data-faq-item open><summary class="pr-faq__q"><h3 data-faq-q data-i18n="service-kitchen-design.q0">${S('q0')}</h3></summary><div class="pr-faq__a" data-faq-a><p data-i18n="service-kitchen-design.a0">${S('a0')}</p></div></details>
      <details class="pr-faq__item" data-faq-item><summary class="pr-faq__q"><h3 data-faq-q data-i18n="service-kitchen-design.q1">${S('q1')}</h3></summary><div class="pr-faq__a" data-faq-a><p data-i18n="service-kitchen-design.a1">${S('a1')}</p></div></details>
    </section>` });
  P['journal/index.html'] = page({ rel: 'journal/index.html', pageId: 'journal', dict: 'prose', build: 'journal', nav: 'journal',
    crumbs: [HOME_C, { key: 'common.nav.journal', he: 'מגזין' }],
    main: `    <h1 class="pr-h1" data-i18n="journal.h1">מגזין עיצוב פנים</h1>
    <h2 data-i18n="prose.section.materials">חומרים ופרטים</h2>
    <ul class="pr-cards" role="list"><li class="pr-card"><a class="pr-card__link" href="/journal/travertine-guide/"><h3 class="pr-card__title" data-i18n="journal.card">טרוורטין: המדריך</h3></a></li></ul>` });
  const A = (k) => ART[`journal-travertine-guide.${k}`].he;
  P['journal/travertine-guide/index.html'] = page({ rel: 'journal/travertine-guide/index.html', pageId: 'article', dict: 'prose', build: 'journal-travertine-guide', nav: 'journal',
    crumbs: [HOME_C, { href: '/journal/', key: 'common.nav.journal', he: 'מגזין' }, { key: 'journal-travertine-guide.crumb', he: A('crumb') }],
    main: `    <h1 class="pr-h1" data-i18n="journal-travertine-guide.h1">${A('h1')}</h1>
    <p class="pr-meta label"><span data-i18n="prose.meta.by">מאת</span> <bdi lang="en">SELÈ STUDIO</bdi> · <span data-i18n="prose.section.materials">חומרים ופרטים</span> · <span data-i18n="prose.meta.published">פורסם</span> <time datetime="2026-10-01" data-i18n="journal-travertine-guide.date">${A('date')}</time></p>
    <figure class="frame arch-door pr-hero">${IMG('/assets/img/bath-01.jpg', 1132, 1390, A('alt'), 'journal-travertine-guide.alt', ' fetchpriority="high"')}</figure>
    <nav class="pr-toc"><p class="label" data-i18n="prose.toc.label">בעמוד הזה</p><ol><li><a href="#what-travertine-is" data-i18n="journal-travertine-guide.h2">${A('h2')}</a></li></ol></nav>
    <h2 id="what-travertine-is" data-i18n="journal-travertine-guide.h2">${A('h2')}</h2>
    <p data-i18n="journal-travertine-guide.p">${A('p')}</p>
    <section class="pr-faq" aria-labelledby="pr-faq-h"><h2 id="pr-faq-h" data-i18n="journal-travertine-guide.faqH">${A('faqH')}</h2>
      <details class="pr-faq__item" data-faq-item open><summary><h3 data-faq-q data-i18n="journal-travertine-guide.q0">${A('q0')}</h3></summary><div data-faq-a><p data-i18n="journal-travertine-guide.a0">${A('a0')}</p></div></details>
    </section>` });
  P['404.html'] = page({ rel: '404.html', pageId: 'notfound', dict: 'legal', bilingual: true,
    main: `    <h1 data-i18n="legal.notfound.h1">הדלת הזו סגורה</h1>
    <p><a href="/" data-i18n="legal.notfound.home">לעמוד הבית</a> · <a href="/projects/" data-i18n="common.nav.projects">פרויקטים</a></p>` });
  return P;
}

const PROSE_REGISTRY = [
  { meta: { id: 'service-kitchen-design', path: '/services/kitchen-design/', type: 'service',
    crumb: { he: 'עיצוב מטבח', en: 'Kitchen design' },
    title: { he: 'עיצוב מטבח ותכנון מטבח בהתאמה אישית | SELÈ STUDIO', en: 'Kitchen Design and Planning in Israel | SELÈ STUDIO' },
    desc: { he: 'עיצוב מטבח מדויק: חלוקה וזרימה, נגרות בהתאמה אישית, אבן ומשטחים ותאורה משולבת, מתוכננים סביב ההרגלים שלכם בבית. ספרו לנו על המטבח.', en: 'Kitchen design in Israel: layout and flow, custom joinery, stone worktops and integrated light, planned around how you live. Tell us about your kitchen.' },
    h1: { he: SVC['service-kitchen-design.h1'].he, en: SVC['service-kitchen-design.h1'].en },
    og: '/assets/img/og/og-service-kitchen-design.jpg', ogAlt: { he: 'מטבח עם אי אבן', en: 'A kitchen with a stone island' },
    service: { name: { he: 'עיצוב מטבח', en: 'Kitchen design' } }, requires: [], index: true },
  file: 'services/kitchen-design/index.html', crumbs: ['home', 'services'] },
  { meta: { id: 'journal', path: '/journal/', type: 'journal', crumb: { he: 'מגזין', en: 'Journal' },
    title: { he: 'מגזין עיצוב פנים – מדריכים לבית ולשיפוץ | SELÈ STUDIO', en: 'Interior Design Journal – Practical Guides | SELÈ STUDIO' },
    desc: { he: 'מדריכים מעשיים לעיצוב הבית מתוך עבודת SELÈ STUDIO: אבן למטבח, טרוורטין, תאורה ונגרות, וכל מה שכדאי לדעת לפני שבוחרים מעצבת פנים.', en: 'Practical home design guides from SELÈ STUDIO: kitchen stone, travertine, lighting and joinery, and what to know before you hire an interior designer.' },
    og: '/assets/img/og/og-journal.jpg', ogAlt: { he: 'פרט סטיילינג בספריית אלון', en: 'Styling detail on oak shelving' }, index: true },
  file: 'journal/index.html', crumbs: ['home'], collection: ['journal-travertine-guide'] },
  { meta: { id: 'journal-travertine-guide', path: '/journal/travertine-guide/', type: 'article',
    crumb: { he: 'טרוורטין', en: 'Travertine' },
    title: { he: 'טרוורטין בבית: חדר רחצה, רצפה וחיפוי | SELÈ STUDIO', en: 'Travertine at Home: Bathrooms, Floors and Walls | SELÈ STUDIO' },
    desc: { he: 'טרוורטין בבית: מה ההבדל בין מילוי לגימור פתוח, איפה הוא מתאים ואיפה פחות, ואיך שומרים עליו בחדר הרחצה ובמטבח לאורך השנים.', en: 'Travertine at home: filled or open finishes, where it works and where it does not, and how to care for it in bathrooms and kitchens over the years.' },
    h1: { he: ART['journal-travertine-guide.h1'].he, en: ART['journal-travertine-guide.h1'].en },
    og: '/assets/img/og/og-journal-travertine-guide.jpg', ogAlt: { he: 'חדר רחצה בטרוורטין', en: 'A travertine bathroom' },
    article: { section: 'materials', service: 'bathroom-design', author: 'org', published: null, modified: null }, index: true },
  file: 'journal/travertine-guide/index.html', crumbs: ['home', 'journal'] },
];

const PROJECTS_MJS = `export default ${JSON.stringify(['stone-oak-kitchen', 'oak-living-room', 'travertine-bathroom', 'dark-oak-bedroom', 'dark-oak-kitchen'].map((slug) => ({
  slug,
  title: slug === 'stone-oak-kitchen' ? PROJECTS['projects.stone-oak-kitchen.title'] : slug === 'dark-oak-kitchen' ? PROJECTS['projects.dark-oak-kitchen.title'] : { he: `חלל ${slug.length}`, en: slug },
  materials: { he: 'אבן עורקית, אלון בהיר, פלדה מוברשת', en: 'Veined stone, light oak, brushed steel' },
  hero: { alt: slug === 'stone-oak-kitchen' ? PROJECTS['projects.stone-oak-kitchen.alt'] : { he: 'חלל מגורים', en: 'A living space' } },
  builtPairConfirmed: false,
})), null, 1)};\n`;

function write(root, rel, text) { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); }

/** a fresh fixture tree (Hebrew sources only) */
function buildFixture(dir, { site = {} } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [rel, html] of Object.entries(fixturePages())) write(dir, rel, html);
  write(dir, 'js/i18n/common.js', dictModule(COMMON));
  write(dir, 'js/i18n/home.js', dictModule(HOME));
  write(dir, 'js/i18n/projects.js', dictModule(PROJECTS));
  write(dir, 'js/i18n/film.js', dictModule(FILM));
  write(dir, 'js/i18n/services.js', dictModule(SERVICES));
  write(dir, 'js/i18n/legal.js', dictModule(LEGAL));
  write(dir, 'js/i18n/prose.js', dictModule(PROSE));
  write(dir, 'data/i18n/service-kitchen-design.json', JSON.stringify(SVC, null, 1));
  write(dir, 'data/i18n/journal.json', JSON.stringify(JOURNAL, null, 1));
  write(dir, 'data/i18n/journal-travertine-guide.json', JSON.stringify(ART, null, 1));
  write(dir, 'data/prose-registry.json', JSON.stringify(PROSE_REGISTRY, null, 1));
  write(dir, 'data/projects.mjs', PROJECTS_MJS);
  fs.copyFileSync(path.join(REPO, 'data/seo.mjs'), path.join(dir, 'data/seo.mjs'));
  write(dir, 'data/site.json', JSON.stringify({ ...core.SITE_DEFAULTS, launchDate: '2026-10-01', ...site }, null, 1));
  for (const f of ['assets/img/kitchen-stone-01.jpg', 'assets/img/kitchen-stone-02.jpg', 'assets/img/kitchen-dark-01.jpg', 'assets/img/bath-01.jpg', 'favicon.ico']) write(dir, f, 'x');
  return dir;
}

async function pipeline(dir, opts = {}) {
  const g = await genEn.run({ root: dir, quiet: true });
  const s = await seo.run({ root: dir, quiet: true, ...opts });
  return { g, s };
}
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const ldOf = (html) => {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
};
const HE_PAGES = Object.keys(fixturePages());
const EN_PAGES = HE_PAGES.filter((r) => r !== '404.html').map((r) => 'en/' + r);
const INDEXABLE = ['index.html', 'projects/index.html', 'projects/stone-oak-kitchen/index.html', 'film/index.html', 'services/index.html',
  'services/kitchen-design/index.html', 'journal/index.html', 'journal/travertine-guide/index.html'];

// ================================================================== positive fixture
const POS = buildFixture(newDir('positive'));
const first = await pipeline(POS);

test('positive fixture: gen-en and seo run with 0 errors (release mode, launchDate set)', () => {
  assert.deepEqual(first.g.errors, [], first.g.errors.join('\n'));
  assert.deepEqual(first.s.errors, [], first.s.errors.join('\n'));
  assert.equal(first.g.pages.length, EN_PAGES.length);
  for (const rel of EN_PAGES) assert.ok(fs.existsSync(path.join(POS, rel)), rel);
  assert.ok(!fs.existsSync(path.join(POS, 'en/404.html')), 'no en/404.html');
});

test('EN output: lang/dir, no Hebrew leak, translated text, bdi and data-i18n-html rules, tpl init, owner span', () => {
  for (const rel of EN_PAGES) {
    const $ = cheerio.load(read(POS, rel));
    assert.equal($('html').attr('lang'), 'en', rel);
    assert.equal($('html').attr('dir'), 'ltr', rel);
    assert.deepEqual(genEn.hebrewLeaks($), [], rel);
  }
  const $ = cheerio.load(read(POS, 'en/index.html'));
  assert.equal($('h1').text(), 'Architecture and interior design studio');
  assert.equal($('.menu-btn span').text(), 'Menu', 'no-JS EN visitors see "Menu"');
  const bdi = $('[data-i18n="home.titleAlt"]');
  assert.equal(bdi.text(), 'מטבח האבן'); assert.equal(bdi.attr('lang'), 'he');
  const note = $('[data-i18n-html="home.note"]');
  assert.equal(note.attr('lang'), undefined, 'no lang on the data-i18n-html element');
  assert.equal(note.find('bdi[lang="he"]').text(), "ג'פנדי");
  assert.equal($('[data-i18n-init="home.count.init"]').text(), '5 spaces shown');
  assert.equal($('img[data-i18n-attr="alt:home.hero.alt"]').attr('alt'), HOME['home.hero.alt'].en);
  assert.equal($('[data-owner] span').last().text(), 'ס.ס. סטודיו בע"מ', 'owner value untouched and exempt from the lint');
});

test('EN output: links rewritten, _next, language links, font swap', () => {
  const $ = cheerio.load(read(POS, 'en/index.html'));
  const hrefs = $('a[href]').map((_, a) => $(a).attr('href')).get();
  assert.ok(hrefs.includes('/en/projects/') && hrefs.includes('/en/projects/stone-oak-kitchen/'));
  assert.ok(hrefs.includes('/en/film/?ref=home#top'), 'query + fragment kept');
  assert.ok(hrefs.includes('#main') && hrefs.includes('#footer-nav') && hrefs.includes('#home-after'), 'fragments untouched');
  assert.ok(hrefs.includes('mailto:office@sele-studio.com') && hrefs.includes('/favicon.ico'), 'mailto and files untouched');
  assert.ok(!hrefs.some((h) => /^\/(projects|film|services|journal)\//.test(h)), 'no un-prefixed page link left');
  assert.equal($('input[name="_next"]').attr('value'), 'https://sele-studio.com/en/contact/thanks/');
  const tog = $('.lang-toggle');
  assert.deepEqual([tog.attr('href'), tog.attr('hreflang'), tog.attr('lang'), tog.attr('dir'), tog.text(), tog.attr('aria-label')], ['/', 'he', 'he', 'rtl', 'עב', 'עב, גרסה עברית']);
  const pill = $('[data-lang-switch="pill"]');
  assert.deepEqual([pill.attr('href'), pill.attr('lang'), pill.attr('dir'), pill.text()], ['/', 'he', 'rtl', 'לגרסה העברית ←']);
  const $c = cheerio.load(read(POS, 'en/projects/stone-oak-kitchen/index.html'));
  assert.equal($c('.lang-toggle').attr('href'), '/projects/stone-oak-kitchen/');
  const pre = $('link[rel="preload"][as="font"]').map((_, l) => $(l).attr('href')).get();
  assert.deepEqual(pre, ['/assets/fonts/bodoni-moda-latin.woff2', '/assets/fonts/jost-latin.woff2']);
});

test('EN output: the inline boot script is byte-identical (CSP hash unaffected)', () => {
  const h = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('base64');
  for (const rel of HE_PAGES.filter((r) => r !== '404.html')) {
    const he = read(POS, rel).match(/<script>([\s\S]*?)<\/script>/)[1];
    const en = read(POS, 'en/' + rel).match(/<script>([\s\S]*?)<\/script>/)[1];
    assert.equal(en, BOOT, rel); assert.equal(he, BOOT, rel);
    assert.equal(h(en), h(BOOT));
  }
});

test('idempotent: gen-en --check and seo --check exit clean; a second full run changes no byte', async () => {
  const snap = () => Object.fromEntries([...HE_PAGES, ...EN_PAGES, 'sitemap.xml', 'llms.txt', 'data/lastmod.json'].map((r) => [r, read(POS, r)]));
  const before = snap();
  const gc = await genEn.run({ root: POS, check: true, quiet: true });
  assert.deepEqual([gc.changed, gc.deleted, gc.errors], [[], [], []]);
  const sc = await seo.run({ root: POS, check: true, quiet: true });
  assert.deepEqual([sc.changed, sc.errors], [[], []]);
  await pipeline(POS);
  const after = snap();
  for (const k of Object.keys(before)) assert.equal(after[k], before[k], `${k} changed on a second run`);
  // the CLIs agree
  const env = { ...process.env, SELE_TODAY: '2026-09-28' };
  execFileSync(process.execPath, [path.join(REPO, 'tools/gen-en.mjs'), '--root', POS, '--check'], { env, stdio: 'pipe' });
  execFileSync(process.execPath, [path.join(REPO, 'tools/seo.mjs'), '--root', POS, '--check'], { env, stdio: 'pipe' });
  // a later day with unchanged content keeps every lastmod
  const later = await seo.run({ root: POS, check: true, quiet: true });
  process.env.SELE_TODAY = '2026-12-31';
  const later2 = await seo.run({ root: POS, check: true, quiet: true });
  process.env.SELE_TODAY = '2026-09-28';
  assert.deepEqual([later.changed, later2.changed], [[], []], 'lastmod is content-hashed, never the build date');
});

test('@seo block: title/description/robots/canonical/hreflang/OG/Twitter per language; 404 has no canonical, hreflang or JSON-LD', () => {
  const reg = first.s.registry;
  for (const rel of [...HE_PAGES, ...EN_PAGES]) {
    const lang = rel.startsWith('en/') ? 'en' : 'he';
    const heRel = rel.replace(/^en\//, '');
    const meta = reg.pages.find((m) => m.file === heRel);
    const $ = cheerio.load(read(POS, rel));
    assert.equal($('head title').text(), core.pick(meta.title, lang), rel);
    assert.equal($('meta[name="description"]').attr('content'), core.pick(meta.desc, lang), rel);
    if (meta.type === '404') {
      assert.equal($('link[rel="canonical"]').length, 0); assert.equal($('link[hreflang]').length, 0);
      assert.equal($('script[type="application/ld+json"]').length, 0);
      assert.match($('meta[name="robots"]').attr('content'), /noindex/);
      continue;
    }
    const self = core.urlFor(meta.path, lang);
    assert.equal($('link[rel="canonical"]').attr('href'), self, rel);
    assert.equal($('meta[property="og:url"]').attr('content'), self);
    assert.equal($('meta[property="og:locale"]').attr('content'), lang === 'he' ? 'he_IL' : 'en_US');
    assert.equal($('meta[property="og:image:width"]').attr('content'), '1200');
    assert.equal($('meta[name="twitter:card"]').attr('content'), 'summary_large_image');
    if (meta.type === 'article') assert.equal($('meta[property="og:type"]').attr('content'), 'article');
    if (core.isIndexable(meta)) {
      assert.match($('meta[name="robots"]').attr('content'), /^index, follow, max-image-preview:large/);
      const alt = Object.fromEntries($('link[rel="alternate"][hreflang]').map((_, l) => [[$(l).attr('hreflang'), $(l).attr('href')]]).get());
      assert.deepEqual(alt, { 'he-IL': core.urlFor(meta.path, 'he'), en: core.urlFor(meta.path, 'en'), 'x-default': core.urlFor(meta.path, 'he') }, rel);
    } else {
      assert.equal($('meta[name="robots"]').attr('content'), 'noindex, follow', rel);
      assert.equal($('link[rel="alternate"][hreflang]').length, 0, `${rel}: no hreflang on noindex`);
    }
  }
});

test('hreflang is reciprocal across every HE/EN pair', () => {
  for (const rel of INDEXABLE) {
    const set = (r) => cheerio.load(read(POS, r))('link[rel="alternate"][hreflang]').map((_, l) => `${l.attribs.hreflang}=${l.attribs.href}`).get().sort().join('|');
    assert.equal(set(rel), set('en/' + rel), rel);
  }
});

test('JSON-LD parses; A8.4 nodes: site-wide entities everywhere, page types, FAQPage only with visible FAQ, VideoObject only on film', () => {
  for (const rel of [...HE_PAGES, ...EN_PAGES].filter((r) => !r.endsWith('404.html'))) {
    const html = read(POS, rel);
    const ld = ldOf(html);
    assert.ok(ld, rel);
    const types = ld['@graph'].map((x) => x['@type']);
    for (const t of ['WebSite', 'ProfessionalService', 'Person']) assert.ok(types.includes(t), `${rel} lacks ${t}`);
    const org = ld['@graph'].find((x) => x['@type'] === 'ProfessionalService');
    assert.equal(org['@id'], 'https://sele-studio.com/#organization');
    assert.deepEqual(org.address, { '@type': 'PostalAddress', addressCountry: 'IL' });
    for (const k of ['telephone', 'priceRange', 'aggregateRating', 'review', 'award', 'geo', 'openingHours', 'streetAddress']) assert.ok(!(k in org), `${rel} org.${k}`);
    const person = ld['@graph'].find((x) => x['@type'] === 'Person');
    assert.ok(!('hasCredential' in person) && !('knowsLanguage' in person));
    const faqVisible = cheerio.load(html)('[data-faq-q]').length;
    const faq = ld['@graph'].find((x) => x['@type'] === 'FAQPage');
    assert.equal(!!faq, faqVisible > 0, `${rel}: FAQPage iff visible FAQ`);
    if (faq) assert.equal(faq.mainEntity.length, faqVisible);
    assert.equal(types.includes('VideoObject'), rel.replace(/^en\//, '') === 'film/index.html', `${rel}: VideoObject only on /film/`);
  }
  const g = (rel) => ldOf(read(POS, rel))['@graph'];
  assert.ok(g('projects/stone-oak-kitchen/index.html').some((x) => x['@type'] === 'ItemPage'));
  const work = g('projects/stone-oak-kitchen/index.html').find((x) => x['@type'] === 'CreativeWork');
  assert.deepEqual(work.material, ['אבן עורקית', 'אלון בהיר', 'פלדה מוברשת']);
  assert.ok(work.image.every((im) => /הדמיה/.test(im.caption)), 'captions carry הדמיה');
  assert.ok(g('services/kitchen-design/index.html').some((x) => x['@type'] === 'Service' && x.name === 'עיצוב מטבח'));
  const hub = g('services/index.html').find((x) => x['@type'] === 'CollectionPage');
  assert.deepEqual(hub.mainEntity.itemListElement.map((i) => i.url), ['https://sele-studio.com/services/kitchen-design/']);
  const video = g('en/film/index.html').find((x) => x['@type'] === 'VideoObject');
  assert.equal(video.name, FILM['film.videoLabel'].en);
  assert.equal(video.uploadDate, '2026-10-01T12:00:00+03:00');
  assert.equal(video.duration, 'PT21.5S');
  const post = g('journal/travertine-guide/index.html').find((x) => x['@type'] === 'BlogPosting');
  assert.equal(post.datePublished, '2026-10-01');
  assert.equal(post.author['@id'], 'https://sele-studio.com/#organization');
  assert.equal(post.articleSection, 'חומרים ופרטים');
});

test('BlogPosting author rule: #organization unless the article id is in confirm.shohamByline', () => {
  const meta = { id: 'journal-x', path: '/journal/x/', type: 'article', title: { he: 'א', en: 'a' }, desc: { he: 'א', en: 'a' } };
  const x = { published: '2026-10-01' };
  const author = (byline) => core.graphFor(meta, 'he', x, { ...core.SITE_DEFAULTS, confirm: { ...core.SITE_DEFAULTS.confirm, shohamByline: byline } })['@graph'].find((n) => n['@type'] === 'BlogPosting').author['@id'];
  assert.equal(author([]), 'https://sele-studio.com/#organization');
  assert.equal(author(['journal-x']), 'https://sele-studio.com/#shoham-sela');
});

test('BreadcrumbList equals the visible crumbs (names from the page, paths from the registry)', () => {
  for (const rel of [...HE_PAGES, ...EN_PAGES].filter((r) => !/(^|\/)index\.html$/.test(r) || !['index.html', 'en/index.html'].includes(r)).filter((r) => !r.endsWith('404.html'))) {
    const html = read(POS, rel);
    const $ = cheerio.load(html);
    const vis = $('main nav.crumbs .crumbs__item');
    const bl = ldOf(html)['@graph'].find((x) => x['@type'] === 'BreadcrumbList');
    assert.ok(bl, rel);
    assert.equal(bl.itemListElement.length, vis.length, rel);
    vis.each((i, li) => {
      assert.equal(bl.itemListElement[i].name, $(li).text().trim(), `${rel} #${i + 1}`);
      const a = $(li).find('a').attr('href');
      if (a) assert.equal(bl.itemListElement[i].item, 'https://sele-studio.com' + a, `${rel} #${i + 1}`);
    });
  }
  assert.ok(!ldOf(read(POS, 'index.html'))['@graph'].some((x) => x['@type'] === 'BreadcrumbList'), 'no crumbs on home');
});

test('sitemap.xml: valid XML, one <url> per indexable page per language, alternates, images, video only on /film/, no noindex', () => {
  const xml = read(POS, 'sitemap.xml');
  execFileSync('xmllint', ['--noout', path.join(POS, 'sitemap.xml')]);
  const $ = cheerio.load(xml, { xml: true });
  const urls = $('url');
  assert.equal(urls.length, INDEXABLE.length * 2);
  assert.ok(!/dark-oak-kitchen/.test(xml), 'noindex case excluded');
  assert.ok(!/404/.test(xml) && !/priority|changefreq/.test(xml));
  urls.each((_, u) => {
    const loc = $(u).find('loc').text();
    assert.equal($(u).find('xhtml\\:link').length, 3, loc);
    assert.match($(u).find('lastmod').text(), /^\d{4}-\d{2}-\d{2}$/);
    const hasVideo = $(u).find('video\\:video').length > 0;
    assert.equal(hasVideo, /\/film\/$/.test(loc), loc);
  });
  const home = urls.filter((_, u) => $(u).find('loc').text() === 'https://sele-studio.com/');
  assert.deepEqual(home.find('image\\:loc').map((_, l) => $(l).text()).get(), ['https://sele-studio.com/assets/img/kitchen-stone-01.jpg']);
  const film = urls.filter((_, u) => $(u).find('loc').text() === 'https://sele-studio.com/en/film/');
  assert.equal(film.find('video\\:title').text(), FILM['film.videoLabel'].en);
  assert.equal(film.find('video\\:duration').text(), '22');
  assert.equal(film.find('video\\:publication_date').text(), '2026-10-01T12:00:00+03:00');
});

test('llms.txt lists exactly the sitemap pages, per language, with the A7.3 entity statement', () => {
  const llms = read(POS, 'llms.txt');
  const locs = [...read(POS, 'sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const listed = [...llms.matchAll(/\]\((https:\/\/sele-studio\.com[^)]*)\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, locs);
  assert.ok(llms.includes(core.T.orgDesc.en) && llms.includes(core.T.orgDesc.he));
  assert.ok(!/TODO|\{\{|SERVICE_AREA/.test(llms));
});

test('null tokens / area emit nothing; set values are emitted (A8.1)', async () => {
  const home = read(POS, 'index.html');
  assert.ok(!/google-site-verification|msvalidate|TODO|addressRegion|ובסביבה|הסטודיו פועל|AdministrativeArea/.test(home));
  const org = ldOf(home)['@graph'].find((x) => x['@type'] === 'ProfessionalService');
  assert.equal(org.areaServed['@type'], 'Country');
  assert.ok(!/service area/.test(read(POS, 'llms.txt')));
  // the owner's real value (28/09/2026): central + southern Israel, two administrative districts
  const dir = buildFixture(newDir('owner-values'), { site: { gscToken: 'gsc-abc', bingToken: 'bing-xyz', serviceArea: AREA, confirm: { ...core.SITE_DEFAULTS.confirm, englishClients: true } } });
  const r = await pipeline(dir);
  assert.deepEqual(r.s.errors, []);
  const $ = cheerio.load(read(dir, 'index.html'));
  assert.equal($('meta[name="google-site-verification"]').attr('content'), 'gsc-abc');
  assert.equal($('meta[name="msvalidate.01"]').attr('content'), 'bing-xyz');
  const heTitle = 'מעצבת פנים במרכז ובדרום: עיצוב ותכנון דירות | SELÈ STUDIO';
  assert.equal($('title').text(), heTitle);
  assert.ok([...heTitle].length <= 60, 'the area title stays within 60 characters');
  assert.match($('meta[name="description"]').attr('content'), /במרכז ובדרום הארץ\.$/);
  const $en = cheerio.load(read(dir, 'en/index.html'));
  assert.equal($en('meta[name="google-site-verification"]').length, 0, 'verification on the Hebrew home only');
  assert.equal($en('title').text(), 'Interior Designer in Central & Southern Israel | SELÈ STUDIO');
  assert.match($en('meta[name="description"]').attr('content'), /central and southern Israel\.$/);
  const g = ldOf(read(dir, 'index.html'))['@graph'];
  const o = g.find((x) => x['@type'] === 'ProfessionalService');
  assert.equal(o.address.addressRegion, undefined, 'a service area is not the studio address');
  assert.deepEqual(o.areaServed.map((a) => [a['@type'], a.name, a.sameAs, a.containedInPlace.name]), [
    ['AdministrativeArea', 'מחוז המרכז', 'https://www.wikidata.org/wiki/Q188785', 'ישראל'],
    ['AdministrativeArea', 'מחוז הדרום', 'https://www.wikidata.org/wiki/Q188781', 'ישראל'],
  ]);
  assert.ok(o.description.startsWith(core.T.orgDesc.he) && o.description.endsWith(' הסטודיו פועל במרכז ובדרום הארץ.'));
  assert.equal(g.find((x) => x['@type'] === 'WebPage').name, heTitle);
  const oEn = ldOf(read(dir, 'en/index.html'))['@graph'].find((x) => x['@type'] === 'ProfessionalService');
  assert.deepEqual(oEn.areaServed.map((a) => a.name), ['Central District', 'Southern District']);
  assert.ok(oEn.description.endsWith(' The studio works in central and southern Israel.'));
  // service pages carry the same areaServed
  const svc = ldOf(read(dir, 'services/kitchen-design/index.html'))['@graph'].find((x) => x['@type'] === 'Service');
  assert.deepEqual(svc.areaServed.map((a) => a.name), ['מחוז המרכז', 'מחוז הדרום']);
  const llms = read(dir, 'llms.txt');
  assert.ok(llms.includes(core.orgDesc('en', { serviceArea: AREA })) && llms.includes('service area: central and southern Israel / המרכז והדרום (Central District / מחוז המרכז, Southern District / מחוז הדרום);'));
  assert.ok(!/\{in\}|\{he\}|\{en\}|TODO|SERVICE_AREA/.test(llms + read(dir, 'index.html') + read(dir, 'en/index.html')));
  assert.deepEqual(g.find((x) => x['@type'] === 'Person').knowsLanguage, ['he', 'en']);
});

test('service-area helpers: Hebrew locative, single-area form, owner-stated address region', () => {
  assert.equal(core.heLocative('המרכז והדרום'), 'במרכז ובדרום');
  assert.equal(core.heLocative('השרון'), 'בשרון');
  assert.equal(core.heLocative('תל אביב'), 'בתל אביב');
  const one = { serviceArea: { he: 'השרון', en: 'the Sharon', type: 'AdministrativeArea', wikidata: 'https://www.wikidata.org/wiki/Q1195437' } };
  assert.equal(core.orgDesc('he', one), `${core.T.orgDesc.he} הסטודיו פועל בשרון.`);
  assert.equal(core.orgDesc('en', one), `${core.T.orgDesc.en} The studio works in the Sharon.`);
  const meta = { type: 'home', path: '/', title: { he: 'ת', en: 'T' }, desc: { he: 'ד', en: 'D' }, titleWithArea: { he: 'מעצבת פנים {in} | SELÈ STUDIO' } };
  assert.equal(core.titleOf(meta, 'he', one), 'מעצבת פנים בשרון | SELÈ STUDIO');
  assert.equal(core.titleOf(meta, 'en', one), 'T', 'no EN variant → the plain title');
  const o = core.graphFor(meta, 'he', {}, { ...core.SITE_DEFAULTS, ...one })['@graph'].find((x) => x['@type'] === 'ProfessionalService');
  assert.deepEqual(o.areaServed.map((a) => a['@type']), ['AdministrativeArea', 'Country']);
  assert.equal(o.address.addressRegion, undefined);
  const stated = { ...core.SITE_DEFAULTS, serviceArea: { ...AREA, addressRegion: { he: 'מחוז המרכז', en: 'Central District' } } };
  assert.equal(core.graphFor(meta, 'en', {}, stated)['@graph'].find((x) => x['@type'] === 'ProfessionalService').address.addressRegion, 'Central District');
});

test('positive fixtures pass cleanly: two media preloads + one hero img, fragment/mailto/favicon links, menu h2 before h1, hidden h3 before the first h2, prose p with <bdi lang="he">', () => {
  const $ = cheerio.load(read(POS, 'index.html'));
  assert.equal($('head link[rel="preload"][fetchpriority="high"]').length, 2);
  assert.equal($('body img[fetchpriority="high"]').length, 1);
  assert.ok($('.site-menu h2').length && $('section[hidden] h3').length);
  // covered by the zero-error assertion of the pipeline above
  assert.deepEqual(first.s.errors, []);
  assert.deepEqual(first.g.errors, []);
});

test('the bilingual 404 under a simulated /en/ path (toggle + pill re-pointed to /) passes the seo lints', async () => {
  const dir = buildFixture(newDir('404-en'));
  await pipeline(dir);
  // what js/core/i18n.js → apply() does under /en/x (A3.8): lang flip, English keyed text, language links → "/"
  const $ = cheerio.load(read(dir, '404.html'));
  $('html').attr('lang', 'en').attr('dir', 'ltr');
  $('head title').text('Page not found | SELÈ STUDIO'); // A3.8 step 4: document.title from legal.notfound.docTitle
  $('[data-lang-switch]').each((_, el) => {
    $(el).attr('href', '/').attr('hreflang', 'he').attr('lang', 'he').attr('dir', 'rtl');
    if ($(el).attr('data-lang-switch') === 'pill') $(el).text('לגרסה העברית ←'); else $(el).text('עב').attr('aria-label', 'עב, גרסה עברית');
  });
  const all = { ...COMMON, ...LEGAL };
  $('[data-i18n]').each((_, el) => { $(el).text(all[$(el).attr('data-i18n')].en); });
  $('[data-i18n-html]').each((_, el) => { $(el).html(all[$(el).attr('data-i18n-html')].en); });
  $('[data-i18n-attr]').each((_, el) => { for (const p of $(el).attr('data-i18n-attr').split(';')) { const [a, k] = p.split(':'); $(el).attr(a, all[k].en); } });
  $('a[href]').each((_, a) => { const h = $(a).attr('href'); if (!$(a).is('[data-lang-switch]') && /^\/(?!en\/|assets\/)[^.]*$/.test(h.split(/[?#]/)[0])) $(a).attr('href', h === '/' ? '/en/' : '/en' + h); });
  fs.writeFileSync(path.join(dir, '404.html'), $.html());
  const s = await seo.run({ root: dir, quiet: true });
  assert.deepEqual(s.errors.filter((e) => e.startsWith('404.html')), []);
  assert.deepEqual(genEn.hebrewLeaks($), [], 'only the lang="he" links carry Hebrew');
  // the head metas are keyed too, so a shared /en/ miss previews in English (A14: no Hebrew outside lang=he)
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
    assert.equal($(sel).attr('data-i18n-attr'), 'content:legal.notfound.desc', sel);
    assert.equal($(sel).attr('content'), LEGAL['legal.notfound.desc'].en, sel);
  }
  for (const sel of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) assert.equal($(sel).attr('content'), 'Page not found | SELÈ STUDIO', sel);
  for (const sel of ['meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]']) assert.equal($(sel).attr('content'), 'SELÈ STUDIO — architecture and interior design', sel);
  assert.deepEqual($('head meta[content]').filter((_, m) => /[\u0590-\u05FF]/.test($(m).attr('content'))).map((_, m) => $(m).attr('name') || $(m).attr('property')).get(), [], 'no Hebrew head meta');
  const t = cheerio.load(read(dir, '404.html'));
  assert.deepEqual(t('[data-lang-switch]').map((_, a) => `${t(a).attr('href')}|${t(a).attr('lang')}`).get(), ['/|he', '/|he']);
});

test('an image caption never includes hidden / aria-hidden caption parts (the Studio threshold layer rule)', async () => {
  const dir = buildFixture(newDir('caption-hidden'));
  const f = path.join(dir, 'index.html');
  const src = fs.readFileSync(f, 'utf8');
  const cap = /<figcaption class="caption"><span class="caption__status"[^]*?<\/figcaption>/;
  assert.match(src, cap);
  fs.writeFileSync(f, src.replace(cap, '<figcaption class="caption"><span data-i18n="home.hero.caption">חזית המטבח.</span><span hidden aria-hidden="true" data-i18n="common.status.render">הדמיה</span></figcaption>'));
  const { s } = await pipeline(dir);
  assert.deepEqual(s.errors, []);
  const heRec = s.records.find((r) => r.file === 'index.html');
  const enRec = s.records.find((r) => r.file === 'en/index.html');
  assert.equal(heRec.x.images[0].caption, 'חזית המטבח.');
  assert.equal(enRec.x.images[0].caption, 'The kitchen front.');
  assert.ok(!/הדמיה|Visualization|Render/.test(JSON.stringify(ldOf(read(dir, 'index.html')))), 'no hidden render label in the JSON-LD');
});

// the 404 without the runtime keys: the metas stay plain (no dangling data-i18n-attr) and seo warns
test('the 404 head metas carry data-i18n-attr only for keys the legal dictionary holds', async () => {
  const dir = buildFixture(newDir('404-nokeys'));
  const { 'legal.notfound.desc': _drop, ...rest } = LEGAL;
  fs.writeFileSync(path.join(dir, 'js/i18n/legal.js'), dictModule(rest));
  const { s } = await pipeline(dir);
  const $ = cheerio.load(read(dir, '404.html'));
  assert.equal($('meta[name="description"]').attr('data-i18n-attr'), undefined);
  assert.equal($('meta[property="og:title"]').attr('data-i18n-attr'), 'content:legal.notfound.docTitle');
  assert.ok(s.warnings.some((w) => /404\.html: head meta desc .*legal\.notfound\.desc/.test(w)), 'warns about the missing key');
});

// ================================================================== negative fixtures (A8.7, one per error)
async function negative(name, mutate, { opts = {}, gen = true } = {}) {
  const dir = buildFixture(newDir(name));
  if (gen) await genEn.run({ root: dir, quiet: true });
  await mutate(dir);
  return seo.run({ root: dir, quiet: true, check: true, ...opts });
}
const edit = (dir, rel, fn) => fs.writeFileSync(path.join(dir, rel), fn(read(dir, rel)));
const expectErr = (r, re, label) => assert.ok(r.errors.some((e) => re.test(e)), `${label}: expected ${re}\n got:\n${r.errors.join('\n')}`);

const NEG = [
  ['missing markers', /missing <!-- @seo -->/, (d) => edit(d, 'film/index.html', (s) => s.replace(/<!-- @seo -->[\s\S]*<!-- \/@seo -->/, ''))],
  ['crumbs ≠ registry', /visible crumbs ≠ registry/, (d) => edit(d, 'projects/stone-oak-kitchen/index.html', (s) => s.replace('<li class="crumbs__item"><a href="/projects/"', '<li class="crumbs__item"><a href="/film/"'))],
  ['crumb count', /visible crumb count/, (d) => edit(d, 'film/index.html', (s) => s.replace(/<li class="crumbs__item"><a href="\/projects\/"[^]*?<\/li>/, ''))],
  ['two h1', /exactly one <h1>/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<h1>שני</h1><p id="fm-lead"'))],
  ['skipped heading level', /skips a level/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<h3>כותרת</h3><p id="fm-lead"'))],
  ['two fetchpriority=high', /fetchpriority="high"/, (d) => edit(d, 'projects/stone-oak-kitchen/index.html', (s) => s.replace('loading="lazy"', 'fetchpriority="high"'))],
  ['img without alt', /has no alt/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<img src="/assets/img/bath-01.jpg" width="1" height="1"><p id="fm-lead"'))],
  ['img without size', /needs width and height/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<img src="/assets/img/bath-01.jpg" alt="x"><p id="fm-lead"'))],
  ['img file missing', /file missing/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<img src="/assets/img/none.jpg" alt="x" width="1" height="1"><p id="fm-lead"'))],
  ['relative link', /relative link/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<a href="studio/">x</a><p id="fm-lead"'))],
  ['no trailing slash', /without its trailing slash/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<a href="/projects">x</a><p id="fm-lead"'))],
  ['broken link', /broken internal link "\/nowhere\/"/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<a href="/nowhere/">x</a><p id="fm-lead"'))],
  ['title > 65', /title \d+ characters \(> 65\)/, (d) => edit(d, 'data/prose-registry.json', (s) => s.replace('עיצוב מטבח ותכנון מטבח בהתאמה אישית | SELÈ STUDIO', 'עיצוב מטבח ותכנון מטבח בהתאמה אישית לבתים ולדירות בכל הארץ, בקפידה | SELÈ STUDIO'))],
  ['description outside 70–165', /description \d+ characters \(70–165\)/, (d) => edit(d, 'data/prose-registry.json', (s) => s.replace(/"he": "עיצוב מטבח מדויק:[^"]*"/, '"he": "קצר מדי."'))],
  ['duplicate title', /duplicate title/, (d) => edit(d, 'data/prose-registry.json', (s) => s.replace('עיצוב מטבח ותכנון מטבח בהתאמה אישית | SELÈ STUDIO', 'פרויקטים בעיצוב פנים ואדריכלות | SELÈ STUDIO'))],
  ['duplicate description', /duplicate description/, (d) => edit(d, 'data/prose-registry.json', (s) => s.replace(/"he": "עיצוב מטבח מדויק:[^"]*"/, '"he": "חללים נבחרים מתוך פרויקטים פרטיים של SELÈ STUDIO: מטבח עם אי אבן, סלון באלון ואבן, חדר רחצה בטרוורטין וחדר שינה בפשתן ואלון."'))],
  ['duplicate FAQ question', /FAQ question also on/, (d) => edit(d, 'journal/travertine-guide/index.html', (s) => s.replace('</section>', `<details data-faq-item><summary><h3 data-faq-q>${SVC['service-kitchen-design.q0'].he}</h3></summary><div data-faq-a><p>תשובה.</p></div></details></section>`))],
  ['Hebrew in an EN page', /Hebrew text left in the English page/, (d) => edit(d, 'en/film/index.html', (s) => s.replace('<p id="fm-lead"', '<p>עברית שנשארה</p><p id="fm-lead"'))],
  ['Hebrew in an EN attribute', /Hebrew in alt=/, (d) => edit(d, 'en/film/index.html', (s) => s.replace('<p id="fm-lead"', '<img src="/assets/img/bath-01.jpg" alt="חדר רחצה" width="1" height="1"><p id="fm-lead"'))],
  ['TODO in visible text', /placeholder in visible text/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<p>TODO: לכתוב</p><p id="fm-lead"'))],
  ['{{ in an alt', /placeholder in alt=/, (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<img src="/assets/img/bath-01.jpg" alt="{{SERVICE_AREA}}" width="1" height="1"><p id="fm-lead"'))],
  ['SERVICE_AREA in JSON-LD strings', /placeholder "SERVICE_AREA" in the generated head/, (d) => edit(d, 'data/prose-registry.json', (s) => s.replace(/"en": "Kitchen design"/g, '"en": "Kitchen design SERVICE_AREA"'))],
  ['article without a published date', /article without a visible published date/, (d) => edit(d, 'journal/travertine-guide/index.html', (s) => s.replace(/<time[^>]*>[^<]*<\/time>/, ''))],
  ['film without an upload date', /film without an upload date/, (d) => edit(d, 'data/site.json', (s) => s.replace('"2026-10-01"', 'null'))],
  ['service page under 450 words', /service page has \d+ words/, (d) => edit(d, 'services/kitchen-design/index.html', (s) => s.replace(/\s*<p data-i18n="service-kitchen-design\.b([1-9]|[12]\d|3[01])">[^<]*<\/p>/g, ''))],
  // not an A8.7 item, but the same failure class: a page nobody registered would ship without a <title>
  ['page without a registry entry', /no registry entry/, (d) => { fs.mkdirSync(path.join(d, 'orphan-page'), { recursive: true }); fs.copyFileSync(path.join(d, 'film/index.html'), path.join(d, 'orphan-page/index.html')); }],
];
for (const [label, re, mutate] of NEG) {
  test(`negative (A8.7): ${label}`, async () => { expectErr(await negative(label.replace(/\W+/g, '-'), mutate), re, label); });
}

test('--draft turns the missing launch dates into warnings and omits the dates', async () => {
  const dir = buildFixture(newDir('draft'), { site: { launchDate: null } });
  const strict = await pipeline(dir);
  assert.ok(strict.s.errors.some((e) => /film without an upload date/.test(e)));
  const d = await seo.run({ root: dir, quiet: true, draft: true });
  assert.ok(!d.errors.some((e) => /upload date/.test(e)) && d.warnings.some((w) => /upload date.*--draft/.test(w)));
  const v = ldOf(read(dir, 'film/index.html'))['@graph'].find((x) => x['@type'] === 'VideoObject');
  assert.ok(!('uploadDate' in v));
});

// ================================================================== gen-en negatives
async function genNeg(name, mutate) {
  const dir = buildFixture(newDir('gen-' + name));
  await mutate(dir);
  return genEn.run({ root: dir, quiet: true, check: true });
}
test('gen-en errors: unresolved key, leftover Hebrew, Hebrew on a non-bdi, Hebrew attribute value, data-i18n with children', async () => {
  let r = await genNeg('missing-key', (d) => edit(d, 'film/index.html', (s) => s.replace('data-i18n="film.lead"', 'data-i18n="film.nope"')));
  expectErr(r, /unresolved key "film.nope"/, 'missing key');
  r = await genNeg('leftover', (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead"', '<p>טקסט בלי מפתח</p><p id="fm-lead"')));
  expectErr(r, /Hebrew text left/, 'leftover Hebrew');
  r = await genNeg('non-bdi', (d) => edit(d, 'index.html', (s) => s.replace('<bdi lang="en" data-i18n="home.titleAlt">The Stone Kitchen</bdi>', '<span data-i18n="home.titleAlt">The Stone Kitchen</span>')));
  expectErr(r, /must be a <bdi>/, 'non-bdi');
  r = await genNeg('attr', (d) => edit(d, 'js/i18n/film.js', (s) => s.replace('"en": "The studio film: a look at our work"', '"en": "סרט"')));
  expectErr(r, /attribute cannot carry its own lang/, 'attr');
  r = await genNeg('children', (d) => edit(d, 'film/index.html', (s) => s.replace('<p id="fm-lead" data-i18n="film.lead">', '<p id="fm-lead" data-i18n="film.lead"><em>x</em>')));
  expectErr(r, /with child elements/, 'children');
});

test('gen-en deletes a mirror whose Hebrew source is gone, and never writes en/404.html', async () => {
  const dir = buildFixture(newDir('stale'));
  await genEn.run({ root: dir, quiet: true });
  fs.rmSync(path.join(dir, 'journal/travertine-guide'), { recursive: true });
  const c = await genEn.run({ root: dir, quiet: true, check: true });
  assert.deepEqual(c.deleted, ['en/journal/travertine-guide/index.html']);
  await genEn.run({ root: dir, quiet: true });
  assert.ok(!fs.existsSync(path.join(dir, 'en/journal/travertine-guide')));
  assert.ok(!fs.existsSync(path.join(dir, 'en/404.html')));
});

test('--only limits gen-en to the given Hebrew globs', async () => {
  const dir = buildFixture(newDir('only'));
  const r = await genEn.run({ root: dir, quiet: true, only: ['film/**'] });
  assert.deepEqual(r.changed, ['en/film/index.html']);
});

test('the real registry (data/seo.mjs): A8.5 titles ≤ 65 and descriptions 70–165 on indexable pages, unique, no banned strings', async () => {
  const reg = await import(path.join(REPO, 'data/seo.mjs'));
  const banned = ['אדריכלית', 'תכנון אדריכלי', 'מונוליטי', 'גרייז', 'SERVICE_AREA', '/approach/', 'hello@', 'TODO'];
  const seen = new Set();
  for (const p of reg.PAGES) {
    for (const lang of ['he', 'en']) {
      const t = p.title[lang], d = p.desc[lang];
      assert.ok(t && d, `${p.id} ${lang}`);
      if (core.isIndexable(p)) {
        assert.ok(t.length <= 65, `${p.id} ${lang} title ${t.length}`);
        assert.ok(d.length >= 70 && d.length <= 165, `${p.id} ${lang} desc ${d.length}`);
        assert.ok(!seen.has(t) && !seen.has(d), `${p.id} duplicate`); seen.add(t); seen.add(d);
      }
      for (const s of [t, d, JSON.stringify(p.ogAlt || '')]) for (const b of banned) assert.ok(!s.includes(b), `${p.id}: ${b}`);
      if (lang === 'en') assert.ok(!HEB.test(t + d), `${p.id}: Hebrew in EN`);
    }
  }
  assert.deepEqual(reg.PAGES.filter((p) => !core.isIndexable(p)).map((p) => p.id).sort(), ['404', 'case-dark-oak-kitchen', 'thanks']);
  assert.ok(!reg.PAGES.some((p) => /approach/.test(p.file)));
});
