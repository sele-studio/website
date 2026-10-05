// SELÈ STUDIO — tools/lib/seo-core.mjs (P9; node stdlib only) — pure SEO functions + the merged registry.
// Ported from design/seo/ref/seo.mjs (SEO-TECH §4–§7) with the Addendum A8 amendments:
//   · entity strings = the A7.3 statement; ids #website #organization #shoham-sela #logo (D6)
//   · owner values come from data/site.json (A8.1); null / false / [] emit NOTHING (no TODO comments)
//   · Person: no hasCredential, knowsLanguage only with confirm.englishClients
//   · page nodes per A8.4; FAQPage only from visible FAQ; VideoObject only on /film/
//   · BlogPosting author → #organization unless the article id is in confirm.shohamByline
// Used by tools/seo.mjs (which does the DOM work with cheerio) and by tools/test/seo.test.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ORIGIN = 'https://sele-studio.com';

export const SITE = {
  origin: ORIGIN,
  name: 'SELÈ STUDIO',
  alternateName: ['SELE STUDIO', 'Sele Studio'],
  email: 'office@sele-studio.com',
  foundingDate: '2024',
  instagram: { studio: 'https://www.instagram.com/sele__studio/', shoham: 'https://www.instagram.com/shohamsela__/' },
  logo: { path: '/assets/brand/seal-dark-512.png', width: 512, height: 512 },
  portrait: '/assets/img/shoham-portrait.jpg',
};

/** A8.1 defaults — the owner file data/site.json overrides key by key */
export const SITE_DEFAULTS = Object.freeze({
  serviceArea: null,
  gscToken: null,
  bingToken: null,
  launchDate: null,
  confirm: Object.freeze({
    styling: true, siteSupport: true, workingDrawings: true, built01Publish: true,
    drawingsPlumbingFlooring: false, built01SameAsDarkKitchen: false, renderStages: false,
    rendersStandalone: false, singleRoomProjects: false, contractorQuotes: false,
    newBuild: false, architectPartner: false, formalSupervision: false,
    englishClients: false, marketPriceReference: false,
    shohamByline: Object.freeze([]),
  }),
});

export function loadSite(root) {
  const f = path.join(root, 'data/site.json');
  let raw = {};
  if (fs.existsSync(f)) raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  return {
    ...SITE_DEFAULTS,
    ...raw,
    confirm: { ...SITE_DEFAULTS.confirm, ...(raw.confirm || {}), shohamByline: [...((raw.confirm && raw.confirm.shohamByline) || [])] },
  };
}

export const LANG = {
  he: { html: 'he', dir: 'rtl', hreflang: 'he-IL', og: 'he_IL', prefix: '' },
  en: { html: 'en', dir: 'ltr', hreflang: 'en', og: 'en_US', prefix: '/en' },
};

export const ID = {
  website: `${ORIGIN}/#website`,
  org: `${ORIGIN}/#organization`,
  person: `${ORIGIN}/#shoham-sela`,
  logo: `${ORIGIN}/#logo`,
};

