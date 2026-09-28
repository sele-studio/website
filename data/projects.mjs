// SELÈ STUDIO — data/projects.mjs (owner: P2). The single source for the Projects index, the five case pages and
// js/i18n/projects.js — all three are written by `node tools/gen-projects.mjs`. Copy is final (SPEC §5.2–§5.3 as
// amended by SPEC-ADDENDUM A7.2, D10, D12). Plain data: node-importable; data/seo.mjs (P9) imports it read-only.
//
// Truth rules: every image here is a studio render (הדמיה / Render). built-01 is never used on a case page while
// builtPairConfirmed is false (SPEC §0.5, §5.3.5); it must equal data/site.json → confirm.built01SameAsDarkKitchen.

/** Canonical materials table (SPEC §5.0). Chip labels on /projects/, tile names and sensory lines on case pages. */
export const materials = [
  { id: 'stone', name: { he: 'אבן עורקית', en: 'Veined stone' }, line: { he: 'קרירה ביד, שקטה לעין. העורקים הם הקישוט היחיד שהחלל צריך.', en: 'Cool to the hand, quiet to the eye. The veining is the only ornament the room needs.' }, tile: 'materials/tile-stone' },
  { id: 'light-oak', name: { he: 'אלון בהיר', en: 'Light oak' }, line: { he: 'העץ שמחזיק את האור של הבוקר. גרעין ישר, גוון שקט.', en: 'The wood that holds the morning light. Straight grain, a quiet tone.' }, tile: 'materials/tile-light-oak' },
  { id: 'dark-oak', name: { he: 'אלון כהה', en: 'Dark oak' }, line: { he: 'עוגן. הגוון שנותן לחדר משקל ושקט.', en: 'An anchor. The tone that gives a room weight and calm.' }, tile: 'materials/tile-dark-oak' },
  { id: 'travertine', name: { he: 'טרוורטין', en: 'Travertine' }, line: { he: 'אבן עם זיכרון: כל נקבובית היא צל קטן.', en: 'A stone with memory: every pore is a small shadow.' }, tile: 'materials/tile-travertine' },
  { id: 'walnut', name: { he: 'אגוז', en: 'Walnut' }, line: { he: 'עומק חם מתחת ליד. הצד הכהה של הפלטה.', en: 'Warm depth under the hand. The dark side of the palette.' }, tile: 'materials/tile-walnut' },
  { id: 'linen', name: { he: 'פשתן', en: 'Linen' }, line: { he: 'רך, מחוספס מעט, נושם. הבד שמרכך את כל השאר.', en: 'Soft, slightly rough, breathing. The fabric that softens everything else.' }, tile: 'materials/tile-linen' },
];

/** Truth note, shown wherever materials are listed (SPEC §5.0). */
export const materialsNote = {
  he: 'שמות החומרים מתארים את המראה כפי שהוא מופיע בהדמיות. את הבחירה המדויקת לכל בית, סוג האבן, הגימור והספק, אנחנו עושים יחד איתכם.',
  en: 'Material names describe the look as it appears in our visualizations. The exact choice for each home — stone type, finish and supplier — we make together with you.',
};

/** Space keys and their chip labels (SPEC §5.2). */
export const spaces = [
  { key: 'kitchen', label: { he: 'מטבח', en: 'Kitchen' } },
  { key: 'living', label: { he: 'סלון', en: 'Living' } },
  { key: 'bath', label: { he: 'רחצה', en: 'Bath' } },
  { key: 'bedroom', label: { he: 'שינה', en: 'Bedroom' } },
];

/** Service slug → the common dictionary key of its label (Addendum A4.6). Only built service pages are linked. */
export const serviceKeys = {
  'interior-design': 'common.svc.interior',
  'space-planning': 'common.svc.planning',
  'kitchen-design': 'common.svc.kitchen',
  'bathroom-design': 'common.svc.bathroom',
  'renovation-management': 'common.svc.renovation',
};

/** Projects index + case template strings (SPEC §5.2, §5.3 "Template strings", Addendum A3.6.2, A7.2).
 *  gen-projects adds the generated keys: projects.index.count.init, projects.material.*, projects.<slug>.*. */
