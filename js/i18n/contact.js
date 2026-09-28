// Contact dictionary (SPEC §5.6, §5.7, §6 as amended by SPEC-ADDENDUM A7.4). Plain data: node-importable,
// no functions, no browser globals. Hebrew ships in the HTML; gen-en writes `en` into /en/contact/…; the page JS
// uses i18n.t() for the interpolated strings (progress, success body, counter, letter fragments) and the
// mailto / copy lines.
export default {
  // ---- opener (§5.6)
  "contact.h1": { he: "בואו נדבר על הבית שלכם.", en: "Let’s talk about your home." },
  "contact.sub": { he: "שלושה צעדים קצרים, בערך שתי דקות. אפשר לדלג על כל שאלה, חוץ מהפרטים שלכם.", en: "Three short steps, about two minutes. You can skip any question except your details." },

  // ---- progress (letterhead)
  "contact.progress": { he: "צעד {n} מתוך 3 · {name}", en: "Step {n} of 3 · {name}" },
  "contact.progress.init": { he: "צעד 1 מתוך 3 · הפרויקט", en: "Step 1 of 3 · The project" },

  // ---- hidden fields (A7.4)
  "contact.hidden.lang": { he: "עברית", en: "English" },
  "contact.hidden.page": { he: "/contact/", en: "/en/contact/" },

  // ---- step 1 (§6.2)
  "contact.step1.legend": { he: "הפרויקט", en: "The project" },
  "contact.step1.help": { he: "אפשר לבחור כמה תשובות, ואפשר גם לדלג.", en: "Choose as many as you like, or skip ahead." },

  "contact.spaces.label": { he: "אילו חללים?", en: "Which spaces?" },
  "contact.spaces.whole": { he: "כל הבית", en: "The whole home" },
  "contact.spaces.kitchen": { he: "מטבח", en: "Kitchen" },
  "contact.spaces.living": { he: "סלון", en: "Living room" },
  "contact.spaces.baths": { he: "חדרי רחצה", en: "Bathrooms" },
  "contact.spaces.bedrooms": { he: "חדרי שינה", en: "Bedrooms" },
  "contact.spaces.other": { he: "אחר", en: "Other" },

  "contact.services.label": { he: "במה נוכל לעזור?", en: "How can we help?" },
  "contact.services.planning": { he: "תכנון דירה", en: "Space planning" },
  "contact.services.interior": { he: "עיצוב פנים", en: "Interior design" },
  "contact.services.supervision": { he: "ליווי שיפוץ דירה", en: "Renovation support" },
  "contact.services.styling": { he: "סטיילינג והשלמות", en: "Styling & finishing" },
  "contact.services.unsure": { he: "עוד לא בטוחים", en: "Not sure yet" },

  "contact.property.label": { he: "איזה נכס?", en: "What kind of property?" },
  "contact.property.apartment": { he: "דירה", en: "Apartment" },
  "contact.property.garden": { he: "דירת גן או פנטהאוז", en: "Garden apartment or penthouse" },
  "contact.property.house": { he: "בית פרטי", en: "Private house" },
  "contact.property.other": { he: "אחר", en: "Other" },

  "contact.stage.label": { he: "איפה אתם עכשיו?", en: "Where are you now?" },
  "contact.stage.before": { he: "עוד לפני רכישה", en: "Before buying" },
  "contact.stage.bought": { he: "קנינו, לפני שיפוץ", en: "Bought, before renovating" },
  "contact.stage.newbuild": { he: "בנייה חדשה", en: "New build" },
  "contact.stage.mid": { he: "באמצע שיפוץ או בנייה", en: "Mid-renovation or build" },
  "contact.stage.refresh": { he: "גרים בבית ורוצים לחדש", en: "Living there, ready to refresh" },

  // ---- step 2
  "contact.step2.legend": { he: "הבית והטעם", en: "The home and your taste" },
  "contact.step2.help": { he: "בחרו חומרים שמדברים אליכם. זה עוזר לנו להבין את הטעם שלכם.", en: "Pick materials that speak to you. It helps us understand your taste." },

  "contact.materials.label": { he: "חומרים שמדברים אליכם", en: "Materials that speak to you" },
  "contact.mat.stone": { he: "אבן עורקית", en: "Veined stone" },
  "contact.mat.lightOak": { he: "אלון בהיר", en: "Light oak" },
  "contact.mat.travertine": { he: "טרוורטין", en: "Travertine" },
  "contact.mat.walnut": { he: "אגוז", en: "Walnut" },
  "contact.mat.linen": { he: "פשתן", en: "Linen" },
  "contact.mat.darkOak": { he: "אלון כהה", en: "Dark oak" },
  // truth note, shown wherever materials are listed (SPEC §5.0, canonical materials table)
  "contact.materials.note": { he: "שמות החומרים מתארים את המראה כפי שהוא מופיע בהדמיות. את הבחירה המדויקת לכל בית, סוג האבן, הגימור והספק, אנחנו עושים יחד איתכם.", en: "Material names describe the look as it appears in our visualizations. The exact choice for each home — stone type, finish and supplier — we make together with you." },

  "contact.location.label": { he: "איפה הנכס?", en: "Where is the property?" },
  "contact.location.placeholder": { he: "עיר או אזור", en: "City or area" },
  "contact.location.help": { he: "הסטודיו עובד במרכז ובדרום הארץ.", en: "The studio works across central and southern Israel." },
  "contact.size.label": { he: "גודל משוער (מ״ר)", en: "Approximate size (m²)" },

  "contact.timing.label": { he: "מתי תרצו להתחיל?", en: "When would you like to start?" },
  "contact.timing.choose": { he: "בחרו", en: "Choose" },
  "contact.timing.soon": { he: "בחודשים הקרובים", en: "In the coming months" },
  "contact.timing.six": { he: "בחצי השנה הקרובה", en: "Within six months" },
  "contact.timing.year": { he: "בשנה הקרובה", en: "Within a year" },
  "contact.timing.unsure": { he: "עוד לא יודעים", en: "Not sure yet" },

  "contact.message.label": { he: "ספרו לנו על הבית", en: "Tell us about your home" },
  "contact.message.placeholder": { he: "מי גר בבית, מה חשוב לכם, מה לא עובד היום, ואיך תרצו להרגיש כשאתם נכנסים…", en: "Who lives there, what matters to you, what isn’t working today, and how you’d like to feel when you walk in…" },
  "contact.message.help": { he: "יש לכם תוכניות או תמונות? אפשר לשלוח אותן אחר כך במייל.", en: "Have plans or photos? You can email them afterwards." },
  "contact.message.counter": { he: "{n} / 2000", en: "{n} / 2000" },

  // ---- step 3
  "contact.step3.legend": { he: "הפרטים שלכם", en: "Your details" },
  "contact.step3.help": { he: "מספיק טלפון או אימייל, אחד מהם.", en: "A phone number or an email is enough." },

  "contact.name.label": { he: "שם מלא", en: "Full name" },
  "contact.phone.label": { he: "טלפון", en: "Phone" },
  "contact.email.label": { he: "אימייל", en: "Email" },

  "contact.pref.label": { he: "איך נוח שנחזור אליכם?", en: "How should we get back to you?" },
  "contact.pref.whatsapp": { he: "וואטסאפ", en: "WhatsApp" },
  "contact.pref.phone": { he: "שיחת טלפון", en: "Phone call" },
  "contact.pref.email": { he: "אימייל", en: "Email" },

  "contact.time.label": { he: "מתי נוח לדבר?", en: "When is a good time to talk?" },
  "contact.time.morning": { he: "בוקר", en: "Morning" },
  "contact.time.midday": { he: "צהריים", en: "Midday" },
  "contact.time.evening": { he: "ערב", en: "Evening" },
  "contact.time.any": { he: "לא משנה", en: "Any time" },

  "contact.source.label": { he: "איך הגעתם אלינו?", en: "How did you find us?" },
  "contact.source.instagram": { he: "אינסטגרם", en: "Instagram" },
  "contact.source.referral": { he: "המלצה", en: "A recommendation" },
  "contact.source.google": { he: "חיפוש בגוגל", en: "Google search" },
  "contact.source.other": { he: "אחר", en: "Other" },

  // ---- the letter (§6.3, phrases amended by A7.4)
  "contact.letter.h3": { he: "המכתב שלכם", en: "Your letter" },
  "contact.letter.edit": { he: "עריכה", en: "Edit" },
  "contact.letter.hello": { he: "שלום, שמי {name}.", en: "Hello, my name is {name}." },
  "contact.letter.helloAnon": { he: "שלום,", en: "Hello," },
  "contact.letter.home": { he: "הבית שלנו הוא {property}", en: "Our home is {property}" },
  "contact.letter.homeIn": { he: " באזור {location}", en: " in the {location} area" },
  "contact.letter.homeSize": { he: ", בערך {size} מ״ר", en: ", about {size} m²" },
  "contact.letter.prop.apartment": { he: "דירה", en: "an apartment" },
  "contact.letter.prop.garden": { he: "דירת גן או פנטהאוז", en: "a garden apartment or penthouse" },
  "contact.letter.prop.house": { he: "בית פרטי", en: "a private house" },
  "contact.letter.locSize": { he: "הבית שלנו נמצא באזור {location}, בערך {size} מ״ר.", en: "Our home is in the {location} area, about {size} m²." },
  "contact.letter.locOnly": { he: "הבית שלנו נמצא באזור {location}.", en: "Our home is in the {location} area." },
  "contact.letter.sizeOnly": { he: "הנכס בגודל של כ־{size} מ״ר.", en: "The property is about {size} m²." },
  "contact.letter.stage.before": { he: "אנחנו עוד לפני רכישה.", en: "We haven’t bought yet." },
  "contact.letter.stage.bought": { he: "קנינו, ועוד לא התחלנו לשפץ.", en: "We’ve bought, and haven’t started renovating." },
  "contact.letter.stage.newbuild": { he: "זו בנייה חדשה.", en: "It’s a new build." },
  "contact.letter.stage.mid": { he: "אנחנו באמצע שיפוץ או בנייה.", en: "We’re in the middle of a renovation or build." },
  "contact.letter.stage.refresh": { he: "אנחנו גרים בבית ורוצים לחדש אותו.", en: "We live there and want to refresh it." },
  "contact.letter.spaces": { he: "מדובר {list}.", en: "It’s about {list}." },
  "contact.letter.space.whole": { he: "בכל הבית", en: "the whole home" },
  "contact.letter.space.kitchen": { he: "במטבח", en: "the kitchen" },
  "contact.letter.space.living": { he: "בסלון", en: "the living room" },
  "contact.letter.space.baths": { he: "בחדרי הרחצה", en: "the bathrooms" },
  "contact.letter.space.bedrooms": { he: "בחדרי השינה", en: "the bedrooms" },
  "contact.letter.space.other": { he: "בחללים נוספים", en: "other spaces" },
  "contact.letter.services": { he: "נשמח לעזרה {list}.", en: "We’d love help with {list}." },
  "contact.letter.svc.planning": { he: "בתכנון הדירה", en: "space planning" },
  "contact.letter.svc.interior": { he: "בעיצוב פנים", en: "interior design" },
  "contact.letter.svc.supervision": { he: "בליווי השיפוץ", en: "renovation support" },
  "contact.letter.svc.styling": { he: "בסטיילינג ובהשלמות", en: "styling and finishing" },
  "contact.letter.svcUnsure": { he: "עוד לא בטוחים באיזו עזרה נצטרך.", en: "We’re not sure yet what help we’ll need." },
  "contact.letter.materials": { he: "החומרים שמדברים אלינו: {list}.", en: "Materials that speak to us: {list}." },
  "contact.letter.timing.soon": { he: "נרצה להתחיל בחודשים הקרובים.", en: "We’d like to start in the coming months." },
  "contact.letter.timing.six": { he: "נרצה להתחיל בחצי השנה הקרובה.", en: "We’d like to start within six months." },
  "contact.letter.timing.year": { he: "נרצה להתחיל בשנה הקרובה.", en: "We’d like to start within a year." },
  "contact.letter.timing.unsure": { he: "עוד לא יודעים מתי נרצה להתחיל.", en: "We don’t know yet when we’d like to start." },
  "contact.letter.reach": { he: "אפשר לחזור אליי {pref}.", en: "You can reach me {pref}." },
  "contact.letter.reachTime": { he: "אפשר לחזור אליי {pref}, {time}.", en: "You can reach me {pref}, {time}." },
  "contact.letter.pref.whatsapp": { he: "בוואטסאפ", en: "by WhatsApp" },
  "contact.letter.pref.phone": { he: "בשיחת טלפון", en: "by phone" },
  "contact.letter.pref.email": { he: "במייל", en: "by email" },
  "contact.letter.time.morning": { he: "בשעות הבוקר", en: "in the morning" },
  "contact.letter.time.midday": { he: "בצהריים", en: "at midday" },
  "contact.letter.time.evening": { he: "בערב", en: "in the evening" },

  // ---- validation (§6.4)
  "contact.err.summary": { he: "כדי להמשיך, כדאי לתקן:", en: "Before we continue, please fix:" },
  "contact.err.nameMissing": { he: "איך קוראים לכם? נשמח לדעת.", en: "What’s your name? We’d love to know." },
  "contact.err.nameShort": { he: "השם קצר מדי.", en: "That name looks too short." },
  "contact.err.contactMissing": { he: "השאירו טלפון או אימייל, כדי שנוכל לחזור אליכם.", en: "Leave a phone number or an email so we can get back to you." },
  "contact.err.phoneInvalid": { he: "מספר הטלפון לא נראה תקין. לדוגמה: 050-1234567", en: "That phone number doesn’t look right. For example: 050-1234567" },
  "contact.err.emailInvalid": { he: "כתובת האימייל לא נראית תקינה.", en: "That email address doesn’t look right." },
  "contact.err.prefPhone": { he: "בחרתם וואטסאפ או טלפון, אז נשמח למספר.", en: "You chose WhatsApp or phone, so we’ll need a number." },
  "contact.err.messageLong": { he: "עד 2,000 תווים, בבקשה. את השאר אפשר לשלוח במייל.", en: "Up to 2,000 characters, please. The rest can follow by email." },

  // ---- notice + buttons (§6.5)
  "contact.notice": { he: "בלחיצה על ״שליחת המכתב״ הפרטים יישלחו לסטודיו (<span class=\"u-lat\" lang=\"en\">office@sele-studio.com</span>) באמצעות השירות <bdi lang=\"en\">FormSubmit</bdi>, וישמשו רק כדי לחזור אליכם בנוגע לפנייה. אין חובה חוקית למסור אותם. פרטים נוספים ב<a href=\"/privacy/\">מדיניות הפרטיות</a>.", en: "When you press “Send the letter”, your details are sent to the studio (<span class=\"u-lat\" lang=\"en\">office@sele-studio.com</span>) through the FormSubmit service and used only to get back to you about this inquiry. You are not legally required to provide them. More in our <a href=\"/privacy/\">privacy notice</a>." },
  "contact.btn.next": { he: "המשך", en: "Continue" },
  "contact.btn.back": { he: "חזרה", en: "Back" },
  "contact.btn.send": { he: "שליחת המכתב", en: "Send the letter" },
  "contact.btn.sending": { he: "שולחים…", en: "Sending…" },

  "contact.draft.restored": { he: "המשכנו מאיפה שעצרתם.", en: "We picked up where you left off." },
  "contact.draft.clear": { he: "ניקוי הטופס", en: "Clear the form" },

  // ---- states (§6.7)
  "contact.state.successH": { he: "המכתב בדרך.", en: "Your letter is on its way." },
  "contact.state.successBody": { he: "תודה, {firstName}. קיבלנו את הפנייה ונחזור אליכם בהקדם לתיאום פגישת היכרות.", en: "Thank you, {firstName}. We’ve received your inquiry and will be in touch soon to arrange a first meeting." },
  "contact.state.projects": { he: "לפרויקטים", en: "See the projects" },
  "contact.state.pendingH": { he: "הטופס עוד בהפעלה.", en: "The form is still being set up." },
  "contact.state.pendingP": { he: "בינתיים אפשר לשלוח את אותם פרטים ישירות במייל, בלחיצה אחת:", en: "Meanwhile, you can send the same details by email in one click:" },
  "contact.state.errorH": { he: "משהו השתבש בשליחה.", en: "Something went wrong while sending." },
  "contact.state.errorP": { he: "הפרטים שלכם שמורים כאן. אפשר לנסות שוב, או לשלוח אותם אלינו ישירות במייל.", en: "Your details are kept here. You can try again, or send them to us directly by email." },
  "contact.state.offlineP": { he: "נראה שאין חיבור לאינטרנט כרגע. הפרטים שמורים, ואפשר לנסות שוב כשהחיבור יחזור.", en: "You seem to be offline. Your details are saved — try again once you’re back online." },
  "contact.state.mail": { he: "שליחה במייל", en: "Send by email" },
  "contact.state.copy": { he: "העתקת הפרטים", en: "Copy the details" },
  "contact.state.retry": { he: "לנסות שוב", en: "Try again" },
  "contact.state.ig": { he: "או שלחו לנו הודעה באינסטגרם", en: "Or send us a message on Instagram" },
  "contact.mail.shortened": { he: "…(ההודעה קוצרה)", en: "…(message shortened)" },

  // ---- aside (§5.6)
  "contact.aside.caption": { he: "מתוך העבודות שלנו. הדמיות.", en: "From our work. Renders." },
  "contact.next.h2": { he: "מה קורה אחרי שכותבים לנו?", en: "What happens after you write to us?" },
  "contact.next.1.t": { he: "קוראים את הפנייה", en: "We read your letter" },
  "contact.next.1.d": { he: "כל פנייה נקראת אישית בסטודיו.", en: "Every inquiry is read personally at the studio." },
  "contact.next.2.t": { he: "שיחת היכרות", en: "A first conversation" },
  "contact.next.2.d": { he: "נתאם שיחה קצרה כדי להכיר אתכם ואת הבית.", en: "We’ll arrange a short call to get to know you and the home." },
  "contact.next.3.t": { he: "פגישה ומסגרת", en: "A meeting and a framework" },
  "contact.next.3.d": { he: "אם יש התאמה, ניפגש ונבנה יחד את המסגרת לפרויקט.", en: "If it’s a good fit, we’ll meet and shape the project’s framework together." },
  "contact.area.t": { he: "אזור פעילות", en: "Service area" },
  "contact.area.d": { he: "פרויקטים במרכז ובדרום הארץ", en: "Projects across central and southern Israel" },
  "contact.direct.mail": { he: "מעדיפים מייל?", en: "Prefer email?" },
  "contact.direct.ig": { he: "או הודעה באינסטגרם", en: "Or a message on Instagram" },

  // ---- thank-you page (§5.7, A2)
  "contact.thanks.crumb": { he: "תודה", en: "Thank you" },
  "contact.thanks.h1": { he: "המכתב שלכם הגיע.", en: "Your letter has arrived." },
  "contact.thanks.p": { he: "תודה. קיבלנו את הפנייה ונחזור אליכם בהקדם לתיאום פגישת היכרות.", en: "Thank you. We’ve received your inquiry and will be in touch soon to arrange a first meeting." },
  "contact.thanks.projects": { he: "לפרויקטים", en: "See the projects" },
};
