#!/usr/bin/env node
// SELÈ STUDIO — tools/test/prose.test.mjs (P8) — gen-prose on a temp fixture (SPEC-ADDENDUM A11 P8 acceptance)
//
//   node --test tools/test/prose.test.mjs        (or: node tools/test/prose.test.mjs)
//
// The fixture renders one service page and one article that together use EVERY block type (incl. `sources` and
// `swatches`), variants, a gated block, gated list / steps / FAQ items and a gated page, into a temp dir built
// from the repo's own templates, dictionaries and images. `buildFixture()` is exported for previews.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as gp from '../gen-prose.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bi = (he, en) => ({ he, en });

// ------------------------------------------------------------------ fixture data
export function kitchenFixture() {
  return {
    meta: {
      id: 'service-kitchen-design', path: '/services/kitchen-design/', type: 'service',
      crumb: bi('עיצוב מטבח', 'Kitchen design'),
      title: bi('עיצוב מטבח — אבן, עץ ואור בתכנון מדויק | SELÈ STUDIO', 'Kitchen Design in Israel — Stone, Oak & Light | SELÈ STUDIO'),
      desc: bi('עיצוב ותכנון מטבח בהתאמה אישית: אי אבן, נגרות עץ אלון עד התקרה ותאורה משולבת בנישות. סטודיו בוטיק בהובלת שוהם סלע, בוגרת שנקר. ספרו לנו על המטבח שלכם.',
        'Kitchen design and planning in Israel: stone islands, full-height oak joinery, lit niches. Boutique studio led by Shenkar graduate Shoham Sela. Get in touch.'),
      h1: bi('עיצוב מטבח שמתחיל בהרגלים שלכם ונגמר בפרט האחרון', 'Kitchen design that starts with how you live and ends with the last detail'),
      latin: 'KITCHEN',
      hero: { img: 'kitchen-stone-01', kind: 'render', pos: '50% 50%',
        alt: bi('מטבח ובו אי אבן מונוליתי בגוון אפור-חמים וכיריים גז, קיר נגרות מעץ אלון בהיר עד התקרה ונישת אבן מוארת עם כיור ומכונת קפה',
          'Kitchen with a monolithic warm-grey stone island and gas cooktop, full-height light-oak cabinetry and a backlit stone niche with sink and coffee machine'),
        caption: bi('אי אבן, נגרות אלון עד התקרה ונישה מוארת.', 'Stone island, full-height oak joinery and a backlit niche.') },
      og: '/assets/img/og/og-service-kitchen-design.jpg',
      ogAlt: bi('מטבח ובו אי אבן מונוליתי בגוון אפור-חמים וכיריים גז, קיר נגרות מעץ אלון בהיר עד התקרה ונישת אבן מוארת עם כיור ומכונת קפה',
        'Kitchen with a monolithic warm-grey stone island and gas cooktop, full-height light-oak cabinetry and a backlit stone niche with sink and coffee machine'),
      service: { name: bi('עיצוב מטבח', 'Kitchen design') },
      requires: [], index: true,
    },
    body: [
      { t: 'lead', text: bi('במטבח משתמשים יותר מבכל חדר אחר בבית, ולכן הוא גם החדר שהכי פחות סולח על טעויות: מגירה שנתקעת בידית של התנור, מעבר צר מדי סביב האי, משטח שנגמר בדיוק במקום שבו רוצים להניח סיר חם. ב-SELÈ STUDIO עיצוב מטבח מתחיל בשאלה איך אתם מבשלים, מארחים ופותחים את הבוקר, ורק אחר כך עובר לאבן, לעץ ולאור.',
        'The kitchen is used more than any other room in the house, which makes it the least forgiving of mistakes: a drawer that catches on the oven handle, a walkway around the island that\'s too tight, a worktop that ends exactly where you need to set down a hot pan. At SELÈ STUDIO, kitchen design starts with how you cook, host and begin your morning, and only then moves on to stone, wood and light.') },
      { t: 'p', text: { he: 'אנחנו מתכננים מטבחים לדירות ולבתים פרטיים, כחלק מעיצוב הבית כולו. כמה פרטים חוזרים בעבודה שלנו: אי אבן שנקרא כגוש אחד, נגרות עץ שעולה עד התקרה ונבלעת בקיר, ותאורה נסתרת שהופכת נישה או מדף לרגע קטן של אור. נקי, מדויק ונכון.',
        en: 'We design kitchens for apartments and private homes, as part of a whole-home project. A few details recur in our work: a stone island that reads as a single block, wood joinery that runs to the ceiling and disappears into the wall, and hidden lighting that turns a niche or a shelf into a small moment of light. Clean, precise and right.',
        variants: [{ requires: 'singleRoomProjects', he: 'אנחנו מתכננים מטבחים לדירות ולבתים פרטיים, כחלק מעיצוב הבית כולו או כפרויקט ממוקד. כמה פרטים חוזרים בעבודה שלנו: אי אבן שנקרא כגוש אחד, נגרות עץ שעולה עד התקרה ונבלעת בקיר, ותאורה נסתרת שהופכת נישה או מדף לרגע קטן של אור. נקי, מדויק ונכון.',
          en: 'We design kitchens for apartments and private homes, as part of a whole-home project or as a focused project of their own. A few details recur in our work: a stone island that reads as a single block, wood joinery that runs to the ceiling and disappears into the wall, and hidden lighting that turns a niche or a shelf into a small moment of light. Clean, precise and right.' }] } },
      { t: 'h2', text: bi('תכנון מטבח עם אי: אזורי עבודה, ישיבה ומרווחים', 'Planning a kitchen with an island: work zones, seating and clearances') },
      { t: 'p', text: bi('לפני שבוחרים גוון אבן, מחליטים מה תפקיד האי. הוא יכול להיות אזור הבישול, משטח ההכנה, תחנת שטיפה, שולחן לארוחת בוקר, או כמה מאלה יחד. כל תפקיד משנה את התכנון: נקודות גז, חשמל וניקוז ברצפה, פתרון יניקת אדים, עומק המשטח ומה נכנס מתחתיו.',
        'Before choosing a stone, decide what the island is for. It can be the cooking zone, the prep surface, a washing station, a breakfast table, or several of these at once. Each role changes the plan: gas, power and drainage points in the floor, how cooking fumes are extracted, the depth of the worktop and what goes underneath it.') },
      { t: 'h3', text: bi('אזורי עבודה, לא רק משולש', 'Work zones, not just a triangle') },
      { t: 'p', text: bi('"משולש העבודה" (כיריים, כיור ומקרר במרחק נוח זה מזה) עדיין כלי טוב, אבל במטבח פתוח נכון יותר לחשוב באזורים: אחסון ומקרר, הכנה ושטיפה, בישול, הגשה. המטרה היא שהמסלול הטבעי, מהמקרר לכיור, למשטח ההכנה ולכיריים, יזרום בלי לחצות את מי שיושב ליד האי ואת המעבר לסלון.',
        'The "work triangle" (hob, sink and fridge within easy reach of each other) is still a useful tool, but in an open-plan kitchen it is better to think in zones: storage and fridge, prep and washing, cooking, serving. The aim is for the natural route, from fridge to sink to prep surface to hob, to flow without cutting across whoever sits at the island or the path to the living room.') },
      { t: 'h3', text: bi('המרווחים סביב האי', 'Clearances around the island') },
      { t: 'p', text: bi('המעבר בין האי לחזית הארונות הוא המידה שהכי קל לטעות בה. כנקודת פתיחה מקובלת, מעבר של כ-100–120 ס"מ מאפשר לפתוח מדיח ומגירות ולעבור מאחורי מי שמבשל. המידה הסופית נגזרת מהחלל, מהמכשירים ומכיווני הפתיחה, ולכן אנחנו בודקים אותה בתוכנית ובהדמיה, ולא לפי העין.',
        'The walkway between the island and the cabinet fronts is the measurement people most often get wrong. As a common starting point, about 100–120 cm lets you open the dishwasher and drawers and pass behind the person cooking. The final dimension depends on the room, the appliances and the way doors open, which is why we check it on the plan and in a render, not by eye.') },
      { t: 'figure', img: 'kitchen-stone-02', kind: 'render',
        alt: bi('אי אבן במטבח בזווית: האבן ממשיכה מהמשטח אל הדופן ויורדת עד הרצפה, כיריים גז ואור שמש על נגרות עץ האלון',
          'Angled view of a stone kitchen island: the stone wraps from the worktop down the side to the floor, with a gas cooktop and sunlight across the oak joinery'),
        caption: bi('האבן ממשיכה מהמשטח אל הדופן, עד הרצפה.', 'The stone wraps from worktop to floor.') },
      { t: 'h2', text: bi('נגרות עד התקרה ואחסון שלא רואים', 'Joinery to the ceiling and storage you don\'t see') },
      { t: 'p', text: bi('ארון שעולה עד התקרה עושה שני דברים: הוא מוסיף שורת אחסון שלמה, והוא מבטל את המדף העליון שאוסף אבק ונראה תמיד קצת לא גמור. כשהחזיתות רציפות והמרווחים ביניהן דקים, קיר הנגרות נקרא כמשטח עץ אחד ולא כאוסף של דלתות.',
        'Cabinetry that rises to the ceiling does two things: it adds a whole extra row of storage, and it removes the top ledge that collects dust and always looks slightly unfinished. With continuous fronts and fine gaps between them, the joinery wall reads as one surface of wood rather than a collection of doors.') },
      { t: 'ul', items: [
        bi('**מכשירים בתוך הקיר:** מקרר, מקפיא ותנורים בארונות גבוהים מאחורי חזיתות עץ.', '**Appliances inside the wall:** fridge, freezer and ovens in tall units behind wood fronts.'),
        bi('**מזווה עם מגירות פנימיות:** במקום מדפים עמוקים שבהם דברים נעלמים מאחור.', '**A pantry with internal drawers:** instead of deep shelves where things vanish at the back.'),
        { he: '**פריט מגודר:** שורה שמוצגת רק כשהבעלים מאשרים.', en: '**A gated item:** shown only when the owner confirms.', requires: 'newBuild' },
        bi('**מגירות רחבות למטה:** לסירים ולכלים, נוחות יותר מדלת ומדף.', '**Wide drawers below:** for pots and pans, easier to use than a door and shelf.'),
      ] },
      { t: 'p', text: bi('על ההחלטות שקובעות את איכות הנגרות, מהחזית ועד המנגנון, כתבנו ב[מדריך לתכנון נגרות עם מעצבת](/journal/custom-carpentry-guide/).',
        'We cover the decisions that determine joinery quality, from front to hinge, in our [guide to planning joinery with a designer](/en/journal/custom-carpentry-guide/).') },
      { t: 'figure', img: 'built-01', kind: 'photo',
        alt: bi('מטבח שבוצע: ארונות אלון כהה עד התקרה עם סבכות אוורור, ארונות בגוון בהיר, אי מטרוורטין עם כיריים ותאורת מסילה',
          'Built kitchen: full-height dark-oak cabinetry with ventilation grilles, light-toned units, a travertine island with cooktop and track lighting'),
        caption: bi('נגרות עד התקרה עם אוורור למכשירים המוסתרים.', 'Full-height joinery, ventilated for the hidden appliances.') },
      { t: 'h2', text: bi('משטח עבודה וחיפוי: מה בוחרים ואיפה', 'Worktop and splashback: what to choose, and where') },
      { t: 'table', head: [bi('חומר', 'Material'), bi('אופי', 'Character'), bi('מה לזכור', 'Keep in mind')], rows: [
        [bi('אבן טבעית', 'Natural stone'), bi('עורקים שאין להם העתק', 'Veining that can\'t be copied'), bi('בודקים רגישות לכתמים ומתכננים איטום', 'Test for stains and plan sealing')],
        [bi('משטח קוורץ מהונדס', 'Engineered quartz'), bi('אחיד ועמיד לכתמים', 'Even and stain-resistant'), bi('רגיש יותר לחום ישיר', 'More sensitive to direct heat')],
        [bi('פורצלן', 'Porcelain'), bi('עמיד לחום ולשריטות', 'Resistant to heat and scratches'), bi('דורש עיבוד מקצועי בפינות', 'Needs professional fabrication at corners')],
      ] },
      { t: 'p', text: bi('כדי שאי מאבן ייראה כגוש אחד, צריך תכנון חיתוך: כשהאבן יורדת בדפנות עד הרצפה, מסדרים את הלוחות כך שהעורקים ימשיכו מהמשטח אל הדופן. את ההשוואה המלאה ריכזנו ב[מדריך לבחירת אבן ומשטח למטבח](/journal/choosing-kitchen-stone/), ואת ההדמיות ב[שירות ההדמיות](/services/3d-visualization/).',
        'For a stone island to read as a single block, it needs a cutting plan: where the stone wraps down the sides to the floor, the slabs are laid out so the veining continues from the top onto the side. The full comparison is in our [guide to choosing kitchen stone and worktops](/journal/choosing-kitchen-stone/), and renders in [the visualization service](/services/3d-visualization/).') },
      { t: 'note', text: bi('גוון חם, בסביבות 2700–3000K, משלים עץ ואבן. מדד CRI גבוה (90 ומעלה) שומר על הצבע האמיתי של האבן ושל האוכל.',
        'A warm tone around 2700–3000K complements wood and stone. A high CRI (90 and above) keeps the true color of the stone and the food.') },
      { t: 'h2', text: bi('איך נראה תכנון מטבח איתנו', 'How kitchen planning works with us') },
      { t: 'steps', items: [
        { title: bi('היכרות', 'Getting to know you'), text: bi('מי מבשל, כמה, מה צריך להיות בהישג יד ומה מפריע במטבח היום.', 'Who cooks, how much, what needs to be within reach and what bothers you in the kitchen today.') },
        { title: bi('מדידה ותיעוד', 'Measuring and recording'), text: bi('קירות, חלונות, ונקודות מים, ניקוז, גז וחשמל קיימות.', 'Walls, windows, and the existing water, drainage, gas and power points.') },
        { title: bi('הדמיות כשירות', 'Renders as a service'), text: bi('שלב שמופיע רק אם הבעלים מאשרים.', 'A step shown only when the owner confirms.'), requires: 'renderStages' },
        { title: bi('תוכניות עבודה', 'Working drawings'), text: bi('פרטי נגרות, חשמל ותאורה, פרזול ומכשירים, ברמת פירוט שבעלי המקצוע יכולים לבצע.', 'Joinery details, electrical and lighting, hardware and appliances, at a level of detail tradespeople can build from.'), requires: 'workingDrawings' },
      ] },
      { t: 'h2', text: bi('מטבחים מתוך העבודה שלנו', 'Kitchens from our work') },
      { t: 'p', text: bi('**צילום מהביצוע:** לצד ההדמיות מופיע גם צילום של מטבח שבוצע, עם נגרות עד התקרה ופתחי אוורור למכשירים המוסתרים.',
        '**From the build:** alongside the renders is a photograph of a built kitchen, with joinery to the ceiling and ventilation openings for the hidden appliances.') },
      { t: 'gallery', items: [
        { img: 'built-01', kind: 'photo', alt: bi('מטבח שבוצע: ארונות אלון כהה עד התקרה עם סבכות אוורור, ארונות בגוון בהיר ואי מטרוורטין עם כיריים', 'Built kitchen: full-height dark-oak cabinetry with ventilation grilles, light-toned units and a travertine island with cooktop'), caption: bi('נגרות עד התקרה עם אוורור.', 'Full-height joinery with ventilation.') },
        { img: 'kitchen-stone-01', kind: 'render', alt: bi('מטבח ובו אי אבן מונוליתי, קיר נגרות מעץ אלון בהיר עד התקרה ונישת אבן מוארת עם מכונת קפה', 'Kitchen with a monolithic stone island, full-height light-oak cabinetry and a backlit stone niche with a coffee machine'), caption: bi('אי אבן ונגרות אלון.', 'Stone island and oak joinery.') },
        { img: 'kitchen-stone-02', kind: 'render', alt: bi('אי אבן במטבח בזווית, האבן ממשיכה מהמשטח אל הדופן ויורדת עד הרצפה באור שמש', 'Angled view of a stone island, the stone wrapping from the worktop down to the floor in sunlight') },
        { img: 'kitchen-stone-03', kind: 'render', alt: bi('תקריב של נישת אבן מוארת במטבח: חיפוי בלוח אבן גדול, כיור שקוע ומכונת קפה', 'Close-up of a backlit stone niche: large-slab stone splashback, undermount sink and coffee machine'), caption: bi('חיפוי ומשטח מאותה אבן.', 'Splashback and worktop in the same stone.') },
        { img: 'kitchen-dark-01', kind: 'render', alt: bi('פינת מטבח באלון כהה וחזיתות גרייג\', כיור אבן אינטגרלי, ברז שחור מט ומדפי מתכת כהים', 'Dark-oak kitchen corner with greige fronts, an integrated stone sink, matte-black tap and dark-metal shelving'), caption: bi('תאורה אחורית במדפים.', 'Backlit shelving.') },
      ] },
      { t: 'projects', items: [
        { href: '/projects/stone-oak-kitchen/', title: bi('מטבח עם אי אבן ונגרות אלון בהיר', 'Stone-island kitchen with light oak'), text: bi('אי אבן מונוליתי עם כיריים, קיר נגרות עד התקרה ונישת אבן מוארת לפינת הקפה.', 'A monolithic stone island with hob, a floor-to-ceiling joinery wall and a backlit stone niche for the coffee corner.') },
        { href: '/projects/dark-oak-kitchen/', title: bi('מטבח באלון כהה', 'Dark-oak kitchen'), text: bi('עץ אלון כהה, חזיתות בגוון גרייג\', כיור אבן אינטגרלי ומדפי מתכת עם תאורה אחורית.', 'Dark oak, greige fronts, an integrated stone sink and backlit metal shelving.') },
      ] },
      { t: 'p', text: bi('בחדר רחצה נכון להבחין בין ליווי עיצובי לבין פיקוח עליון, שהוא מונח מקצועי אחר.', 'In a bathroom it is worth separating design support from <span lang="he">פיקוח עליון</span>, which is a different professional term.') },
      { t: 'p', text: bi('בעבודה מול הנגר, ההבדל בין פיקוח עליון לליווי עיצובי חשוב.', 'Working with the carpenter, the difference between פיקוח עליון and design support matters.') },
      { t: 'p', text: bi('בכל פרויקט של SELÈ STUDIO המטבח נקרא כחלק מהבית.', 'In every project the kitchen reads as part of the home.') },
      { t: 'p', requires: 'contractorQuotes', text: bi('פסקה מגודרת שנעלמת בברירת המחדל.', 'A gated paragraph that is gone by default.') },
      { t: 'checklist', h: bi('מה להכין לפגישה', 'What to prepare'), level: 2, items: [
        bi('תוכנית של הדירה או הבית, אם יש', 'A plan of the apartment or house, if you have one'),
        bi('תמונות של המטבח הקיים', 'Photos of the current kitchen'),
        bi('רשימת המכשירים שנשארים', 'A list of the appliances that stay'),
      ] },
      { t: 'faq', h: bi('שאלות נפוצות על עיצוב מטבח', 'Kitchen design FAQ'), items: [
        { q: bi('כמה מקום צריך בשביל אי במטבח?', 'How much space do you need for a kitchen island?'), a: bi('מעבר לגודל האי עצמו, צריך מעבר נוח סביבו. כנקודת פתיחה מקובלת, כ-100–120 ס"מ בין האי לחזית הארונות.', 'Beyond the island itself, you need comfortable circulation around it. As a common starting point, allow about 100–120 cm between the island and the cabinet fronts.') },
        { q: bi('שאלה מגודרת?', 'A gated question?'), a: bi('תשובה מגודרת.', 'A gated answer.'), requires: 'singleRoomProjects' },
        { q: bi('עדיף כיריים או כיור באי?', 'Hob or sink on the island?'), a: bi('תלוי איך מבשלים. כיריים באי מאפשרות לבשל מול האורחים, אבל מחייבות פתרון יניקה מעל האי או בתוכו, ומרחק מהישיבה.', 'It depends on how you cook. A hob on the island lets you cook facing your guests, but needs extraction above or within the island and distance from the seating.') },
        { q: bi('מתי כדאי לפנות למעצבת בשיפוץ מטבח?', 'When should you bring in a designer for a kitchen renovation?'), a: bi('לפני שמזמינים נגרות ולפני שקובעים נקודות מים, ניקוז וחשמל. פנייה מוקדמת מאפשרת לתכנן את האי, התאורה והנגרות כמערכת אחת.', 'Before the joinery is ordered and before water, drainage and power points are fixed. Starting early lets the island, lighting and joinery be planned as one system.') },
      ] },
      { t: 'cta', h: bi('מתכננים מטבח חדש או שיפוץ?', 'Planning a new kitchen or a renovation?'), p: bi('ספרו לנו על החלל, על מה שעובד בו היום ועל מה שלא. נחזור אליכם לתיאום פגישת היכרות.', 'Tell us about the space, what works in it today and what doesn\'t. We\'ll get back to you to arrange an introductory meeting.'), button: bi('לתיאום פגישת היכרות', 'Book an introductory meeting'), href: '/contact/' },
    ],
  };
}