export const strings = {
  'projects.index.h1': { he: 'פרויקטים', en: 'Projects' },
  'projects.index.lead': { he: 'חללים נבחרים מתוך פרויקטים פרטיים, לפי חלל וחומר.', en: 'Selected spaces from private projects, by room and by material.' },
  'projects.index.view': { he: 'תצוגה', en: 'View' },
  'projects.index.viewIndex': { he: 'רשימה', en: 'Index' },
  'projects.index.viewGallery': { he: 'גלריה', en: 'Gallery' },
  'projects.index.spaceLabel': { he: 'חלל', en: 'Space' },
  'projects.index.space.all': { he: 'הכול', en: 'All' },
  'projects.index.materialLabel': { he: 'חומר', en: 'Material' },
  'projects.index.count.one': { he: 'חלל אחד מוצג', en: '1 space shown' },
  'projects.index.count.many': { he: '{n} חללים מוצגים', en: '{n} spaces shown' },
  'projects.index.empty': { he: 'אין חלל שעונה על שני המסננים יחד. נסו לבטל אחד מהם.', en: 'No space matches both filters. Try clearing one.' },
  'projects.index.clear': { he: 'ניקוי הסינון', en: 'Clear filters' },
  'projects.index.film': { he: 'סרט קצר מתוך העבודות', en: 'A short film from our work' },
  'projects.index.onsite.h2': { he: 'מהשטח', en: 'On site' },
  'projects.index.onsite.p': { he: 'לצד ההדמיות, צילום מעבודה שבוצעה: אותה שפה של חומר ואור, גם בשטח. הצילום אינו מוצג כאן כגרסה המבוצעת של אחת ההדמיות באתר.', en: 'Alongside the visualizations, a photograph of completed work: the same language of material and light, on site. It is not presented here as the built version of any visualization on this site.' },
  'projects.index.onsite.caption': { he: 'ארונות אלון כהה לגובה מלא ואי בהיר.', en: 'Full-height dark-oak cabinetry and a pale island.' },
  'projects.index.onsite.alt': { he: 'מטבח שבוצע: ארונות אלון כהה לגובה מלא עם פתחי אוורור, ארונות תחתונים בגוון חם, אי בגוון טרוורטין ומסילת תאורה.', en: 'A completed kitchen: full-height dark-oak cabinetry with vent grilles, warm-toned lower cabinets, a travertine-toned island and track lighting.' },

  'projects.case.space': { he: 'חלל', en: 'Space' },
  'projects.case.materials': { he: 'חומרים', en: 'Materials' },
  'projects.case.type': { he: 'סוג', en: 'Type' },
  'projects.case.typeValue': { he: 'פרויקט מגורים פרטי', en: 'Private residence' },
  'projects.case.status': { he: 'סטטוס', en: 'Status' },
  'projects.case.statusValue': { he: 'הדמיית תכנון', en: 'Design visualization' },
  'projects.case.relatedH2': { he: 'עוד על הפרויקט', en: 'More about this project' },
  'projects.case.serviceLabel': { he: 'השירות בפרויקט הזה', en: 'The service behind this project' },
  'projects.case.readLabel': { he: 'קריאה נוספת', en: 'Further reading' },
  'projects.case.lightH2': { he: 'אור', en: 'Light' },
  'projects.case.materialsH2': { he: 'החומרים', en: 'The materials' },
  'projects.case.materialsNote': materialsNote,
  'projects.case.ctaLine': { he: 'רוצים חלל כזה בבית שלכם?', en: 'Want a space like this at home?' },
  'projects.case.ctaButton': { he: 'לספר לנו על הבית', en: 'Tell us about your home' },
  'projects.case.next': { he: 'החלל הבא', en: 'Next space' },
  'projects.case.back': { he: 'חזרה לפרויקטים', en: 'Back to projects' },
  'projects.case.float': { he: 'צרו קשר', en: 'Contact' },
  'projects.case.filmCaption': { he: 'סרט קצר מתוך ההדמיות', en: 'A short film from the visualizations' },
};

const TYPE = { he: 'פרויקט מגורים פרטי', en: 'Private residence' };
const STATUS = { he: 'הדמיית תכנון', en: 'Design visualization' };

