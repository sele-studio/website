// SELÈ STUDIO — data/seo.mjs (P9) — the SEO registry of every HAND-AUTHORED page (Addendum A8.2, A8.5).
//
// Prose pages (services, journal) are NOT listed here: tools/seo.mjs merges them from
// data/prose-registry.json (written by gen-prose, P8). Case pages take their crumb, their
// CreativeWork name and materials, and their OG alt from data/projects.mjs (P2, read-only),
// joined by `project.slug` in tools/lib/seo-core.mjs → buildRegistry().
//
// Entry shape: { id, file, path, type, crumbs:[parent crumb ids], crumb:{he,en}, title:{he,en},
//                desc:{he,en}, og, ogAlt:{he,en}, index, mirror?, collection?, project?, video?, i18n? }
//   type        home | collection | project | film | services-hub | about | contact | thanks | legal | 404
//   crumbs      parent ids from CRUMB_PATHS (the page itself is appended); [] = no crumbs (home, 404)
//   collection  page ids listed as the page's ItemList; the token '@services' expands to the BUILT
//               service pages (hub order), '@articles' to the built articles
//   mirror      false = no /en/ file (the bilingual 404 only)
//   i18n        { title?, desc?, ogAlt? } dictionary keys for head metas swapped at runtime (the bilingual 404 only)
// Copy is final (SPEC §0.3): titles/descriptions are A8.5 verbatim, the rest SPEC §7.2 with the A8.5
// rules applied (D10 "פרויקט מגורים פרטי", D12 "גרייג'"). No numbers, places or claims beyond the brief.

/** crumb ids → paths (A8.2). The BreadcrumbList NAMES are read from the visible crumbs, never from here. */
export const CRUMB_PATHS = {
  home: '/',
  projects: '/projects/',
  services: '/services/',
  journal: '/journal/',
  contact: '/contact/',
};

/** OG alt text per source image: SEO-TECH §8.2 with D12 spelling and American English (A6.3 rule 6). */
export const OG_ALT = {
  studio: { he: 'SELÈ STUDIO — אדריכלות ועיצוב פנים', en: 'SELÈ STUDIO — architecture and interior design' },
  'kitchen-stone-01': {
    he: 'מטבח עם אי אבן מונוליתי אפור עם גידים, ארונות אלון בהיר עד התקרה ונישת אבן מוארת',
    en: 'Kitchen with a monolithic gray-veined stone island, full-height light-oak cabinetry and a backlit stone niche',
  },
  'kitchen-stone-02': {
    he: 'מבט אלכסוני על אי האבן והנישה המוארת במטבח, ענפי זית ואור שמש נמוך',
    en: 'Angled view of the stone island and lit niche, with olive branches and low sunlight',
  },
  'kitchen-stone-03': {
    he: 'נישת הקפה במטבח: חיפוי אבן עם גידים, ברז פלדה מוברשת, כיור שקוע ומכונת קפה',
    en: 'The kitchen coffee niche: veined stone splashback, brushed-steel tap, undermount sink and coffee machine',
  },
  'living-04': {
    he: 'שולחן קפה מאלון כהה עם ספרים ופסל עץ, ובסיס אבן ברקע',
    en: 'Dark-oak coffee table with books and a wooden sculpture, a stone plinth behind',
  },
  'bath-02': {
    he: 'מבט דרך פתח הדלת אל משטח הטרוורטין בחדר הרחצה, באור חם',
    en: 'View through a doorway to the travertine vanity in warm light',
  },
};

/**
 * The studio film (A7.6, A8.4). Measured once with TOOLS/node_modules/ffmpeg-static on 28/09/2026:
 * assets/video/hero-16x9.mp4 → Duration 00:00:21.50, 1600×900, h264. `name` is read from the page's
 * dictionary key film.videoLabel at build time; the literal below is only the fallback.
 */