export function articleFixture() {
  const para = bi('מינימליזם חם הוא בית שקט שלא מרגיש קר: מעט חפצים, הרבה חומר. עץ אלון, אבן טבעית, פשתן ואור רך בונים יחד חלל שנעים לחיות בו, ולא רק להסתכל עליו. הסוד הוא בפרטים הקטנים, במרקם ובאור שנופל עליהם לאורך היום.',
    'Warm minimalism is a calm home that doesn\'t feel cold: few objects, a lot of material. Oak, natural stone, linen and soft light together make a space that is pleasant to live in, not just to look at. The secret is in the small details, in texture and in the light that falls on them through the day.');
  return {
    meta: {
      id: 'journal-warm-minimalism', path: '/journal/warm-minimalism/', type: 'article',
      crumb: bi('מינימליזם חם', 'Warm minimalism'),
      title: bi('מינימליזם חם בעיצוב פנים: חומר, אור ושקט | SELÈ STUDIO', 'Warm Minimalism: Material and Light | SELÈ STUDIO'),
      desc: bi('מינימליזם חם בעיצוב פנים: איך בונים בית שקט ונעים עם עץ אלון, אבן טבעית, פשתן ואור רך, בלי שהחלל ירגיש קר או ריק. מדריך מאת SELÈ STUDIO.',
        'Warm minimalism in interior design: how to build a calm, welcoming home with oak, natural stone, linen and soft light, without it ever feeling cold or empty.'),
      h1: bi('מינימליזם חם: בית שקט שלא מרגיש קר', 'Warm minimalism: a calm home that never feels cold'),
      latin: 'JOURNAL',
      hero: { img: 'living-01', kind: 'render',
        alt: bi('סלון עם טלוויזיה משולבת בקיר טיח, ספריית אלון בהיר עם קרמיקה וספרים ושולחן קפה מאלון כהה',
          'Living room with a TV set into a plaster wall, light-oak shelving with ceramics and a dark-oak coffee table') },
      og: '/assets/img/og/og-journal-warm-minimalism.jpg',
      ogAlt: bi('חדר שינה עם מיטה מרופדת, קיר ראש מיטה מעוגל מאלון כהה, מנורות תלויות ושידות טרוורטין', 'Bedroom with an upholstered bed, a curved dark-oak headboard wall, pendant lights and travertine side tables'),
      article: { section: 'style', service: 'interior-design', author: 'org', published: '2026-09-28', modified: null },
      requires: [], index: true,
    },
    body: [
      { t: 'lead', text: para },
      { t: 'h2', text: bi('מה זה מינימליזם חם', 'What warm minimalism is') },
      { t: 'p', text: para },
      { t: 'ol', items: [bi('פחות חפצים', 'Fewer objects'), bi('יותר חומר', 'More material'), bi('אור רך', 'Soft light')] },
      { t: 'h2', text: bi('פלטת החומרים', 'The material palette') },
      { t: 'swatches', items: [
        { img: 'materials/marble', alt: bi('אבן שיש עם גידים', 'Veined marble'), name: bi('**אבן**', '**Stone**'), text: bi('עורקים רכים שנותנים עומק.', 'Soft veining that gives depth.') },
        { img: 'materials/light-oak', alt: bi('אלון בהיר', 'Light oak'), name: bi('אלון בהיר', 'Light oak'), text: bi('חום ואור במשטחים גדולים.', 'Warmth and light on large surfaces.') },
        { img: 'materials/travertine', alt: bi('טרוורטין', 'Travertine'), name: bi('טרוורטין', 'Travertine'), text: bi('נקבובי, רך ומט.', 'Porous, soft and matte.') },
      ] },
      { t: 'figure', img: 'bedroom-01', kind: 'render', layout: 'wide',
        alt: bi('חדר שינה עם מיטה מרופדת, קיר ראש מיטה מעוגל מאלון כהה, מנורות תלויות ושידות טרוורטין', 'Bedroom with an upholstered bed, a curved dark-oak headboard wall, pendant lights and travertine side tables'),
        caption: bi('אלון כהה, פשתן וטרוורטין.', 'Dark oak, linen and travertine.') },
      { t: 'h2', text: bi('איך מתחילים', 'Where to start') },
      { t: 'p', text: para },
      { t: 'checklist', h: bi('לפני שמתחילים', 'Before you start'), level: 3, items: [bi('לבחור שלושה חומרים', 'Choose three materials'), bi('לתכנן אור ערב', 'Plan evening light')] },
      { t: 'faq', h: bi('שאלות נפוצות על מינימליזם חם', 'Warm minimalism FAQ'), items: [
        { q: bi('האם מינימליזם חם מתאים לדירה קטנה?', 'Does warm minimalism suit a small apartment?'), a: bi('כן. פחות חפצים ויותר חומר עוזרים לחלל קטן להרגיש רגוע.', 'Yes. Fewer objects and more material help a small space feel calm.') },
      ] },
      { t: 'sources', h: bi('מקורות', 'Sources'), items: [
        { label: bi('מינהל התכנון', 'Planning Administration'), href: 'https://www.gov.il/he/departments/iplan' },
      ] },
      { t: 'cta', h: bi('רוצים בית שקט וחם?', 'Want a calm, warm home?'), p: bi('ספרו לנו על הבית, ונחזור אליכם לתיאום פגישת היכרות.', 'Tell us about your home and we\'ll get back to you to arrange a first meeting.'), button: bi('לספר לנו על הבית', 'Tell us about your home') },
    ],
  };
}
export function gatedFixture() {
  const k = kitchenFixture();
  k.meta.id = 'service-3d-visualization'; k.meta.path = '/services/3d-visualization/'; k.meta.requires = ['renderStages'];
  k.meta.crumb = bi('הדמיות תלת מימד', '3D visualization');
  k.body = k.body.filter((b) => b.t !== 'faq');
  return k;
}