export default [
  // ------------------------------------------------------------------ 5.3.1
  {
    slug: 'stone-oak-kitchen', order: 1, spaceKey: 'kitchen', materialKeys: ['stone', 'light-oak'], heroLayout: 'full',
    numeral: { he: 'א׳', en: 'I' },
    title: { he: 'מטבח האבן', en: 'The Stone Kitchen' },
    h1Sub: { he: 'מטבח עם אי אבן ונגרות אלון', en: 'A stone-island kitchen with oak joinery' },
    space: { he: 'מטבח', en: 'Kitchen' },
    materials: { he: 'אבן עורקית, אלון בהיר, פלדה מוברשת', en: 'Veined stone, light oak, brushed steel' },
    type: TYPE, status: STATUS,
    hero: {
      file: 'kitchen-stone-01', w: 1312, h: 1199, pos: '50% 60%',
      alt: { he: 'מטבח במבט חזיתי: אי מאבן עורקית עם כיריים גז, ארונות אלון בהיר עד התקרה, נישה מוארת עם גב אבן, ווילון שקוף בצד. הדמיה.', en: 'A frontal view of a kitchen: a veined-stone island with a gas cooktop, floor-to-ceiling light-oak cabinetry, a lit niche backed in stone and a sheer curtain to the side. Render.' },
      caption: { he: 'האי והנישה, במבט חזיתי.', en: 'The island and the niche, head-on.' },
    },
    lead: { he: 'אי אחד, מאבן אחת. גוש של אבן עורקית שנראה כאילו נחצב בשלמותו, ומאחוריו קיר נגרות מאלון בהיר שעולה עד התקרה ומסתיר את כל מה שלא צריך להיראות.', en: 'One island, one stone. A block of veined stone that looks carved whole, and behind it a wall of light-oak joinery rising to the ceiling, hiding everything that needn’t be seen.' },
    body: { he: 'פתח אחד בלבד נשאר בקיר: נישה מוארת עם גב מאותה האבן, לפינת הקפה ולכיור. מה שנשאר גלוי הוא מה שבאמת צריך להיות שם: אש, מים, קפה ואור שמש שנכנס מבעד לווילון.', en: 'Only one opening remains in the wall: a lit niche backed in the same stone, for coffee and the sink. What stays in view is what truly belongs there: fire, water, coffee, and sunlight through a sheer curtain.' },
    plates: [
      {
        id: 'pl-2', file: 'kitchen-stone-02', w: 1312, h: 1199, layout: 'wide', pos: '50% 50%',
        caption: { he: 'האי במבט אלכסוני, ואור שמש שנשבר על המשטח.', en: 'The island at an angle, with sunlight breaking across the worktop.' },
        alt: { he: 'אי האבן במבט אלכסוני עם כיריים גז, נישה מוארת ופסי אור שמש על המשטח. הדמיה.', en: 'The stone island at an angle with a gas cooktop, the lit niche and bands of sunlight on the worktop. Render.' },
      },
      {
        id: 'pl-3', file: 'kitchen-stone-03', w: 1312, h: 1199, layout: 'detail', pos: '55% 45%',
        caption: { he: 'פינת הקפה: גב אבן עורקית, ברז פלדה מוברשת וכיור שקוע.', en: 'The coffee niche: a veined-stone splashback, a brushed-steel tap and an undermount sink.' },
        alt: { he: 'גב אבן עורקית בנישה מוארת, ברז פלדה מוברשת וכיור שקוע. הדמיה.', en: 'A veined-stone splashback in a lit niche, a brushed-steel tap and an undermount sink. Render.' },
        note: { he: 'האור נסתר בראש הנישה', en: 'Light concealed at the head of the niche' },
      },
    ],
    film: {
      name: 'case-kitchen-4x5',
      alt: { he: 'סרט קצר מתוך הדמיות המטבח: האי, הנישה והברז.', en: 'A short film from the kitchen visualizations: the island, the niche and the tap.' },
    },
    light: {
      file: 'light/stone-oak-kitchen', w: 560, h: 700, pos: '50% 50%',
      text: { he: 'הנישה מוארת מלמעלה בפס אור נסתר. האור נופל על פני האבן ומעורר את העורקים שלה, ובצד השני של החדר וילון שקוף מרכך את שמש אחר הצהריים.', en: 'The niche is washed from above by a concealed line of light. It grazes the stone and wakes its veining, while across the room a sheer curtain softens the afternoon sun.' },
      alt: { he: 'פרט מהנישה המוארת: פס אור חם בראש גב האבן. הדמיה.', en: 'A detail of the lit niche: a warm line of light at the top of the stone splashback. Render.' },
    },
    services: ['kitchen-design'],
    read: { label: { he: 'אבן למטבח', en: 'Kitchen stone' }, href: '/journal/choosing-kitchen-stone/' },
    builtPairConfirmed: false,
    next: 'oak-living-room',
  },

  // ------------------------------------------------------------------ 5.3.2
  {
    slug: 'oak-living-room', order: 2, spaceKey: 'living', materialKeys: ['light-oak', 'stone', 'dark-oak'], heroLayout: 'split',
    numeral: { he: 'ב׳', en: 'II' },
    title: { he: 'סלון באלון ואבן', en: 'Oak & Stone Living' },
    h1Sub: { he: 'עיצוב סלון עם ספריית אלון ואדן אבן', en: 'Living room design with oak shelving and a stone plinth' },
    space: { he: 'סלון', en: 'Living room' },
    materials: { he: 'אלון, אבן עורקית, טיח, אלון כהה', en: 'Oak, veined stone, plaster, dark oak' },
    type: TYPE, status: STATUS,
    hero: {
      file: 'living-01', w: 1122, h: 1402, pos: '50% 40%',
      alt: { he: 'סלון: טלוויזיה שקועה בקיר טיח, ספריית אלון עם כלי קרמיקה וספרים, אדן אבן לכל אורך הקיר ושולחן קפה מאלון כהה. הדמיה.', en: 'A living room: a TV set into a plaster wall, oak shelving with ceramics and books, a stone plinth along the whole wall and a dark-oak coffee table. Render.' },
      caption: { he: 'קיר אחד: טיח, מדפי אלון ואדן אבן.', en: 'One wall: plaster, oak shelves and a stone plinth.' },
    },
    lead: { he: 'קיר אחד שעושה הכול. טלוויזיה ששקועה בטיח, ספריית אלון דקה שמציגה רק את מה שנבחר, ואדן אבן ארוך שנמשך לכל אורך הקיר ומחבר ביניהם.', en: 'One wall that does everything. A television set flush into plaster, slender oak shelving that shows only what was chosen, and a long stone plinth running the length of the wall to tie it all together.' },
    body: { he: 'המדפים מחולקים בקצב לא שווה, כך שלכל חפץ יש מקום משלו: קרמיקה, ספר, נר. מול הקיר, שולחן קפה מאלון כהה עם פינות רכות מאזן את כל הבהירות.', en: 'The shelves are divided in an uneven rhythm, so every object has its own place: a ceramic, a book, a candle. Facing the wall, a dark-oak coffee table with softened corners balances all that lightness.' },
    plates: [
      {
        id: 'pl-2', file: 'living-03', w: 1145, h: 1374, layout: 'detail', pos: '50% 45%',
        caption: { he: 'הספרייה: קרמיקה, ספרים ואור של אחר הצהריים.', en: 'The shelves: ceramics, books and afternoon light.' },
        alt: { he: 'ספריית אלון בהירה עם כלי קרמיקה, ספרים ואור אחר הצהריים. הדמיה.', en: 'Light-oak shelving with ceramics, books and afternoon light. Render.' },
        note: { he: 'אור אחר הצהריים על אדן האבן', en: 'Afternoon light across the stone plinth' },
      },
      {
        id: 'pl-3', file: 'living-04', w: 1312, h: 1199, layout: 'wide', pos: '50% 55%',
        caption: { he: 'שולחן הקפה מאלון כהה.', en: 'The dark-oak coffee table.' },
        alt: { he: 'שולחן קפה מאלון כהה עם פינות מעוגלות, ספרים ופסל עץ, ואדן אבן ברקע. הדמיה.', en: 'A dark-oak coffee table with rounded corners, books and a wooden sculpture, with the stone plinth behind. Render.' },
      },
      {
        id: 'pl-4', file: 'living-02', w: 1117, h: 1408, layout: 'tall', pos: '50% 55%',
        caption: { he: 'חיפוי אלון בהיר מעל אדן אבן עם תאורה נסתרת.', en: 'Light-oak paneling above a stone plinth with concealed lighting.' },
        alt: { he: 'קיר מחופה אלון בהיר עם טלוויזיה, ומתחתיו אדן אבן עם פס אור נסתר ווילון שקוף. הדמיה.', en: 'A light-oak paneled wall with a TV, above a stone plinth with a hidden line of light and a sheer curtain. Render.' },
      },
    ],
    film: {
      name: 'case-living-4x5',
      alt: { he: 'סרט קצר מתוך הדמיות הסלון: חיפוי העץ, המדפים ושולחן הקפה.', en: 'A short film from the living-room visualizations: the paneling, the shelves and the coffee table.' },
    },
    light: {
      file: 'light/oak-living-room', w: 560, h: 700, pos: '50% 50%',
      text: { he: 'פס אור עדין מתחת לחיפוי העץ מפריד בינו לבין האבן, ונותן לקיר כולו תחושה של ריחוף.', en: 'A soft line of light beneath the oak paneling separates it from the stone and lets the whole wall seem to float.' },
      alt: { he: 'פרט: פס אור חם בין חיפוי האלון לאדן האבן. הדמיה.', en: 'A detail: a warm line of light between the oak paneling and the stone plinth. Render.' },
    },
    services: ['interior-design', 'space-planning'],
    read: { label: { he: 'נגרות בהתאמה אישית', en: 'Custom joinery' }, href: '/journal/custom-carpentry-guide/' },
    builtPairConfirmed: false,
    next: 'travertine-bathroom',
  },

  // ------------------------------------------------------------------ 5.3.3
  {
    slug: 'travertine-bathroom', order: 3, spaceKey: 'bath', materialKeys: ['travertine', 'walnut'], heroLayout: 'split',
    numeral: { he: 'ג׳', en: 'III' },
    title: { he: 'חדר רחצה בטרוורטין', en: 'The Travertine Bath' },
    h1Sub: { he: 'ארון אמבטיה כפול מטרוורטין', en: 'A double travertine vanity' },
    space: { he: 'חדר רחצה', en: 'Bathroom' },
    materials: { he: 'טרוורטין, אגוז, ברונזה מוברשת', en: 'Travertine, walnut, brushed bronze' },
    type: TYPE, status: STATUS,
    hero: {
      file: 'bath-01', w: 1132, h: 1390, pos: '50% 35%',
      alt: { he: 'חדר רחצה: כיור כפול מטרוורטין, שתי מראות עם תאורה אחורית, ברזי קיר בגוון ברונזה ומגירות אגוז. הדמיה.', en: 'A bathroom: a double travertine vanity, two backlit mirrors, bronze-toned wall taps and walnut drawers. Render.' },
      caption: { he: 'הכיור הכפול והמראות המוארות מאחור.', en: 'The double vanity and its backlit mirrors.' },
    },
    lead: { he: 'כיור כפול שנראה כמו גוש טרוורטין אחד, שתי מראות שמוארות מאחור, ברזי קיר בגוון ברונזה ומגירות אגוז. חדר שקט, שמרגישים אותו כבר מהדלת.', en: 'A double vanity that reads as a single block of travertine, two mirrors lit from behind, bronze-toned wall taps and walnut drawers. A quiet room you can feel from the doorway.' },
    body: { he: 'חדר רחצה הוא הרגע הכי פרטי בבית. הוא צריך להרגיש כמו נשימה. הטרוורטין עולה מהקיר ועד הכיור, וכך החדר נקרא כחומר אחד, ומתחת לאבן מרחפות מגירות האגוז ומוסיפות חום.', en: 'A bath is the most private moment in a home. It should feel like an exhale. The travertine runs from wall to basin, so the room reads as one material, and beneath the stone the walnut drawers float and add warmth.' },
    plates: [
      {
        id: 'pl-2', file: 'bath-02', w: 1024, h: 1536, layout: 'door', pos: '50% 45%',
        caption: { he: 'מבט דרך הדלת.', en: 'A view through the door.' },
        alt: { he: 'כיור טרוורטין, ברז קיר בגוון ברונזה ומגירות אגוז, במבט דרך הדלת. הדמיה.', en: 'A travertine basin, a bronze-toned wall tap and walnut drawers, seen through the door. Render.' },
      },
    ],
    film: {
      name: 'bath-threshold-4x5',
      caption: { he: 'סרט קצר: דרך הדלת, אל תוך החדר', en: 'A short film: through the door, into the room' },
      alt: { he: 'סרט קצר: מבט דרך הדלת שמתקרב אל הכיור, ואז החדר כולו. מתוך ההדמיות.', en: 'A short film: a view through the door moving toward the vanity, then the whole room. From the visualizations.' },
    },
    light: {
      file: 'light/travertine-bathroom', w: 520, h: 650, pos: '50% 50%',
      text: { he: 'האור יוצא מאחורי המראות, לא מעליהן. כך הוא נופל ברכות, והטרוורטין חושף כל נקבובית שלו.', en: 'The light comes from behind the mirrors, not above them. It falls softly, and the travertine shows every pore.' },
      alt: { he: 'פרט: קצה מראה עם תאורה אחורית על קיר טרוורטין. הדמיה.', en: 'A detail: the edge of a backlit mirror on a travertine wall. Render.' },
    },
    services: ['bathroom-design'],
    read: { label: { he: 'טרוורטין', en: 'Travertine' }, href: '/journal/travertine-guide/' },
    builtPairConfirmed: false,
    next: 'dark-oak-bedroom',
  },

  // ------------------------------------------------------------------ 5.3.4
  {
    slug: 'dark-oak-bedroom', order: 4, spaceKey: 'bedroom', materialKeys: ['dark-oak', 'linen', 'travertine'], heroLayout: 'full',
    numeral: { he: 'ד׳', en: 'IV' },
    title: { he: 'חדר שינה בפשתן ואלון', en: 'Linen & Oak Bedroom' },
    h1Sub: { he: 'עיצוב חדר שינה באלון כהה ופשתן', en: 'Bedroom design in dark oak and linen' },
    space: { he: 'חדר שינה', en: 'Bedroom' },
    materials: { he: 'אלון כהה, פשתן, טרוורטין', en: 'Dark oak, linen, travertine' },
    type: TYPE, status: STATUS,
    hero: {
      file: 'bedroom-01', w: 1312, h: 1199, pos: '50% 58%',
      alt: { he: 'חדר שינה: מיטה מרופדת מול קיר אלון כהה שמתעגל בקצוות, שולחנות צד מטרוורטין, מנורות תלויות ווילון שקוף. הדמיה.', en: 'A bedroom: an upholstered bed against a dark-oak wall that curves at its ends, travertine side tables, pendant lights and a sheer curtain. Render.' },
      caption: { he: 'המיטה וקיר האלון הכהה שעוטף אותה.', en: 'The bed and the dark-oak wall that wraps it.' },
    },
    lead: { he: 'חדר שמוריד את הווליום. קיר אלון כהה שמתעגל בקצוות ועוטף את המיטה, ראש מיטה מרופד בפשתן, שולחנות צד מטרוורטין ומנורות דקות שיורדות מהתקרה.', en: 'A room that turns the volume down. A dark-oak wall that curves at its ends to wrap the bed, a linen headboard, travertine side tables and slender pendants dropping from the ceiling.' },
    body: { he: 'האור נכנס מבעד לווילון ונשאר רך. המנורות התלויות מחליפות מנורות לילה, ומשאירות את שולחנות הצד פנויים לספר ולנר.', en: 'Light comes in through the curtain and stays soft. The pendants replace bedside lamps, leaving the side tables free for a book and a candle.' },
    plates: [
      {
        id: 'pl-2', file: 'bedroom-02', w: 1183, h: 1330, layout: 'detail', pos: '45% 45%',
        caption: { he: 'ראש מיטה מפשתן, פאנל עץ מעוגל ושולחן צד מטרוורטין.', en: 'A linen headboard, a curved wood panel and a travertine side table.' },
        alt: { he: 'ראש מיטה מרופד בפשתן, פאנל אלון כהה מעוגל ושולחן צד מטרוורטין. הדמיה.', en: 'A linen headboard, a curved dark-oak panel and a travertine side table. Render.' },
        note: { he: 'הפאנל מתעגל: פינה שלא נגמרת בזווית', en: 'The panel curves: a corner that doesn’t end in an angle' },
      },
    ],
    film: {
      name: 'case-bedroom-4x5',
      alt: { he: 'סרט קצר מתוך הדמיות חדר השינה: המיטה, קיר העץ ושולחן הצד.', en: 'A short film from the bedroom visualizations: the bed, the wood wall and the side table.' },
    },
    light: {
      file: 'light/dark-oak-bedroom', w: 480, h: 600, pos: '50% 50%',
      text: { he: 'שמש אחר הצהריים מציירת טריז של אור על הקיר, מעל קו העץ הכהה, והווילון השקוף מרכך אותה.', en: 'Afternoon sun draws a wedge of light on the wall above the dark wood line, softened by the sheer curtain.' },
      alt: { he: 'פרט: טריז של אור שמש על קיר בהיר מעל חיפוי אלון כהה. הדמיה.', en: 'A detail: a wedge of sunlight on a pale wall above dark-oak paneling. Render.' },
    },
    services: ['interior-design'],
    read: { label: { he: 'מינימליזם חם', en: 'Warm minimalism' }, href: '/journal/warm-minimalism/' },
    builtPairConfirmed: false,
    next: 'dark-oak-kitchen',
  },

  // ------------------------------------------------------------------ 5.3.5 (a short space page; noindex, Addendum L9)
  {
    slug: 'dark-oak-kitchen', order: 5, spaceKey: 'kitchen', materialKeys: ['dark-oak', 'stone'], heroLayout: 'split',
    numeral: { he: 'ה׳', en: 'V' },
    title: { he: 'מטבח באלון כהה', en: 'The Dark-Oak Kitchen' },
    h1Sub: { he: 'מטבח עץ אלון כהה עם כיור אבן אינטגרלי', en: 'A dark-oak kitchen with an integrated stone sink' },
    space: { he: 'מטבח', en: 'Kitchen' },
    materials: { he: 'אלון כהה, לכה בגוון גרייג\', אבן, מתכת כהה', en: 'Dark oak, greige lacquer, stone, dark metal' },
    type: TYPE, status: STATUS,
    hero: {
      file: 'kitchen-dark-01', w: 1023, h: 1537, pos: '50% 38%',
      alt: { he: 'פינת מטבח: אלון כהה, ארונות בלכה בגוון גרייג\', כיור אבן אינטגרלי, ברז שחור מט ומדפי מתכת כהים עם תאורה אחורית. הדמיה.', en: 'A kitchen corner: dark oak, greige lacquered cabinets, an integrated stone sink, a matte-black tap and dark metal shelving lit from behind. Render.' },
      caption: { he: 'פינת המטבח: אלון כהה, לכה ומדפים מוארים.', en: 'The kitchen corner: dark oak, lacquer and lit shelving.' },
    },
    lead: { he: 'אלון כהה, לכה בגוון גרייג\', כיור אבן אינטגרלי ומדפי מתכת כהים עם אור מאחור. מטבח שהאור בו יוצא מתוך הקיר.', en: 'Dark oak, greige lacquer, an integrated stone sink and dark metal shelving lit from behind: a kitchen where the light comes out of the wall.' },
    body: null,
    plates: [],
    film: null,
    light: {
      file: 'light/dark-oak-kitchen', w: 560, h: 700, pos: '50% 50%',
      text: { he: 'מדפי המתכת מוארים מאחור, והאור יוצא מתוך הקיר בפסים אנכיים שקטים.', en: 'The metal shelves are lit from behind, so the light comes out of the wall in quiet vertical lines.' },
      alt: { he: 'פרט: מדפי מתכת כהים עם תאורה אחורית חמה. הדמיה.', en: 'A detail: dark metal shelving with warm backlighting. Render.' },
    },
    services: ['kitchen-design'],
    read: { label: { he: 'תכנון תאורה', en: 'Lighting design' }, href: '/journal/home-lighting-design/' },
    // Owner question SPEC §11.5: true only when the owner confirms built-01 is the executed kitchen-dark-01 design
    // (must equal data/site.json → confirm.built01SameAsDarkKitchen). Then gen-projects adds #from-render-to-built
    // (the built-01 figure reuses projects.index.onsite.alt; the render reuses this case's hero alt).
    builtPairConfirmed: false,
    fromRenderToBuilt: {
      h2: { he: 'מההדמיה לביצוע', en: 'From visualization to built' },
      text: { he: 'אותו מטבח, פעמיים: פעם בהדמיה ופעם בצילום אחרי הביצוע.', en: 'The same kitchen, twice: once as a visualization and once photographed after it was built.' },
      built: { file: 'built-01', w: 1023, h: 1537, pos: '50% 50%' },
    },
    next: 'stone-oak-kitchen',
  },
];