export const FILM = {
  nameKey: 'film.videoLabel',
  name: { he: 'סרט הסטודיו: מבט על העבודות', en: 'The studio film: a look at our work' },
  contentUrl: '/assets/video/hero-16x9.mp4',
  thumbnailUrl: '/assets/video/hero-16x9-poster.jpg',
  width: 1600,
  height: 900,
  duration: 'PT21.5S', // ISO 8601 of the measured 21.50 s
  seconds: 22,         // sitemap <video:duration> takes whole seconds
};

const OG = (name) => `/assets/img/og/${name}.jpg`;

/** hand-authored pages, in llms.txt / sitemap order */
export const PAGES = [
  {
    id: 'home', file: 'index.html', path: '/', type: 'home', crumbs: [],
    crumb: { he: 'ראשי', en: 'Home' },
    title: {
      he: 'מעצבת פנים – סטודיו לאדריכלות ועיצוב פנים | SELÈ STUDIO',
      en: 'Interior Designer in Israel – Design Studio | SELÈ STUDIO',
    },
    // used instead of title / desc while data/site.json → serviceArea is set (A8.5). In titleWithArea, {in} is the
    // locative of serviceArea.he ("המרכז והדרום" → "במרכז ובדרום", 60 characters) and of .en; {he}/{en} the plain area.
    // The EN title and both descriptions are written for the current area (central + southern Israel, owner 28/09/2026):
    // rewrite them when data/site.json → serviceArea changes.
    titleWithArea: {
      he: 'מעצבת פנים {in} – אדריכלות ועיצוב פנים | SELÈ STUDIO',
      en: 'Interior Designer in Central & Southern Israel | SELÈ STUDIO',
    },
    desc: {
      he: 'SELÈ STUDIO – סטודיו בוטיק לאדריכלות ועיצוב פנים בהובלת שוהם סלע, מעצבת פנים בוגרת שנקר בהצטיינות. תכנון, עיצוב, ליווי ביצוע וסטיילינג.',
      en: 'SELÈ STUDIO is a boutique architecture and interior design studio in Israel, led by Shoham Sela, an interior designer and Shenkar honors graduate.',
    },
    descWithArea: {
      he: 'SELÈ STUDIO – סטודיו בוטיק לאדריכלות ועיצוב פנים בהובלת שוהם סלע, מעצבת פנים בוגרת שנקר בהצטיינות. תכנון, עיצוב, ליווי ביצוע וסטיילינג במרכז ובדרום הארץ.',
      en: 'SELÈ STUDIO is a boutique architecture and interior design studio led by Shoham Sela, a Shenkar honors graduate. Projects across central and southern Israel.',
    },
    og: OG('og-home'), ogAlt: OG_ALT.studio, index: true,
    collection: ['case-stone-oak-kitchen', 'case-oak-living-room', 'case-travertine-bathroom', 'case-dark-oak-bedroom', 'case-dark-oak-kitchen', '@services'],
  },
  {
    id: 'studio', file: 'studio/index.html', path: '/studio/', type: 'about', crumbs: ['home'],
    crumb: { he: 'הסטודיו', en: 'Studio' },
    title: { he: 'שוהם סלע – מעצבת פנים בוגרת שנקר | SELÈ STUDIO', en: 'Shoham Sela, Interior Designer | SELÈ STUDIO' },
    desc: {
      he: 'הכירו את שוהם סלע, מעצבת פנים בוגרת שנקר בהצטיינות, ואת SELÈ STUDIO – סטודיו בוטיק לאדריכלות ועיצוב פנים עם יחס אישי וחם.',
      en: 'Meet Shoham Sela, an interior designer and Shenkar honors graduate, and SELÈ STUDIO, a boutique architecture and interior design studio with a personal touch.',
    },
    og: OG('og-studio'), ogAlt: OG_ALT['bath-02'], index: true,
  },
  {
    id: 'services', file: 'services/index.html', path: '/services/', type: 'services-hub', crumbs: ['home'],
    crumb: { he: 'שירותים', en: 'Services' },
    title: { he: 'שירותי עיצוב פנים – מהתכנון ועד הסטיילינג | SELÈ STUDIO', en: 'Interior Design Services – Planning to Styling | SELÈ STUDIO' },
    desc: {
      he: 'שירותי SELÈ STUDIO: תכנון דירה ואדריכלות פנים, עיצוב פנים לבית, עיצוב מטבח וחדר רחצה וליווי שיפוץ, בהובלת שוהם סלע, מעצבת פנים בוגרת שנקר.',
      en: 'SELÈ STUDIO services in Israel: space planning and interior architecture, whole-home interior design, kitchens, bathrooms and renovation support.',
    },
    og: OG('og-services'), ogAlt: OG_ALT['living-04'], index: true,
    collection: ['@services'],
  },
  {
    id: 'projects', file: 'projects/index.html', path: '/projects/', type: 'collection', crumbs: ['home'],
    crumb: { he: 'פרויקטים', en: 'Projects' },
    title: { he: 'פרויקטים – עיצוב פנים ואדריכלות | SELÈ STUDIO', en: 'Interior Design Projects | SELÈ STUDIO' },
    desc: {
      he: 'חללים נבחרים מתוך פרויקטים פרטיים של SELÈ STUDIO: מטבח עם אי אבן, סלון באלון ואבן, חדר רחצה בטרוורטין וחדר שינה בפשתן ואלון.',
      en: "Selected spaces from SELÈ STUDIO’s private projects: a stone-island kitchen, an oak and stone living room, a travertine bath and a linen and oak bedroom.",
    },
    og: OG('og-projects'), ogAlt: OG_ALT['kitchen-stone-02'], index: true,
    collection: ['case-stone-oak-kitchen', 'case-oak-living-room', 'case-travertine-bathroom', 'case-dark-oak-bedroom', 'case-dark-oak-kitchen'],
  },
  // ---- case pages: crumb, project.name / project.materials and ogAlt (the hero alt) come from data/projects.mjs
  {
    id: 'case-stone-oak-kitchen', file: 'projects/stone-oak-kitchen/index.html', path: '/projects/stone-oak-kitchen/',
    type: 'project', crumbs: ['home', 'projects'], project: { slug: 'stone-oak-kitchen' },
    title: { he: 'מטבח עם אי אבן ועץ אלון | פרויקט SELÈ STUDIO', en: 'Stone Island Kitchen with Oak | SELÈ STUDIO' },
    desc: {
      he: 'מטבח עם אי מאבן עורקית, נגרות אלון בהיר עד התקרה ונישה מוארת עם גב אבן. הדמיית תכנון של SELÈ STUDIO לפרויקט מגורים פרטי.',
      en: 'A kitchen with a veined-stone island, floor-to-ceiling light-oak joinery and a lit stone niche. A SELÈ STUDIO design visualization for a private residence.',
    },
    og: OG('og-stone-oak-kitchen'), index: true,
  },
  {
    id: 'case-oak-living-room', file: 'projects/oak-living-room/index.html', path: '/projects/oak-living-room/',
    type: 'project', crumbs: ['home', 'projects'], project: { slug: 'oak-living-room' },
    title: { he: 'עיצוב סלון עם ספריית אלון ואדן אבן | פרויקט SELÈ STUDIO', en: 'Oak Living Room Design with a Stone Plinth | SELÈ STUDIO' },
    desc: {
      he: 'סלון עם ספריית אלון, טלוויזיה ששקועה בטיח ואדן אבן לכל אורך הקיר. הדמיית תכנון של SELÈ STUDIO לפרויקט מגורים פרטי.',
      en: 'A living room with oak shelving, a TV set into plaster and a stone plinth along the whole wall. A SELÈ STUDIO design visualization for a private residence.',
    },
    og: OG('og-oak-living-room'), index: true,
  },
  {
    id: 'case-travertine-bathroom', file: 'projects/travertine-bathroom/index.html', path: '/projects/travertine-bathroom/',
    type: 'project', crumbs: ['home', 'projects'], project: { slug: 'travertine-bathroom' },
    title: { he: 'ארון אמבטיה כפול מטרוורטין | פרויקט SELÈ STUDIO', en: 'Travertine Bathroom with a Double Vanity | SELÈ STUDIO' },
    desc: {
      he: 'חדר רחצה בטרוורטין עם כיור כפול, מראות עם תאורה אחורית, ברזי קיר בגוון ברונזה ומגירות אגוז. הדמיית תכנון של SELÈ STUDIO.',
      en: 'A travertine bathroom with a double vanity, backlit mirrors, bronze-toned wall taps and walnut drawers. A SELÈ STUDIO design visualization.',
    },
    og: OG('og-travertine-bathroom'), index: true,
  },
  {
    id: 'case-dark-oak-bedroom', file: 'projects/dark-oak-bedroom/index.html', path: '/projects/dark-oak-bedroom/',
    type: 'project', crumbs: ['home', 'projects'], project: { slug: 'dark-oak-bedroom' },
    title: { he: 'עיצוב חדר שינה באלון כהה ופשתן | פרויקט SELÈ STUDIO', en: 'Dark Oak Bedroom Design with Linen | SELÈ STUDIO' },
    desc: {
      he: 'חדר שינה עם קיר אלון כהה מעוגל, ראש מיטה מפשתן, שולחנות צד מטרוורטין ומנורות תלויות. הדמיית תכנון של SELÈ STUDIO לפרויקט מגורים פרטי.',
      en: 'A bedroom with a curved dark-oak wall, a linen headboard, travertine side tables and pendant lights. A SELÈ STUDIO design visualization for a private residence.',
    },
    og: OG('og-dark-oak-bedroom'), index: true,
  },
  {
    // L9: one render, < 250 words of design intent → noindex, follow; out of sitemap / llms / hreflang
    id: 'case-dark-oak-kitchen', file: 'projects/dark-oak-kitchen/index.html', path: '/projects/dark-oak-kitchen/',
    type: 'project', crumbs: ['home', 'projects'], project: { slug: 'dark-oak-kitchen' },
    title: { he: 'מטבח עץ אלון כהה עם כיור אבן | פרויקט SELÈ STUDIO', en: 'Dark Oak Kitchen Design | SELÈ STUDIO' },
    desc: {
      he: "מטבח באלון כהה עם לכה בגוון גרייג', כיור אבן אינטגרלי ומדפי מתכת מוארים מאחור. הדמיית תכנון של SELÈ STUDIO.",
      en: 'A dark-oak kitchen with greige lacquer, an integrated stone sink and backlit metal shelving. A SELÈ STUDIO design visualization.',
    },
    og: OG('og-dark-oak-kitchen'), index: false,
  },
  {
    id: 'film', file: 'film/index.html', path: '/film/', type: 'film', crumbs: ['home', 'projects'],
    crumb: { he: 'סרט הסטודיו', en: 'Studio film' },
    title: { he: 'סרט הסטודיו – מבט על העבודות | SELÈ STUDIO', en: 'Studio Film – A Look at Our Work | SELÈ STUDIO' },
    desc: {
      he: 'סרט קצר ושקט מתוך הדמיות התכנון של SELÈ STUDIO: מטבח עם אי אבן ונגרות אלון, סלון באלון ואבן וחדר שינה באלון כהה ופשתן.',
      en: "A short, silent film from SELÈ STUDIO’s design visualizations: a stone-island kitchen with oak joinery, an oak and stone living room and a dark-oak bedroom.",
    },
    // og-film.jpg is cut from hero-16x9-poster.jpg, whose frame 0 is kitchen-stone-01 (SCR/tools/video.js HERO169)
    og: OG('og-film'), ogAlt: OG_ALT['kitchen-stone-01'], index: true,
    video: FILM,
  },
  {
    id: 'contact', file: 'contact/index.html', path: '/contact/', type: 'contact', crumbs: ['home'],
    crumb: { he: 'צרו קשר', en: 'Contact' },
    title: { he: 'צרו קשר: פגישת היכרות עם מעצבת פנים | SELÈ STUDIO', en: 'Contact an Interior Designer in Israel | SELÈ STUDIO' },
    desc: {
      he: 'ספרו לנו על הבית שלכם ונחזור אליכם לתיאום פגישת היכרות. טופס קצר בשלושה צעדים, או מייל ישיר ל־office@sele-studio.com.',
      en: "Tell us about your home and we’ll get back to you to arrange a first meeting. A short three-step form, or email office@sele-studio.com.",
    },
    og: OG('og-contact'), ogAlt: OG_ALT['kitchen-stone-03'], index: true,
  },
  {
    id: 'thanks', file: 'contact/thanks/index.html', path: '/contact/thanks/', type: 'thanks', crumbs: ['home', 'contact'],
    crumb: { he: 'תודה', en: 'Thank you' },
    title: { he: 'תודה | SELÈ STUDIO', en: 'Thank you | SELÈ STUDIO' },
    desc: { he: 'קיבלנו את הפנייה שלכם.', en: "We’ve received your inquiry." },
    og: OG('og-contact'), ogAlt: OG_ALT['kitchen-stone-03'], index: false,
  },
  {
    id: 'accessibility', file: 'accessibility/index.html', path: '/accessibility/', type: 'legal', crumbs: ['home'],
    crumb: { he: 'הצהרת נגישות', en: 'Accessibility statement' },
    title: { he: 'הצהרת נגישות | SELÈ STUDIO', en: 'Accessibility Statement | SELÈ STUDIO' },
    desc: {
      he: 'הצהרת הנגישות של אתר SELÈ STUDIO: מה עשינו כדי שהאתר יהיה נגיש, מגבלות ידועות ודרכי פנייה בנושא נגישות.',
      en: 'The SELÈ STUDIO accessibility statement: what we did to make the site accessible, known limitations and how to contact us.',
    },
    og: OG('og-home'), ogAlt: OG_ALT.studio, index: true,
  },
  {
    id: 'privacy', file: 'privacy/index.html', path: '/privacy/', type: 'legal', crumbs: ['home'],
    crumb: { he: 'מדיניות פרטיות', en: 'Privacy notice' },
    title: { he: 'מדיניות פרטיות | SELÈ STUDIO', en: 'Privacy Notice | SELÈ STUDIO' },
    desc: {
      he: 'מדיניות הפרטיות של SELÈ STUDIO: אילו פרטים נאספים בטופס הפנייה, למה, למי הם מועברים ומה הזכויות שלכם. בלי עוגיות ובלי מעקב.',
      en: "SELÈ STUDIO’s privacy notice: what the contact form collects, why, who receives it and your rights. No cookies, no tracking.",
    },
    og: OG('og-home'), ogAlt: OG_ALT.studio, index: true,
  },
  {
    // one bilingual file for every miss (A3.8): no /en/ file, no canonical, no hreflang, no JSON-LD
    id: '404', file: '404.html', path: '/404.html', type: '404', crumbs: [],
    crumb: { he: 'העמוד לא נמצא', en: 'Page not found' },
    title: { he: 'העמוד לא נמצא | SELÈ STUDIO', en: 'Page not found | SELÈ STUDIO' },
    desc: { he: 'הדלת הזו סגורה, אבל יש עוד הרבה חדרים.', en: 'This door is closed, but there are plenty of other rooms.' },
    og: OG('og-home'), ogAlt: OG_ALT.studio, index: false, mirror: false,
    // served as-is under /en/ too: the head metas carry data-i18n-attr so i18n.apply(document) swaps them
    // (emitted only for keys the page's dictionary actually holds)
    i18n: { title: 'legal.notfound.docTitle', desc: 'legal.notfound.desc', ogAlt: 'legal.notfound.ogAlt' },
  },
];

/** hub order of the service pages (A5), used for '@services' and hasOfferCatalog */
export const SERVICE_ORDER = ['interior-design', 'space-planning', 'kitchen-design', 'bathroom-design', 'renovation-management', '3d-visualization'];

export default { PAGES, CRUMB_PATHS, OG_ALT, FILM, SERVICE_ORDER };