const IMAGES = ['kitchen-stone-01', 'kitchen-stone-02', 'kitchen-stone-03', 'kitchen-dark-01', 'built-01', 'living-01', 'bedroom-01'];
const MATERIALS = ['marble', 'light-oak', 'travertine'];

/** buildFixture(dir, { repo, site, link }) — a minimal site tree for gen-prose; link=true symlinks assets instead of copying */
export function buildFixture(dir, { repo = REPO, site, link = false, services = { 'kitchen-design': kitchenFixture(), '3d-visualization': gatedFixture() }, articles = { 'warm-minimalism': articleFixture() } } = {}) {
  const mk = (p) => fs.mkdirSync(path.join(dir, p), { recursive: true });
  const cp = (from, to = from) => { mk(path.dirname(to)); fs.copyFileSync(path.join(repo, from), path.join(dir, to)); };
  for (const t of ['service', 'article', 'journal']) cp(`tools/templates/prose-${t}.html`);
  cp('js/i18n/common.js'); cp('js/i18n/prose.js');
  cp('data/journal/_index.json');
  if (link) { mk('assets'); fs.symlinkSync(path.join(repo, 'assets/img'), path.join(dir, 'assets/img')); }
  else {
    for (const id of IMAGES) for (const ext of ['.jpg', '.webp', '-640.webp', '-1024.webp']) if (fs.existsSync(path.join(repo, 'assets/img', id + ext))) cp(`assets/img/${id}${ext}`);
    for (const id of MATERIALS) for (const ext of ['.jpg', '.webp']) cp(`assets/img/materials/${id}${ext}`);
  }
  mk('data/services'); mk('data/journal');
  for (const [s, d] of Object.entries(services)) fs.writeFileSync(path.join(dir, `data/services/${s}.json`), JSON.stringify(d, null, 2));
  for (const [s, d] of Object.entries(articles)) fs.writeFileSync(path.join(dir, `data/journal/${s}.json`), JSON.stringify(d, null, 2));
  if (site) fs.writeFileSync(path.join(dir, 'data/site.json'), JSON.stringify(site, null, 2));
  return dir;
}