/** Entity strings. orgDesc = the A7.3 entity statement verbatim (the same text as /studio/ S3). */
export const T = {
  orgDesc: {
    he: 'SELÈ STUDIO הוא סטודיו בוטיק לאדריכלות ועיצוב פנים שהקימה שוהם סלע ב־2024. אנחנו מתכננים ומעצבים דירות ובתים, ומלווים כל פרויקט מהמדידה הראשונה ועד הסטיילינג, בקשר ישיר עם שוהם לאורך כל הדרך.',
    en: 'SELÈ STUDIO is a boutique architecture and interior design studio founded by Shoham Sela in 2024. We design homes and apartments and stay with each project from the first measurements to the final styling, with Shoham as your direct contact throughout.',
  },
  slogan: { he: 'נקי, מדויק ונכון', en: 'Clean, precise and right' },
  personName: { he: 'שוהם סלע', en: 'Shoham Sela' },
  jobTitle: { he: 'מעצבת פנים', en: 'Interior Designer' },
  personDesc: {
    he: 'שוהם סלע היא מעצבת פנים, בוגרת שנקר בהצטיינות, ומייסדת SELÈ STUDIO, סטודיו בוטיק לאדריכלות ועיצוב פנים.',
    en: 'Shoham Sela is an interior designer, a Shenkar graduate with honors, and the founder of SELÈ STUDIO, a boutique architecture and interior design studio.',
  },
  shenkar: { he: 'שנקר', en: 'Shenkar College of Engineering, Design and Art' },
  israel: { he: 'ישראל', en: 'Israel' },
  catalog: { he: 'שירותי אדריכלות ועיצוב פנים', en: 'Architecture and interior design services' },
  genre: { he: 'עיצוב פנים', en: 'Interior design' },
  knowsAbout: {
    he: ['עיצוב פנים', 'אדריכלות פנים', 'תכנון דירות', 'עיצוב מטבחים', 'עיצוב חדרי רחצה', 'נגרות בהתאמה אישית', 'תכנון תאורה', 'סטיילינג לבית'],
    en: ['Interior design', 'Interior architecture', 'Apartment planning', 'Kitchen design', 'Bathroom design', 'Custom joinery', 'Lighting design', 'Home styling'],
  },
};

const WD = {
  interiorDesign: 'https://www.wikidata.org/wiki/Q179232',
  interiorArchitecture: 'https://www.wikidata.org/wiki/Q1329946',
  interiorDesigner: 'https://www.wikidata.org/wiki/Q2133309',
  shenkar: 'https://www.wikidata.org/wiki/Q5176480',
  israel: 'https://www.wikidata.org/wiki/Q801',
};

// ---------------------------------------------------------------- helpers
export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const abs = (p) => (/^https?:/.test(p) ? p : ORIGIN + p);
export const urlFor = (p, lang) => ORIGIN + LANG[lang].prefix + p;
export const pick = (v, lang) => (v && typeof v === 'object' && !Array.isArray(v) ? v[lang] : v);
/** JSON inside <script>: "<" → < so "</script>" can never close the tag (A8.3) */
export const ldJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
export const isIndexable = (meta) => meta.index !== false && meta.type !== '404';
export const isMirrored = (meta) => meta.mirror !== false && meta.type !== '404';

// ---------------------------------------------------------------- service area (A8.1, A8.5)
// data/site.json → serviceArea, when set:
//   { he, en,                                  the area as a noun phrase ("המרכז והדרום" / "central and southern Israel")
//     regions?: [{ he, en, wikidata? }],       the administrative areas served → one AdministrativeArea each (in Israel)
//     type?, wikidata?,                        single-area form (no regions): the area itself is the node
//     in?: { he, en },                         the locative phrase for running text ("במרכז ובדרום הארץ"); derived when absent
//     line?: { he, en },                       the short visible copy line (pages use it; SEO only mirrors it)
//     addressRegion?: { he, en } }             ONLY when the owner states where the studio itself sits — never derived:
//                                              a service-area business with a hidden address has no addressRegion
/** "המרכז והדרום" → "במרכז ובדרום": the preposition ב absorbs the definite article of every conjunct */
export function heLocative(s) {
  return String(s).split(/ ו(?=\S)/).map((w) => 'ב' + w.replace(/^ה(?=\S)/, '')).join(' ו');
}
const areaIn = (a, lang) => (a.in && a.in[lang]) || (lang === 'he' ? heLocative(a.he) : `in ${a.en}`);

/** the entity statement, with the service-area sentence when data/site.json → serviceArea is set (A8.5) */
export function orgDesc(lang, site) {
  const s = T.orgDesc[lang];
  const a = site && site.serviceArea;
  if (!a || !a[lang]) return s;
  return lang === 'he' ? `${s} הסטודיו פועל ${areaIn(a, 'he')}.` : `${s} The studio works ${areaIn(a, 'en')}.`;
}

