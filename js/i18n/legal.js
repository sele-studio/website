// Legal dictionary (SPEC §5.8–§5.10 as amended by SPEC-ADDENDUM A7.5). Owner: P5.
// Plain data: node-importable, no functions, no browser globals. The Hebrew ships in the HTML of
// /accessibility/, /privacy/ and /404.html; gen-en writes `en` into the /en/ mirrors, and the bilingual 404
// swaps to `en` at runtime under /en/* (A3.8).
// Latin runs inside Hebrew values are isolated with <bdi lang="en">; those keys use data-i18n-html.
export default {
  // ---------------------------------------------------------------- shared
  "legal.toc.label": { he: "בעמוד הזה", en: "On this page" },

  // ---------------------------------------------------------------- accessibility statement (§5.8)
  "legal.a11y.crumb": { he: "הצהרת נגישות", en: "Accessibility statement" },
  "legal.a11y.h1": { he: "הצהרת נגישות", en: "Accessibility statement" },
  "legal.a11y.intro": {
    he: "ב־<bdi lang=\"en\">SELÈ STUDIO</bdi> אנחנו רואים בנגישות חלק מעיצוב טוב: בית צריך להיות נעים לכל מי שנכנס אליו, וכך גם האתר שלנו. פעלנו כדי שהאתר יהיה נגיש לאנשים עם מוגבלות, ואנחנו ממשיכים לבדוק ולשפר.",
    en: "At SELÈ STUDIO we see accessibility as part of good design: a home should feel good to everyone who enters it, and so should our website. We have worked to make this site accessible to people with disabilities, and we keep checking and improving it.",
  },

  "legal.a11y.level.h2": { he: "רמת הנגישות", en: "Accessibility level" },
  "legal.a11y.level.p": {
    he: "האתר תוכנן ונבנה בהתאם לתקן הישראלי ת״י 5568 ולהנחיות <bdi lang=\"en\">WCAG 2.1</bdi> ברמה <bdi lang=\"en\">AA</bdi>, לפי תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג–2013. בדקנו את האתר בכלים אוטומטיים, בניווט מקלדת בלבד ובמצב של הפחתת תנועה.",
    en: "The site was designed and built in line with Israeli Standard IS 5568 and WCAG 2.1 at level AA, under the Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 2013. We tested the site with automated tools, with keyboard-only navigation and with reduced motion.",
  },

  "legal.a11y.done.h2": { he: "מה עשינו באתר", en: "What we have done" },
  "legal.a11y.done.1": { he: "ניווט מלא במקלדת, עם סימון פוקוס ברור", en: "Full keyboard navigation with a clear focus indicator" },
  "legal.a11y.done.2": { he: "קישור \"דילוג לתוכן\" בראש כל עמוד", en: "A “skip to content” link at the top of every page" },
  "legal.a11y.done.3": { he: "מבנה כותרות ואזורים סמנטיים (כותרת, ניווט, תוכן, כותרת תחתונה)", en: "Semantic headings and landmarks (header, navigation, main, footer)" },
  "legal.a11y.done.4": { he: "טקסט חלופי לכל תמונה שמעבירה מידע, וסימון ההדמיות כהדמיות", en: "Text alternatives for every informative image, with visualizations marked as visualizations" },
  "legal.a11y.done.5": { he: "ניגודיות צבעים של 4.5:1 לפחות לטקסט רגיל", en: "Color contrast of at least 4.5:1 for regular text" },
  "legal.a11y.done.6": { he: "מידע שאינו מועבר באמצעות צבע בלבד", en: "No information conveyed by color alone" },
  "legal.a11y.done.7": { he: "כפתור עצירה לכל סרטון; הסרטונים שקטים ואינם מהבהבים", en: "A pause button on every video; videos are silent and never flash" },
  "legal.a11y.done.8": { he: "כיבוד הגדרת \"הפחתת תנועה\" של מערכת ההפעלה", en: "Respect for the operating system’s “reduce motion” setting" },
  "legal.a11y.done.9": { he: "טופס פנייה עם תוויות לכל שדה, הודעות שגיאה ברורות ובלי <bdi lang=\"en\">CAPTCHA</bdi>", en: "A contact form with a label for every field, clear error messages and no CAPTCHA" },
  "legal.a11y.done.10": { he: "מעבר בין עברית לאנגלית בכל עמוד", en: "Switching between Hebrew and English on every page" },

  "legal.a11y.menu.h2": { he: "תפריט הנגישות", en: "The accessibility menu" },
  "legal.a11y.menu.p": {
    he: "בפינת המסך יש כפתור נגישות. דרכו אפשר להגדיל את הטקסט, להפעיל ניגודיות גבוהה, לעצור אנימציות וסרטונים, להדגיש קישורים ולעבור לגופן קריא. ההגדרות נשמרות בדפדפן שלכם בלבד, ואפשר לאפס אותן בכל רגע.",
    en: "A button in the corner of the screen opens the accessibility menu. It lets you enlarge the text, switch to high contrast, stop animations and videos, underline links and use a readable font. Your settings are stored in your browser only, and you can reset them at any time.",
  },

  "legal.a11y.limits.h2": { he: "מגבלות ידועות", en: "Known limitations" },
  "legal.a11y.limits.1": { he: "הסרטונים באתר שקטים, ולכן אין להם כתוביות; לסרט בעמוד הסרט מצורף תיאור כתוב", en: "The videos on the site are silent, so they have no captions; the film on the film page comes with a written description" },
  "legal.a11y.limits.2": { he: "חלק מהאפקטים החזותיים פועלים רק במחשב, והתוכן כולו זמין גם בלעדיהם", en: "Some visual effects run on desktop only; all content is available without them" },
  "legal.a11y.limits.3": { he: "הקישורים לאינסטגרם מובילים לאתר חיצוני, שאינו בשליטתנו", en: "Instagram links lead to an external site that we do not control" },
  "legal.a11y.limits.4": { he: "טופס הפנייה נשלח באמצעות שירות חיצוני (<bdi lang=\"en\">FormSubmit</bdi>)", en: "The contact form is sent through an external service (FormSubmit)" },

  "legal.a11y.meet.h2": { he: "פגישות והתאמות", en: "Meetings and adjustments" },
  "legal.a11y.meet.p": {
    he: "פגישות עם הסטודיו נקבעות בתיאום מראש. אם אתם צריכים התאמת נגישות לפגישה, ספרו לנו ונשמח להיערך בהתאם.",
    en: "Meetings with the studio are arranged in advance. If you need an accessibility adjustment for a meeting, let us know and we’ll gladly prepare for it.",
  },

  "legal.a11y.contact.h2": { he: "פנייה בנושא נגישות", en: "Contacting us about accessibility" },
  "legal.a11y.contact.p": {
    he: "נתקלתם בקושי? נשמח לדעת ולתקן. כדי שנוכל לעזור, כדאי לציין את העמוד, תיאור קצר של הקושי ואת הדפדפן או הטכנולוגיה המסייעת שבהם השתמשתם.",
    en: "Did you run into a difficulty? We’d like to know and fix it. To help us help you, please mention the page, a short description of the problem and the browser or assistive technology you used.",
  },
  "legal.a11y.coordLabel": { he: "רכז/ת נגישות:", en: "Accessibility coordinator:" },
  "legal.a11y.phoneLabel": { he: "טלפון:", en: "Phone:" },
  "legal.a11y.emailLabel": { he: "מייל:", en: "Email:" },

  "legal.a11y.updated.h2": { he: "עדכון ההצהרה", en: "Last updated" },
  "legal.a11y.updatedLabel": { he: "ההצהרה עודכנה בתאריך:", en: "This statement was last updated on:" },

  // ---------------------------------------------------------------- privacy notice (§5.9 + A7.5)
  "legal.privacy.crumb": { he: "מדיניות פרטיות", en: "Privacy notice" },
  "legal.privacy.h1": { he: "מדיניות פרטיות", en: "Privacy notice" },

  "legal.privacy.who.h2": { he: "מי אנחנו", en: "Who we are" },
  "legal.privacy.who.p": {
    he: "האתר <bdi lang=\"en\">sele-studio.com</bdi> שייך לסטודיו <bdi lang=\"en\">SELÈ STUDIO</bdi>. לכל שאלה בנושא פרטיות אפשר לכתוב אלינו: <a href=\"mailto:office@sele-studio.com\"><bdi lang=\"en\">office@sele-studio.com</bdi></a>.",
    en: "The website sele-studio.com belongs to SELÈ STUDIO. For any privacy question, write to us at <a href=\"mailto:office@sele-studio.com\">office@sele-studio.com</a>.",
  },
  "legal.privacy.entityLabel": { he: "הגוף המשפטי:", en: "Legal entity:" },

  "legal.privacy.collect.h2": { he: "אילו פרטים נאספים", en: "What we collect" },
  "legal.privacy.collect.p": {
    he: "רק מה שאתם כותבים בטופס הפנייה: שם, טלפון ו/או אימייל, הדרך והשעה הנוחות לחזרה, ופרטים על הפרויקט (חללים, שירותים, סוג הנכס, שלב, מיקום, גודל, מועד, חומרים והודעה חופשית), וגם איך הגעתם אלינו. בנוסף נשלחים שפת האתר, העמוד שממנו נשלחה הפנייה והעמוד הראשון שבו נכנסתם לאתר באותו ביקור. באתר אין עוגיות, אין כלי סטטיסטיקה ואין פיקסלים של מעקב.",
    en: "Only what you type into the contact form: your name, phone and/or email, how and when you’d like us to get back to you, and details about the project (spaces, services, property type, stage, location, size, timing, materials and a free-text message), plus how you found us. The site language, the page you sent from and the first page you opened on the site during that visit are included too. The site uses no cookies, no analytics and no tracking pixels.",
  },

  "legal.privacy.why.h2": { he: "למה", en: "Why" },
  "legal.privacy.why.p": {
    he: "כדי לחזור אליכם, לתאם פגישת היכרות ולדבר על פרויקט אפשרי. לא נשתמש בפרטים לשיווק, לא נשלח ניוזלטר ולא נעביר אותם לאחרים מעבר למפורט כאן.",
    en: "To get back to you, arrange a first meeting and talk about a possible project. We will not use your details for marketing, we don’t send newsletters, and we don’t pass them on beyond what is described here.",
  },

  "legal.privacy.must.h2": { he: "האם חובה למסור", en: "Do you have to provide them" },
  "legal.privacy.must.p": {
    he: "אין חובה חוקית למסור את הפרטים. בלי שם ודרך ליצירת קשר לא נוכל לחזור אליכם.",
    en: "You are not legally required to provide these details. Without a name and a way to reach you, we can’t get back to you.",
  },

  "legal.privacy.recipients.h2": { he: "למי הפרטים מועברים", en: "Who receives them" },
  "legal.privacy.recipients.p": {
    he: "הטופס נשלח באמצעות <bdi lang=\"en\">FormSubmit</bdi> (<bdi lang=\"en\">formsubmit.co</bdi>), שירות חיצוני שמעביר את הפנייה לתיבת הדואר של הסטודיו ועשוי לעבד מידע מחוץ לישראל. ההודעה נשמרת אצל ספק הדואר האלקטרוני של הסטודיו.",
    en: "The form is sent through FormSubmit (formsubmit.co), an external service that forwards your inquiry to the studio’s mailbox and may process data outside Israel. The message is stored with the studio’s email provider.",
  },

  "legal.privacy.retention.h2": { he: "כמה זמן", en: "How long" },
  "legal.privacy.retention.p": {
    he: "נשמור את הפנייה כל עוד היא נחוצה לטיפול בה ולפרויקט שעשוי לצמוח ממנה, ונמחק אותה לבקשתכם.",
    en: "We keep your inquiry for as long as it is needed to handle it and any project that may follow, and we delete it at your request.",
  },

  "legal.privacy.browser.h2": { he: "מה נשמר בדפדפן שלכם", en: "What stays in your browser" },
  "legal.privacy.browser.p": {
    he: "האתר שומר בדפדפן שלכם בלבד את שפת האתר ואת הגדרות הנגישות שבחרתם, ולמשך הביקור בלבד גם טיוטה של הטופס, סימון שהפתיח כבר הוצג והעמוד הראשון שבו נכנסתם לאתר. המידע הזה לא נשלח אלינו, ואפשר למחוק אותו בהגדרות הדפדפן.",
    en: "The site stores only your language and accessibility settings in your browser, and, for the current visit only, a draft of the form, a note that the opening animation was shown and the first page you opened on the site. None of this is sent to us, and you can clear it in your browser settings.",
  },

  "legal.privacy.third.h2": { he: "גופנים, סקריפטים וקישורים", en: "Fonts, scripts and links" },
  "legal.privacy.third.p": {
    he: "הגופנים והסקריפטים נטענים מהאתר עצמו, בלי שירותי צד שלישי. האתר מתארח ב־<bdi lang=\"en\">GitHub Pages</bdi>, שעשוי לרשום נתוני גישה טכניים (כמו כתובת <bdi lang=\"en\">IP</bdi>) לצורכי אבטחה ותפעול. קישורים לאינסטגרם מובילים לשירותים של <bdi lang=\"en\">Meta</bdi>, שחלה עליהם מדיניות הפרטיות שלהם.",
    en: "Fonts and scripts are served from the site itself, with no third-party services. The site is hosted on GitHub Pages, which may log technical access data (such as IP addresses) for security and operation. Instagram links lead to Meta’s services, which have their own privacy policy.",
  },

  "legal.privacy.rights.h2": { he: "הזכויות שלכם", en: "Your rights" },
  "legal.privacy.rights.p": {
    he: "לפי חוק הגנת הפרטיות, התשמ״א–1981, אתם רשאים לעיין במידע שנשמר עליכם ולבקש לתקן או למחוק אותו. כתבו לנו: <a href=\"mailto:office@sele-studio.com\"><bdi lang=\"en\">office@sele-studio.com</bdi></a>.",
    en: "Under the Israeli Protection of Privacy Law, 1981, you may review the information held about you and ask us to correct or delete it. Write to us at <a href=\"mailto:office@sele-studio.com\">office@sele-studio.com</a>.",
  },

  "legal.privacy.updated.h2": { he: "עדכון אחרון", en: "Last updated" },
  "legal.privacy.updatedLabel": { he: "עודכן לאחרונה:", en: "Last updated:" },

  // ---------------------------------------------------------------- 404 (§5.10 + A7.5; bilingual, A3.8)
  "legal.notfound.h1": { he: "הדלת הזו סגורה.", en: "This door is closed." },
  "legal.notfound.sub": { he: "אבל יש עוד הרבה חדרים.", en: "But there are plenty of other rooms." },
  "legal.notfound.home": { he: "לעמוד הבית", en: "Home" },
  "legal.notfound.projects": { he: "לפרויקטים", en: "See the projects" },
  "legal.notfound.services": { he: "שירותים", en: "Services" },
  "legal.notfound.journal": { he: "מגזין", en: "Journal" },
  "legal.notfound.contact": { he: "צרו קשר", en: "Contact" },
  "legal.notfound.docTitle": { he: "העמוד לא נמצא | SELÈ STUDIO", en: "Page not found | SELÈ STUDIO" },
  "legal.notfound.desc": { he: "הדלת הזו סגורה, אבל יש עוד הרבה חדרים.", en: "This door is closed, but there are plenty of other rooms." },
  "legal.notfound.ogAlt": { he: "SELÈ STUDIO — אדריכלות ועיצוב פנים", en: "SELÈ STUDIO — architecture and interior design" },
};