// ------------------------------------------------------------------ helpers
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `prose-${name}-`));
async function run(dir, ...args) {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try { const code = await gp.main(['--root', dir, '--quiet', ...args]); return { code, out: logs.join('\n') }; }
  finally { console.log = orig; }
}
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
/** tiny DOM query: the opening tag of the first element matching `re`, plus its inner HTML */
function element(html, re) {
  const m = re.exec(html);
  if (!m) return null;
  const tag = m[0].match(/^<([a-z0-9]+)/i)[1];
  const start = m.index + m[0].length;
  const openRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  openRe.lastIndex = start;
  let depth = 1, x;
  while ((x = openRe.exec(html))) { if (x[1]) { if (--depth === 0) return { open: m[0], inner: html.slice(start, x.index) }; } else depth++; }
  return { open: m[0], inner: html.slice(start) };
}

// ------------------------------------------------------------------ tests
const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
const underTestRunner = process.execArgv.includes('--test') || process.env.NODE_TEST_CONTEXT;
if (isMain || underTestRunner) {
  test('renders every block type from the fixture, with defaults when data/site.json is absent', async () => {
    const dir = buildFixture(tmp('all'));
    const r = await run(dir);
    assert.equal(r.code, 0, r.out);
    const svc = read(dir, 'services/kitchen-design/index.html');
    const art = read(dir, 'journal/warm-minimalism/index.html');
    const both = svc + art;
    for (const cls of ['pr-lead', 'pr-h2', 'pr-h3', 'pr-list', 'pr-figure', 'pr-gallery', 'pr-table', 'pr-steps', 'pr-cards', 'pr-faq', 'pr-note',
      'pr-checklist', 'pr-swatches', 'pr-sources', 'cta-band', 'pr-hero', 'pr-toc', 'pr-author', 'pr-related', 'pr-meta'])
      assert.ok(both.includes(cls), `missing ${cls}`);
    // defaults (A8.1): gated paragraph + FAQ item + list item + step are gone; true-by-default step stays
    assert.ok(!svc.includes('פסקה מגודרת'), 'contractorQuotes paragraph must be gated off');
    assert.ok(!svc.includes('שאלה מגודרת'), 'gated FAQ item must be omitted');
    assert.ok(!svc.includes('פריט מגודר'), 'gated list item must be omitted');
    assert.ok(!svc.includes('הדמיות כשירות'), 'gated step must be omitted');
    assert.ok(svc.includes('תוכניות עבודה'), 'workingDrawings (default true) step must ship');
    // variant: singleRoomProjects false → safe text
    assert.ok(!svc.includes('כפרויקט ממוקד') && svc.includes('כחלק מעיצוב הבית כולו.'), 'safe variant text');
    // gated page: not built, links to it are plain text
    assert.ok(!fs.existsSync(path.join(dir, 'services/3d-visualization/index.html')));
    assert.ok(!svc.includes('href="/services/3d-visualization/"') && svc.includes('שירות ההדמיות'), 'link to gated page unwrapped');
    // A6.3 rule 4: /en prefix stripped in EN copy
    const dict = JSON.parse(read(dir, 'data/i18n/service-kitchen-design.json'));
    assert.ok(Object.values(dict).every((v) => !/href="\/en\//.test(v.en)), 'no /en/ hrefs in EN values');
    // FAQ markup (A6.5): only the first rendered item is open; data hooks for JSON-LD
    const faq = element(svc, /<section class="pr-faq"[^>]*>/);
    assert.equal((faq.inner.match(/<details /g) || []).length, 3);
    assert.equal((faq.inner.match(/ open>/g) || []).length, 1);
    assert.ok(/<details class="pr-faq__item" data-faq-item open>/.test(faq.inner));
    assert.equal((faq.inner.match(/data-faq-q/g) || []).length, 3);
    // sources: after the FAQ, before the author box; swatches: native width, no srcset widths
    assert.ok(art.indexOf('pr-faq') < art.indexOf('pr-sources') && art.indexOf('pr-sources') < art.indexOf('pr-author'));
    assert.ok(/<source type="image\/webp" srcset="\/assets\/img\/materials\/marble\.webp">/.test(art));
    assert.ok(!/<p class="pr-swatch__name"[^>]*>[^<]*\*\*/.test(art), 'swatch name without ** markers');
    // built-01 caption gets the "not the built version" sentence; status is מהביצוע
    assert.ok(svc.includes('הצילום לא מתעד אף אחת מההדמיות שבאתר.'));
    assert.ok(/data-i18n="common\.status\.photo">מהביצוע</.test(svc));
    // article meta line + author box + related (fallback: no sibling in "style")
    assert.ok(/<p class="pr-meta label"><span data-i18n="prose\.meta\.by">מאת<\/span> <bdi lang="en">SELÈ STUDIO<\/bdi>/.test(art));
    assert.ok(/<time datetime="2026-09-28" data-i18n="journal-warm-minimalism\.date\.published">28 בספטמבר 2026<\/time>/.test(art));
    assert.ok(art.includes('href="/studio/" data-i18n="prose.author.link"'));
    // only one fetchpriority=high in body; LCP preload equals the hero <source> byte for byte
    const body = svc.slice(svc.indexOf('<body'));
    assert.equal((body.match(/fetchpriority="high"/g) || []).length, 1);
    const pre = svc.match(/<link rel="preload" as="image" type="image\/webp" imagesrcset="([^"]+)" imagesizes="([^"]+)"/);
    const src = svc.match(/<figure class="frame arch-door pr-hero"[\s\S]*?<source type="image\/webp" srcset="([^"]+)" sizes="([^"]+)">/);
    assert.ok(pre && src);
    assert.equal(pre[1], src[1]); assert.equal(pre[2], src[2]);
    // body attributes (A2)
    assert.ok(/<body data-page="service" data-i18n-dict="prose" data-i18n-build="service-kitchen-design" data-nav="services">/.test(svc));
    assert.ok(!/data-module/.test(svc.match(/<body[^>]*>/)[0]));
    // registry
    const reg = JSON.parse(read(dir, 'data/prose-registry.json'));
    assert.deepEqual(reg.map((e) => e.id), ['service-kitchen-design', 'journal', 'journal-warm-minimalism']);
    assert.deepEqual(reg.find((e) => e.id === 'journal').collection, ['journal-warm-minimalism']);
    assert.deepEqual(reg[0].crumbs, ['home', 'services']);
    // journal index: section + card, cta partial markers
    const idx = read(dir, 'journal/index.html');
    assert.ok(idx.includes('href="/journal/warm-minimalism/"') && idx.includes('<!-- @partial:cta -->'));
    // no data-i18n element with child elements (check rule 13); every key resolves in the build dict or runtime dicts
    for (const [f, id] of [['services/kitchen-design/index.html', 'service-kitchen-design'], ['journal/warm-minimalism/index.html', 'journal-warm-minimalism'], ['journal/index.html', 'journal']]) {
      const html = read(dir, f);
      const d = JSON.parse(read(dir, `data/i18n/${id}.json`));
      const common = (await import(pathToFileURL(path.join(dir, 'js/i18n/common.js')).href)).default;
      const prose = (await import(pathToFileURL(path.join(dir, 'js/i18n/prose.js')).href)).default;
      for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"|data-i18n-attr="[a-z-]+:([^"]+)"/g)) {
        const k = m[1] || m[2];
        assert.ok(d[k] || common[k] || prose[k], `${f}: key ${k} unresolved`);
      }
      for (const m of html.matchAll(/<([a-z0-9]+)\b[^>]*\sdata-i18n="[^"]+"[^>]*>/g)) {
        const el = element(html.slice(m.index), /^<[^>]+>/);
        assert.ok(!/<[a-z]/i.test(el.inner), `${f}: data-i18n element with children: ${m[0]}`);
      }
    }
  });

  test('A6.2 hook rule: a cross-script value renders data-i18n-html in both directions', async () => {
    const dir = buildFixture(tmp('hook'));
    assert.equal((await run(dir)).code, 0);
    const svc = read(dir, 'services/kitchen-design/index.html');
    const dict = JSON.parse(read(dir, 'data/i18n/service-kitchen-design.json'));
    const body = kitchenFixture().body;
    const nOf = (pred) => body.findIndex(pred);
    // HE plain, EN holds a Hebrew run (auto-wrapped) → data-i18n-html, HE value unchanged text
    const n1 = nOf((b) => b.t === 'p' && b.text.en.startsWith('Working with the carpenter'));
    const k1 = `service-kitchen-design.b${n1}.text`;
    assert.ok(svc.includes(`data-i18n-html="${k1}"`), 'EN Hebrew run → data-i18n-html');
    assert.ok(dict[k1].en.includes('<bdi lang="he">פיקוח עליון</bdi>'));
    // HE holds a Latin run (auto-wrapped), EN plain → data-i18n-html
    const n2 = nOf((b) => b.t === 'p' && b.text.he.startsWith('בכל פרויקט של'));
    const k2 = `service-kitchen-design.b${n2}.text`;
    assert.ok(svc.includes(`data-i18n-html="${k2}"`), 'HE Latin run → data-i18n-html');
    assert.ok(dict[k2].he.includes('<bdi lang="en">SELÈ STUDIO</bdi>'));
    // an EN value that already marks its Hebrew with <span lang="he"> is not double-wrapped
    const n3 = nOf((b) => b.t === 'p' && b.text.en.startsWith('In a bathroom'));
    assert.ok(dict[`service-kitchen-design.b${n3}.text`].en.includes('<span lang="he">פיקוח עליון</span>'));
    assert.ok(!dict[`service-kitchen-design.b${n3}.text`].en.includes('<bdi'));
    // a plain paragraph stays data-i18n
    const n4 = nOf((b) => b.t === 'p' && b.text.he.startsWith('לפני שבוחרים גוון'));
    assert.ok(svc.includes(`data-i18n="service-kitchen-design.b${n4}.text"`));
  });

  test('built-01 adjacent to kitchen-dark-01 fails (A6.3 rule 12)', async () => {
    const k = kitchenFixture();
    const g = k.body.find((b) => b.t === 'gallery');
    g.items = [g.items[1], g.items[2], g.items[3], g.items[4], g.items[0]]; // …kitchen-dark-01, built-01
    const dir = buildFixture(tmp('adj'), { services: { 'kitchen-design': k } });
    const r = await run(dir);
    assert.equal(r.code, 1);
    assert.match(r.out, /built-01 is adjacent to kitchen-dark-01/);
    assert.ok(!fs.existsSync(path.join(dir, 'services/kitchen-design/index.html')), 'nothing is written on error');
    // …and passes when the owner confirms the pair
    const dir2 = buildFixture(tmp('adj2'), { services: { 'kitchen-design': k }, site: { confirm: { built01SameAsDarkKitchen: true } } });
    assert.equal((await run(dir2)).code, 0);
  });

  test('an unknown flag name fails (block, item and variant)', async () => {
    for (const mutate of [
      (k) => { k.body[3].requires = 'kitchenOnly'; },
      (k) => { k.body.find((b) => b.t === 'ul').items[0].requires = 'nope'; },
      (k) => { k.body[1].text.variants[0].requires = 'singleRoom'; },
      (k) => { k.meta.requires = ['approachFaq']; },
    ]) {
      const k = kitchenFixture();
      mutate(k);
      const dir = buildFixture(tmp('flag'), { services: { 'kitchen-design': k } });
      const r = await run(dir);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /unknown flag/);
      const v = await run(dir, '--validate', path.join(dir, 'data/services/kitchen-design.json'));
      assert.equal(v.code, 1);
    }
  });

  test('data/site.json absent → A8.1 defaults; present → its flags win', async () => {
    const e = gp.createEngine({ root: buildFixture(tmp('def')) });
    assert.deepEqual(e.site, gp.SITE_DEFAULTS);
    const dir = buildFixture(tmp('site'), { site: { launchDate: '2026-10-01', confirm: { contractorQuotes: true, singleRoomProjects: true } } });
    assert.equal((await run(dir)).code, 0);
    const svc = read(dir, 'services/kitchen-design/index.html');
    assert.ok(svc.includes('פסקה מגודרת') && svc.includes('כפרויקט ממוקד') && svc.includes('שאלה מגודרת'));
    assert.ok(!svc.includes('הדמיות כשירות'), 'renderStages still false (missing keys take the defaults)');
  });

  test('carry-over: filled partial / @seo regions and ?v= hashes survive a second run and --check', async () => {
    const dir = buildFixture(tmp('carry'));
    assert.equal((await run(dir)).code, 0);
    const f = path.join(dir, 'services/kitchen-design/index.html');
    let html = fs.readFileSync(f, 'utf8');
    html = html
      .replace(/(<!-- @seo -->)[\s\S]*?(<!-- \/@seo -->)/, '$1\n  <title>SEO TITLE</title>\n  <meta name="description" content="SEO">\n  <script type="application/ld+json">{"@graph":[]}</script>\n  $2')
      .replace(/(<!-- @partial:header -->)\s*(<!-- \/@partial:header -->)/, '$1\n<header class="site-header">FILLED HEADER</header>\n  $2')
      .replace(/(<!-- @partial:footer -->)\s*(<!-- \/@partial:footer -->)/, '$1\n<footer>FILLED FOOTER</footer>\n  $2')
      .replace('/css/pages/prose.css?v=dev', '/css/pages/prose.css?v=abc1234567');
    fs.writeFileSync(f, html);
    const r2 = await run(dir);
    assert.equal(r2.code, 0);
    assert.equal(fs.readFileSync(f, 'utf8'), html, 'second run is byte-identical');
    assert.equal((await run(dir, '--check')).code, 0, '--check clean after carry-over');
    // a real content change is still detected by --check
    const d = path.join(dir, 'data/services/kitchen-design.json');
    const k = JSON.parse(fs.readFileSync(d, 'utf8'));
    k.body[3].text.he += ' עוד.';
    fs.writeFileSync(d, JSON.stringify(k));
    assert.equal((await run(dir, '--check')).code, 1);
    assert.equal(fs.readFileSync(f, 'utf8'), html, '--check writes nothing');
  });

  test('the CTA band carries data-letterpress-seal, .cta-band__inner.l-wrap and every .cta-band__* class (A6.5)', async () => {
    const dir = buildFixture(tmp('cta'));
    assert.equal((await run(dir)).code, 0);
    for (const f of ['services/kitchen-design/index.html', 'journal/warm-minimalism/index.html']) {
      const html = read(dir, f);
      const cta = element(html, /<section class="cta-band" data-theme="bordeaux" aria-labelledby="pr-cta-title" data-fx="letterpress">/);
      assert.ok(cta, `${f}: cta-band section`);
      for (const c of ['cta-band__inner l-wrap', 'cta-band__seal', 'cta-band__title', 'cta-band__sub', 'cta-band__actions', 'btn btn--light', 'cta-band__mail link'])
        assert.ok(cta.inner.includes(`class="${c}`), `${f}: ${c}`);
      assert.ok(cta.inner.includes('data-letterpress-seal'));
      assert.ok(cta.inner.includes('id="pr-cta-title"'));
      assert.ok(cta.inner.includes('href="mailto:office@sele-studio.com"'));
      // the band is the last child of main
      const main = element(html, /<main id="main" tabindex="-1">/);
      assert.ok(/<\/section>\s*$/.test(main.inner), `${f}: cta is the last child of main`);
    }
  });

  test('errors: schema, external links, markup, h2 order, forbidden strings, lengths, duplicate FAQ, missing image', async () => {
    const cases = [
      [(k) => { k.body[2].text.he = 'ראו [כאן](https://example.com/)'; }, /external link/],
      [(k) => { k.body[3].text.en += ' <div>x</div>'; }, /not allowed inline/],
      [(k) => { k.body[3].text.he += ' TODO'; }, /forbidden "TODO"/],
      [(k) => { k.body.splice(2, 0, { t: 'h3', text: bi('כותרת', 'Heading') }); }, /must follow an h2/],
      [(k) => { k.body[3].text.he = 'ראו [כאן](/services/renovation-support-x/)'; }, /not a page of Addendum A2/],
      [(k) => { k.meta.title.en = 'x'.repeat(70); }, /max 65/],
      [(k) => { k.meta.desc.he = 'קצר'; }, /70–165/],
      [(k) => { k.meta.hero.img = 'no-such-image'; }, /incomplete/],
      [(k) => { k.body = k.body.filter((b) => b.t !== 'cta'); }, /exactly one "cta"/],
      [(k) => { k.body.find((b) => b.t === 'faq').items[0].q = bi('האם מינימליזם חם מתאים לדירה קטנה?', 'Does warm minimalism suit a small apartment?'); }, /FAQ question also on/],
      [(k) => { k.body.find((b) => b.t === 'figure').alt.en = 'מטבח'; }, /Hebrew letters in an attribute/],
      [(k) => { k.body[3].text.en += ' <span lang="en">מטבח</span>'; }, /Hebrew outside a lang="he"/],
      [(k) => { k.body = k.body.filter((b) => !['p', 'lead', 'ul', 'table', 'note'].includes(b.t)); }, /Hebrew words in main \(min 450\)/],
    ];
    for (const [mutate, re] of cases) {
      const k = kitchenFixture();
      mutate(k);
      const dir = buildFixture(tmp('err'), { services: { 'kitchen-design': k } });
      const r = await run(dir);
      assert.equal(r.code, 1, `expected failure ${re}\n${r.out}`);
      assert.match(r.out, re);
    }
  });

  test('--validate reports only the named files and writes nothing', async () => {
    const k = kitchenFixture();
    k.body[3].text.he += ' {{';
    const dir = buildFixture(tmp('val'), { services: { 'kitchen-design': k } });
    const ok = await run(dir, '--validate', path.join(dir, 'data/journal/warm-minimalism.json'));
    assert.equal(ok.code, 0, ok.out);
    const bad = await run(dir, '--validate', path.join(dir, 'data/services/kitchen-design.json'));
    assert.equal(bad.code, 1);
    assert.ok(!fs.existsSync(path.join(dir, 'services')) && !fs.existsSync(path.join(dir, 'data/prose-registry.json')));
  });

  test('a gated page previously generated is deleted with its build dictionary', async () => {
    const dir = buildFixture(tmp('gate'), { site: { confirm: { renderStages: true } } });
    assert.equal((await run(dir)).code, 0);
    assert.ok(fs.existsSync(path.join(dir, 'services/3d-visualization/index.html')));
    assert.ok(read(dir, 'services/kitchen-design/index.html').includes('href="/services/3d-visualization/"'), 'link kept while the page is built');
    fs.writeFileSync(path.join(dir, 'data/site.json'), JSON.stringify({ confirm: { renderStages: false } }));
    assert.equal((await run(dir, '--check')).code, 1);
    assert.equal((await run(dir)).code, 0);
    assert.ok(!fs.existsSync(path.join(dir, 'services/3d-visualization/index.html')));
    assert.ok(!fs.existsSync(path.join(dir, 'data/i18n/service-3d-visualization.json')));
  });

  test('heading anchors: apostrophes dropped, truncated slugs never end on a function word', () => {
    assert.equal(gp.slugify('Joinery to the ceiling and storage you don\'t see'), 'joinery-to-the-ceiling-and-storage-you-dont-see');
    assert.equal(gp.slugify('Planning a kitchen with an island: work zones, seating and clearances'), 'planning-a-kitchen-with-an-island-work-zones-seating');
    assert.equal(gp.slugify('Who renovation support is for'), 'who-renovation-support-is-for', 'an untruncated slug keeps its last word');
    assert.ok(gp.slugify('x'.repeat(10) + ' word'.repeat(20)).length <= 60);
  });

  test('built01Publish false: the built-01 figure and gallery tile are dropped without leaving an empty tile', async () => {
    const dir = buildFixture(tmp('b01'), { site: { confirm: { built01Publish: false } } });
    const r = await run(dir);
    assert.equal(r.code, 0, r.out);
    const svc = read(dir, 'services/kitchen-design/index.html');
    assert.ok(!svc.includes('/assets/img/built-01'), 'no built-01 image');
    assert.ok(!/<li class="pr-gallery__item"><\/li>/.test(svc), 'no empty gallery tile');
    assert.equal((svc.match(/class="pr-gallery__item"/g) || []).length, 4);
  });

  test('autoWrap: Latin runs in Hebrew, Hebrew runs in English, digits and lang elements respected', () => {
    assert.equal(gp.autoWrap('ב-SELÈ STUDIO עובדים', 'he'), 'ב-<bdi lang="en">SELÈ STUDIO</bdi> עובדים');
    assert.equal(gp.autoWrap('הדמיות 3D ו-2700K', 'he'), 'הדמיות 3D ו-2700K');
    assert.equal(gp.autoWrap('מדד CRI גבוה', 'he'), 'מדד <bdi lang="en">CRI</bdi> גבוה');
    assert.equal(gp.autoWrap('a <span lang="en">SELÈ</span> b', 'he'), 'a <span lang="en">SELÈ</span> b');
    assert.equal(gp.autoWrap('the term פיקוח עליון here', 'en'), 'the term <bdi lang="he">פיקוח עליון</bdi> here');
    assert.equal(gp.autoWrap('<a href="/studio/">Studio</a>', 'he'), '<a href="/studio/"><bdi lang="en">Studio</bdi></a>');
  });
}