function countryNode(lang) {
  return { '@type': 'Country', name: T.israel[lang], sameAs: WD.israel };
}
function areaServed(lang, site) {
  const a = site && site.serviceArea;
  if (!a) return countryNode(lang);
  const node = (r, type) => ({
    '@type': type, name: r[lang],
    ...(r.wikidata ? { sameAs: r.wikidata } : {}),
    containedInPlace: countryNode(lang),
  });
  if (Array.isArray(a.regions) && a.regions.length) return a.regions.map((r) => node(r, 'AdministrativeArea'));
  return [node(a, a.type || 'AdministrativeArea'), countryNode(lang)];
}

/** page title in a language, honoring the serviceArea variant (A8.5): {he} = the area, {in} = its locative */
export function titleOf(meta, lang, site) {
  const a = site && site.serviceArea;
  const t = a && a[lang] && meta.titleWithArea && meta.titleWithArea[lang];
  if (t) return t.replace('{in}', lang === 'he' ? heLocative(a.he) : a.en).replace('{he}', a.he).replace('{en}', a.en);
  return pick(meta.title, lang);
}
/** page description in a language, honoring the serviceArea variant */
export function descOf(meta, lang, site) {
  const a = site && site.serviceArea;
  const d = a && a[lang] && meta.descWithArea && meta.descWithArea[lang];
  return d || pick(meta.desc, lang);
}

// ---------------------------------------------------------------- <head> block (A8.3)
/**
 * headFor(meta, lang, x, site) → array of lines (no indentation).
 * x: facts extracted from the built DOM { images, faq, crumbs, collection, services, wordCount, lastmod,
 *    published, modified, sectionLabel, videoName, uploadDate, i18n:{title?,desc?,ogAlt?} }
 */
export function headFor(meta, lang, x = {}, site = SITE_DEFAULTS) {
  const L = LANG[lang];
  const is404 = meta.type === '404';
  const indexable = isIndexable(meta);
  const title = titleOf(meta, lang, site);
  const desc = descOf(meta, lang, site);
  const self = is404 ? null : urlFor(meta.path, lang);
  const og = abs(meta.og || '/assets/img/og/og-home.jpg');
  const ogAlt = pick(meta.ogAlt, lang) || title;
  // runtime-swapped metas (the bilingual 404): x.i18n = { title?, desc?, ogAlt? } dictionary keys the page holds
  const i18n = x.i18n || {};
  const sw = (k) => (i18n[k] ? ` data-i18n-attr="content:${esc(i18n[k])}"` : '');
  const out = [];
  out.push(`<title>${esc(title)}</title>`);
  out.push(`<meta name="description" content="${esc(desc)}"${sw('desc')}>`);
  out.push(indexable
    ? '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'
    : '<meta name="robots" content="noindex, follow">');
  if (self) {
    out.push(`<link rel="canonical" href="${esc(self)}">`);
    if (indexable) { // the full reciprocal set, including self, on indexable pages only
      out.push(`<link rel="alternate" hreflang="he-IL" href="${esc(urlFor(meta.path, 'he'))}">`);
      out.push(`<link rel="alternate" hreflang="en" href="${esc(urlFor(meta.path, 'en'))}">`);
      out.push(`<link rel="alternate" hreflang="x-default" href="${esc(urlFor(meta.path, 'he'))}">`);
    }
  }
  const ogType = meta.type === 'article' ? 'article' : (meta.type === 'about' ? 'profile' : 'website');
  out.push(`<meta property="og:type" content="${ogType}">`);
  out.push(`<meta property="og:site_name" content="${esc(SITE.name)}">`);
  out.push(`<meta property="og:locale" content="${L.og}">`);
  out.push(`<meta property="og:locale:alternate" content="${LANG[lang === 'he' ? 'en' : 'he'].og}">`);
  out.push(`<meta property="og:title" content="${esc(title)}"${sw('title')}>`);
  out.push(`<meta property="og:description" content="${esc(desc)}"${sw('desc')}>`);
  if (self) out.push(`<meta property="og:url" content="${esc(self)}">`);
  out.push(`<meta property="og:image" content="${esc(og)}">`);
  out.push('<meta property="og:image:width" content="1200">');
  out.push('<meta property="og:image:height" content="630">');
  out.push(`<meta property="og:image:alt" content="${esc(ogAlt)}"${sw('ogAlt')}>`);
  if (meta.type === 'about') {
    out.push(`<meta property="profile:first_name" content="${lang === 'he' ? 'שוהם' : 'Shoham'}">`);
    out.push(`<meta property="profile:last_name" content="${lang === 'he' ? 'סלע' : 'Sela'}">`);
  }
  if (meta.type === 'article') {
    if (x.published) {
      out.push(`<meta property="article:published_time" content="${esc(x.published)}">`);
      out.push(`<meta property="article:modified_time" content="${esc(x.modified || x.published)}">`);
    }
    if (x.sectionLabel) out.push(`<meta property="article:section" content="${esc(x.sectionLabel)}">`);
  }
  out.push('<meta name="twitter:card" content="summary_large_image">');
  out.push(`<meta name="twitter:title" content="${esc(title)}"${sw('title')}>`);
  out.push(`<meta name="twitter:description" content="${esc(desc)}"${sw('desc')}>`);
  out.push(`<meta name="twitter:image" content="${esc(og)}">`);
  out.push(`<meta name="twitter:image:alt" content="${esc(ogAlt)}"${sw('ogAlt')}>`);
  // verification: Hebrew home only, and only when the owner supplied a token — otherwise nothing at all
  if (meta.path === '/' && lang === 'he') {
    if (site.gscToken) out.push(`<meta name="google-site-verification" content="${esc(site.gscToken)}">`);
    if (site.bingToken) out.push(`<meta name="msvalidate.01" content="${esc(site.bingToken)}">`);
  }
  if (!is404) out.push(`<script type="application/ld+json">${ldJson(graphFor(meta, lang, x, site))}</script>`);
  return out;
}

// ---------------------------------------------------------------- JSON-LD @graph (A8.4)
function imageNode(img, id) {
  const n = {
    '@type': 'ImageObject',
    contentUrl: abs(img.src),
    url: abs(img.src),
    width: img.width,
    height: img.height,
    caption: img.caption || img.alt,
  };
  if (id) n['@id'] = id;
  if (img.credit !== 'unknown') { // data-credit="unknown" (the portrait) → no creator claim
    n.creator = { '@id': ID.org };
    n.creditText = SITE.name;
    n.copyrightNotice = `© ${SITE.name}`;
  }
  return n;
}

const PAGE_TYPE = {
  home: 'WebPage', about: 'AboutPage', contact: 'ContactPage', collection: 'CollectionPage', project: 'ItemPage',
  service: 'WebPage', 'services-hub': 'CollectionPage', article: 'WebPage', journal: 'CollectionPage',
  film: 'WebPage', legal: 'WebPage', thanks: 'WebPage',
};

export function graphFor(meta, lang, x = {}, site = SITE_DEFAULTS) {
  const pageUrl = urlFor(meta.path, lang);
  const confirm = site.confirm || SITE_DEFAULTS.confirm;
  const g = [];

  g.push({
    '@type': 'WebSite', '@id': ID.website, url: `${ORIGIN}/`, name: SITE.name,
    alternateName: SITE.alternateName, inLanguage: ['he-IL', 'en'], publisher: { '@id': ID.org },
  });

  const org = {
    '@type': 'ProfessionalService', '@id': ID.org, name: SITE.name, alternateName: SITE.alternateName,
    url: `${ORIGIN}/`,
    logo: { '@type': 'ImageObject', '@id': ID.logo, url: abs(SITE.logo.path), contentUrl: abs(SITE.logo.path), width: SITE.logo.width, height: SITE.logo.height, caption: SITE.name },
    image: { '@id': ID.logo },
    description: orgDesc(lang, site), slogan: T.slogan[lang], foundingDate: SITE.foundingDate,
    founder: { '@id': ID.person }, email: SITE.email,
    // country-only address: true (the studio is in Israel), no street, no phone, no geo; the service area goes in
    // areaServed — it is NOT the studio's own address region
    address: { '@type': 'PostalAddress', addressCountry: 'IL', ...(site.serviceArea && site.serviceArea.addressRegion && site.serviceArea.addressRegion[lang] ? { addressRegion: site.serviceArea.addressRegion[lang] } : {}) },
    areaServed: areaServed(lang, site),
    knowsAbout: [WD.interiorDesign, WD.interiorArchitecture, ...T.knowsAbout[lang]],
    sameAs: [SITE.instagram.studio],
  };
  if (confirm.englishClients) org.knowsLanguage = ['he', 'en'];
  if (x.services && x.services.length) {
    org.hasOfferCatalog = {
      '@type': 'OfferCatalog', name: T.catalog[lang],
      itemListElement: x.services.map((s) => ({ '@type': 'Offer', itemOffered: { '@id': urlFor(s.path, lang) + '#service' } })),
    };
  }
  g.push(org);

  const person = {
    '@type': 'Person', '@id': ID.person, name: T.personName[lang], alternateName: T.personName[lang === 'he' ? 'en' : 'he'],
    jobTitle: T.jobTitle[lang],
    hasOccupation: { '@type': 'Occupation', name: T.jobTitle[lang], sameAs: WD.interiorDesigner },
    alumniOf: { '@type': 'CollegeOrUniversity', name: T.shenkar[lang], url: 'https://www.shenkar.ac.il/', sameAs: WD.shenkar },
    description: T.personDesc[lang],
    worksFor: { '@id': ID.org },
    url: urlFor('/studio/', 'he'), // one entity, one URL across languages
    image: abs(SITE.portrait),
    sameAs: [SITE.instagram.shoham],
    knowsAbout: T.knowsAbout[lang],
  };
  if (confirm.englishClients) person.knowsLanguage = ['he', 'en'];
  g.push(person);

  // ---- the page itself
  const page = {
    '@type': PAGE_TYPE[meta.type] || 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: titleOf(meta, lang, site),
    description: descOf(meta, lang, site), inLanguage: LANG[lang].hreflang,
    isPartOf: { '@id': ID.website }, about: { '@id': meta.type === 'about' ? ID.person : ID.org },
    ...(x.lastmod ? { dateModified: x.lastmod } : {}),
  };
  if (x.images && x.images.length) page.primaryImageOfPage = imageNode(x.images[0], `${pageUrl}#primaryimage`);
  const hasCrumbs = meta.path !== '/' && x.crumbs && x.crumbs.length;
  if (hasCrumbs) page.breadcrumb = { '@id': `${pageUrl}#breadcrumb` };
  g.push(page);

  if (hasCrumbs) {
    g.push({
      '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumb`,
      itemListElement: x.crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: urlFor(c.path, lang) })),
    });
  }

  if (meta.type === 'service' && meta.service) {
    g.push({
      '@type': 'Service', '@id': `${pageUrl}#service`, name: pick(meta.service.name, lang),
      serviceType: pick(meta.service.name, lang), description: pick(meta.desc, lang),
      provider: { '@id': ID.org }, areaServed: areaServed(lang, site), url: pageUrl,
      ...(x.images && x.images.length ? { image: { '@id': `${pageUrl}#primaryimage` } } : {}),
    });
    page.mainEntity = { '@id': `${pageUrl}#service` };
  }

  if (meta.type === 'project' && meta.project) {
    g.push({
      '@type': 'CreativeWork', '@id': `${pageUrl}#work`, name: pick(meta.project.name, lang),
      description: pick(meta.desc, lang), genre: T.genre[lang], inLanguage: LANG[lang].hreflang,
      creator: { '@id': ID.org },
      material: pick(meta.project.materials, lang),
      // renders are visualizations of a design (captions carry הדמיה / Render); no date, location or client
      image: (x.images || []).map((im) => imageNode(im)),
      isPartOf: { '@id': `${urlFor('/projects/', lang)}#webpage` },
      mainEntityOfPage: { '@id': `${pageUrl}#webpage` },
    });
    page.mainEntity = { '@id': `${pageUrl}#work` };
  }

  if (meta.type === 'article') {
    const byShoham = (confirm.shohamByline || []).includes(meta.id);
    const post = {
      '@type': 'BlogPosting', '@id': `${pageUrl}#article`, headline: pick(meta.h1 || meta.title, lang),
      description: pick(meta.desc, lang), inLanguage: LANG[lang].hreflang,
      author: { '@id': byShoham ? ID.person : ID.org }, publisher: { '@id': ID.org }, mainEntityOfPage: { '@id': `${pageUrl}#webpage` },
      image: (x.images || []).slice(0, 3).map((im) => abs(im.src)),
      ...(x.sectionLabel ? { articleSection: x.sectionLabel } : {}),
      ...(x.wordCount ? { wordCount: x.wordCount } : {}),
    };
    if (x.published) { post.datePublished = x.published; post.dateModified = x.modified || x.published; }
    g.push(post);
  }

  if (meta.type === 'film' && meta.video) {
    const v = meta.video;
    const node = {
      '@type': 'VideoObject', '@id': `${pageUrl}#video`, name: x.videoName || pick(v.name, lang), description: pick(meta.desc, lang),
      thumbnailUrl: [abs(v.thumbnailUrl)], duration: v.duration,
      contentUrl: abs(v.contentUrl), encodingFormat: 'video/mp4', width: v.width, height: v.height,
      isFamilyFriendly: true, creator: { '@id': ID.org }, publisher: { '@id': ID.org },
    };
    if (x.uploadDate) node.uploadDate = x.uploadDate;
    g.push(node);
    page.mainEntity = { '@id': `${pageUrl}#video` };
    page.video = { '@id': `${pageUrl}#video` };
  }

  if (x.collection && x.collection.length) {
    page.mainEntity = {
      '@type': 'ItemList',
      itemListElement: x.collection.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: urlFor(c.path, lang), name: c.name })),
    };
  }

  // FAQPage only from the questions VISIBLE on this page ([data-faq-q] / [data-faq-a])
  if (x.faq && x.faq.length) {
    g.push({
      '@type': 'FAQPage', '@id': `${pageUrl}#faq`, isPartOf: { '@id': `${pageUrl}#webpage` }, inLanguage: LANG[lang].hreflang,
      mainEntity: x.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': g };
}

// ---------------------------------------------------------------- sitemap.xml (A8.6)
/**
 * entries: [{ meta, langs: { he: { lastmod, images:[abs] }, en?: {…} }, video?: { he:{title,description}, en:{…}, thumb, content, seconds, date } }]
 * One <url> per page per language, the three alternates each, image:image per non-decorative image,
 * video:video only on /film/. No priority / changefreq.
 */
export function sitemapXml(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
  ];
  for (const e of entries) {
    for (const lang of ['he', 'en']) {
      const l = e.langs[lang];
      if (!l) continue;
      lines.push('  <url>');
      lines.push(`    <loc>${esc(urlFor(e.meta.path, lang))}</loc>`);
      if (l.lastmod) lines.push(`    <lastmod>${l.lastmod}</lastmod>`);
      lines.push(`    <xhtml:link rel="alternate" hreflang="he-IL" href="${esc(urlFor(e.meta.path, 'he'))}"/>`);
      lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${esc(urlFor(e.meta.path, 'en'))}"/>`);
      lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(urlFor(e.meta.path, 'he'))}"/>`);
      for (const img of [...new Set(l.images || [])]) lines.push(`    <image:image><image:loc>${esc(img)}</image:loc></image:image>`);
      if (e.video && e.video[lang]) {
        const v = e.video;
        lines.push('    <video:video>');
        lines.push(`      <video:thumbnail_loc>${esc(v.thumb)}</video:thumbnail_loc>`);
        lines.push(`      <video:title>${esc(v[lang].title)}</video:title>`);
        lines.push(`      <video:description>${esc(v[lang].description)}</video:description>`);
        lines.push(`      <video:content_loc>${esc(v.content)}</video:content_loc>`);
        lines.push(`      <video:duration>${v.seconds}</video:duration>`);
        if (v.date) lines.push(`      <video:publication_date>${esc(v.date)}</video:publication_date>`);
        lines.push('      <video:family_friendly>yes</video:family_friendly>');
        lines.push('    </video:video>');
      }
      lines.push('  </url>');
    }
  }
  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------- llms.txt (A8.6)
/** the llms.txt service-area fact (A8.6), empty while serviceArea is null */
function areaFact(site) {
  const a = site && site.serviceArea;
  if (!a || !a.en) return '';
  const regions = Array.isArray(a.regions) && a.regions.length ? ` (${a.regions.map((r) => `${r.en} / ${r.he}`).join(', ')})` : '';
  return ` service area: ${a.en} / ${a.he}${regions};`;
}
const LLMS_MAIN = ['home', 'about', 'services-hub', 'service', 'collection', 'project', 'film', 'journal', 'article', 'contact'];
/** list: [{ lang, meta }] of indexable pages, in registry order */
export function llmsTxt(list, site = SITE_DEFAULTS) {
  const line = (e) => `- [${titleOf(e.meta, e.lang, site)}](${urlFor(e.meta.path, e.lang)}): ${descOf(e.meta, e.lang, site)}`;
  const section = (types, lang) => list.filter((e) => e.lang === lang && types.includes(e.meta.type)).map(line).join('\n');
  return [
    '# SELÈ STUDIO',
    '',
    `> ${orgDesc('en', site)}`,
    '',
    `> ${orgDesc('he', site)}`,
    '',
    `Facts: studio name "SELÈ STUDIO" (also written SELE STUDIO); founded 2024; country: Israel;${areaFact(site)} founder and lead designer: Shoham Sela (שוהם סלע), interior designer; education: Shenkar College of Engineering, Design and Art (graduated with honors); contact: office@sele-studio.com; Instagram: @sele__studio (studio), @shohamsela__ (Shoham Sela). Website languages: Hebrew (primary, at the root) and English (under /en/). The studio publishes no street address, phone number or prices on the web; enquiries go through the contact page. Project images on this site are the studio's own design visualizations unless a caption says otherwise.`,
    '',
    '## עברית (Hebrew, primary)',
    section(LLMS_MAIN, 'he'),
    '',
    '## English',
    section(LLMS_MAIN, 'en'),
    '',
    '## Optional',
    section(['legal'], 'he'),
    section(['legal'], 'en'),
    '',
  ].join('\n');
}

// ---------------------------------------------------------------- the merged registry (A8.2)
async function importFresh(file) {
  // a query string defeats node's module cache, so a long-running test can load several fixture roots
  const st = fs.statSync(file);
  return import(pathToFileURL(file).href + `?t=${st.mtimeMs}-${st.size}`);
}

/** normalize one prose-registry item (P8 output) to a registry entry */
function proseEntry(item) {
  const m = item.meta ? { ...item.meta } : { ...item };
  for (const k of ['file', 'crumbs', 'collection']) if (item[k] !== undefined && m[k] === undefined) m[k] = item[k];
  if (!m.file && m.path) m.file = m.path.replace(/^\//, '') + 'index.html';
  if (!Array.isArray(m.crumbs)) m.crumbs = m.type === 'article' ? ['home', 'journal'] : m.type === 'service' ? ['home', 'services'] : ['home'];
  m.prose = true;
  return m;
}

/**
 * buildRegistry(root) → { pages:[entry], byId, errors:[], warnings:[], site, crumbPaths, film }
 * Merges data/seo.mjs (hand-authored), data/projects.mjs (case facts, read-only) and
 * data/prose-registry.json (built prose pages). Expands '@services' / '@articles' collections.
 */
export async function buildRegistry(root) {
  const errors = [], warnings = [];
  const site = loadSite(root);
  const seoFile = path.join(root, 'data/seo.mjs');
  if (!fs.existsSync(seoFile)) throw new Error('data/seo.mjs not found');
  const seo = await importFresh(seoFile);
  const hand = (seo.PAGES || (seo.default && seo.default.PAGES) || []).map((p) => ({ ...p }));
  const crumbPaths = seo.CRUMB_PATHS || (seo.default && seo.default.CRUMB_PATHS) || {};
  const serviceOrder = seo.SERVICE_ORDER || (seo.default && seo.default.SERVICE_ORDER) || [];

  // ---- cases ← data/projects.mjs
  let projects = null;
  const projFile = path.join(root, 'data/projects.mjs');
  if (fs.existsSync(projFile)) {
    try { const mod = await importFresh(projFile); projects = mod.default || mod.projects || null; }
    catch (e) { errors.push(`data/projects.mjs: ${e.message}`); }
  }
  const pages = [];
  for (const p of hand) {
    if (p.type === 'project') {
      const slug = p.project && p.project.slug;
      const d = Array.isArray(projects) ? projects.find((x) => x.slug === slug) : null;
      if (!d) {
        (projects ? errors : warnings).push(`${p.file}: case "${slug}" not found in data/projects.mjs${projects ? '' : ' (file absent)'}`);
        if (!projects) { p.crumb = p.crumb || { he: slug, en: slug }; p.project = { slug, name: p.crumb, materials: { he: [], en: [] } }; pages.push(p); }
        continue;
      }
      const list = (v) => (Array.isArray(v) ? v : String(v || '').split(/\s*,\s*/).filter(Boolean));
      p.crumb = { he: d.title.he, en: d.title.en };
      p.project = { slug, name: { he: d.title.he, en: d.title.en }, materials: { he: list(d.materials && d.materials.he), en: list(d.materials && d.materials.en) } };
      if (!p.ogAlt && d.hero && d.hero.alt) p.ogAlt = { he: d.hero.alt.he, en: d.hero.alt.en };
      if (d.builtPairConfirmed !== undefined && !!d.builtPairConfirmed !== !!site.confirm.built01SameAsDarkKitchen) {
        warnings.push(`data/projects.mjs builtPairConfirmed (${d.builtPairConfirmed}) ≠ data/site.json built01SameAsDarkKitchen (${site.confirm.built01SameAsDarkKitchen})`);
      }
    }
    pages.push(p);
  }

  // ---- prose ← data/prose-registry.json
  const proseFile = path.join(root, 'data/prose-registry.json');
  let prose = [];
  if (fs.existsSync(proseFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(proseFile, 'utf8'));
      const items = Array.isArray(raw) ? raw : Array.isArray(raw.pages) ? raw.pages : Object.values(raw);
      prose = items.map(proseEntry);
    } catch (e) { errors.push(`data/prose-registry.json: ${e.message}`); }
  } else warnings.push('data/prose-registry.json not found: no service / journal pages in the registry (gen-prose has not run)');

  const slugOf = (m) => m.path.split('/').filter(Boolean).pop();
  const services = prose.filter((m) => m.type === 'service')
    .sort((a, b) => (serviceOrder.indexOf(slugOf(a)) + 1 || 99) - (serviceOrder.indexOf(slugOf(b)) + 1 || 99));
  const journal = prose.filter((m) => m.type === 'journal');
  const articles = prose.filter((m) => m.type === 'article');
  // placement: services after the hub, journal + articles before contact
  const out = [];
  for (const p of pages) {
    if (p.type === 'contact') out.push(...journal, ...articles);
    out.push(p);
    if (p.type === 'services-hub') out.push(...services);
  }
  if (!pages.some((p) => p.type === 'contact')) out.push(...journal, ...articles);
  if (!pages.some((p) => p.type === 'services-hub')) out.push(...services);

  const builtServices = services.filter(isIndexable).map((m) => m.id);
  const builtArticles = articles.filter(isIndexable).map((m) => m.id);
  const byId = Object.create(null);
  for (const m of out) {
    if (byId[m.id]) errors.push(`registry: duplicate id "${m.id}"`);
    byId[m.id] = m;
  }
  for (const m of out) {
    if (!Array.isArray(m.collection)) continue;
    m.collection = m.collection.flatMap((id) => (id === '@services' ? builtServices : id === '@articles' ? builtArticles : [id]));
  }
  for (const m of out) for (const c of m.crumbs || []) if (!(c in crumbPaths)) errors.push(`registry: ${m.id} has unknown crumb id "${c}"`);
  return { pages: out, byId, errors, warnings, site, crumbPaths, services: services.filter(isIndexable) };
}
