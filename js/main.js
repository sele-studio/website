/* ============================================================
   SELÈ STUDIO — interactions
   GSAP + ScrollTrigger + Lenis · bilingual HE/EN · RTL aware
   ============================================================ */
(() => {
  "use strict";

  const doc = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const hasST = typeof window.ScrollTrigger !== "undefined";
  const animate = hasGsap && hasST && !reduced;

  /* ---------------------------------------------------------- i18n */
  const I18N = {
    he: {
      "title": "SELÈ STUDIO — אדריכלות ועיצוב פנים",
      "skip": "דילוג לתוכן",
      "nav.studio": "הסטודיו", "nav.projects": "פרויקטים", "nav.services": "שירותים",
      "nav.process": "תהליך", "nav.contact": "צור קשר",
      "hero.l1": "אדריכלות", "hero.l2": "ועיצוב פנים",
      "hero.sub": "סטודיו בוטיק לאדריכלות ועיצוב פנים. נקי, מדויק ונכון — עם יחס אישי וחם.",
      "hero.cta1": "לצפייה בפרויקטים", "hero.cta2": "לתיאום פגישת היכרות", "hero.scroll": "גלילה",
      "hero.alt": "מטבח עם אי אבן מונוליטי ותאורה נסתרת — עיצוב SELÈ STUDIO",
      "about.kicker": "הסטודיו",
      "about.title": "עיצוב שקט. דיוק שמרגישים.",
      "about.p1": "SELÈ STUDIO הוא סטודיו בוטיק לאדריכלות ועיצוב פנים, שנולד מתוך אהבה לאסתטיקה אמיתית — נקייה, מדויקת ונכונה. אנחנו מאמינים שבית טוב נבנה מהפרטים הקטנים: פרופורציה, חומר ואור — ומהתחושה שהוא משאיר.",
      "about.p2": "את הסטודיו מובילה שוהם סלע, מעצבת פנים בוגרת שנקר בהצטיינות. כל פרויקט מלווה ביחס אישי וחם — מהשרטוט הראשון ועד הסטיילינג האחרון.",
      "about.f1": "סטודיו בוטיק", "about.f2l": "שנקר", "about.f2": "בוגרת בהצטיינות",
      "about.f3l": "ליווי", "about.f3": "אישי ומלא, עד המסירה",
      "about.imgAlt": "חדר רחצה — משטח טרוורטין ותאורה חמה",
      "projects.kicker": "פרויקטים", "projects.title": "פרויקטים נבחרים",
      "projects.p1": "מטבח אבן", "projects.p2": "סלון פתוח", "projects.p3": "חדרי רחצה",
      "projects.p4": "חדר שינה", "projects.p5": "מטבח כהה", "projects.p6": "מהתכנון לביצוע",
      "projects.imgs": "תמונות", "projects.img": "תמונה",
      "statement.p": "העבודה שלנו חיה בחיבורים: בין אבן לעץ, בין צל לאור חם, בין ארכיטקטורה לרגש. אנחנו מעצבים בתים שמרגישים שלמים — כאלה שנעים לחזור אליהם.",
      "services.kicker": "שירותים", "services.title": "מהקו הראשון ועד המפתח",
      "services.s1": "תכנון אדריכלי",
      "services.s1p": "תכנון מלא של הנכס: חלוקות וזרימה, פתחים, תאורה ופרטי ביצוע — עד רמת המילימטר. תוכניות עבודה מסודרות שמתרגמות חלום לשפה של אתר בנייה.",
      "services.s2": "עיצוב פנים",
      "services.s2p": "שפה עיצובית שלמה לבית: חומרים, נגרות אישית, ריהוט, טקסטיל וגופי תאורה — הכול נבחר בקפידה, מתוך הקשבה לאופי שלכם ולאור של הבית.",
      "services.s3": "ליווי ביצוע",
      "services.s3p": "נוכחות לאורך כל הבנייה: תיאום ספקים ובעלי מקצוע, ביקורי אתר, פיקוח על פרטים וגימור — כדי שמה שתוכנן הוא בדיוק מה שנבנה.",
      "services.s4": "סטיילינג והשלמות",
      "services.s4p": "השכבה האחרונה שהופכת בית למקום: אבזור, אמנות, צמחייה וסטיילינג מדויק — הפרטים הקטנים שמשאירים תחושה.",
      "process.kicker": "תהליך", "process.title": "חמישה צעדים, בית אחד",
      "process.t1": "היכרות ואפיון", "process.d1": "פגישה ראשונה, הקשבה לצרכים ולחלומות — ובניית תקציב ולוח זמנים ריאליים.",
      "process.t2": "קונספט", "process.d2": "כיוון עיצובי, לוחות השראה וחומרים — השפה שממנה ייבנה הבית.",
      "process.t3": "תכנון מפורט", "process.d3": "תוכניות עבודה, נגרות, תאורה וחשמל — כל פרט סגור לפני שמתחילים.",
      "process.t4": "ביצוע וליווי", "process.d4": "ליווי צמוד של הביצוע, תיאום בעלי מקצוע ופיקוח על איכות הגימור.",
      "process.t5": "מסירה וסטיילינג", "process.d5": "סטיילינג אחרון, הדלקת אורות — והבית שלכם, מוכן לחיים.",
      "insta.kicker": "היומיום של הסטודיו, באינסטגרם",
      "contact.kicker": "צור קשר", "contact.title": "בואו נתחיל בבית שלכם.",
      "contact.sub": "ספרו לנו על הפרויקט — ונחזור אליכם לתיאום פגישת היכרות.",
      "contact.dm": "לשיחה באינסטגרם",
      "footer.rights": "כל הזכויות שמורות",
      "lb.close": "סגירה", "lb.prev": "הקודם", "lb.next": "הבא",
      "cursor.view": "לצפייה", "cursor.follow": "לעקוב", "cursor.mail": "כתבו לנו"
    },
    en: {
      "title": "SELÈ STUDIO — Architecture & Interior Design",
      "skip": "Skip to content",
      "nav.studio": "Studio", "nav.projects": "Projects", "nav.services": "Services",
      "nav.process": "Process", "nav.contact": "Contact",
      "hero.l1": "Architecture", "hero.l2": "& Interior Design",
      "hero.sub": "A boutique studio for architecture and interior design. Clean, precise, true — with a warm personal touch.",
      "hero.cta1": "View projects", "hero.cta2": "Book a consultation", "hero.scroll": "Scroll",
      "hero.alt": "Kitchen with a monolithic stone island and concealed lighting — SELÈ STUDIO design",
      "about.kicker": "The Studio",
      "about.title": "Quiet design. Precision you can feel.",
      "about.p1": "SELÈ STUDIO is a boutique practice for architecture and interior design, born of a love for true aesthetics — clean, precise and right. We believe a good home is built of its smallest details: proportion, material and light — and the feeling it leaves behind.",
      "about.p2": "The studio is led by Shoham Sela, an interior designer and honors graduate of Shenkar. Every project is guided personally and warmly — from the first sketch to the final styling.",
      "about.f1": "Boutique studio", "about.f2l": "Shenkar", "about.f2": "Graduate with honors",
      "about.f3l": "Guidance", "about.f3": "Personal and complete, to handover",
      "about.imgAlt": "Bathroom — travertine vanity in warm light",
      "projects.kicker": "Projects", "projects.title": "Selected works",
      "projects.p1": "Stone Kitchen", "projects.p2": "The Living Room", "projects.p3": "Travertine Baths",
      "projects.p4": "Master Bedroom", "projects.p5": "The Dark Kitchen", "projects.p6": "From Plan to Build",
      "projects.imgs": "images", "projects.img": "image",
      "statement.p": "Our work lives in the joints: stone meeting wood, shadow meeting warm light, architecture meeting emotion. We design homes that feel whole — homes you love returning to.",
      "services.kicker": "Services", "services.title": "From first line to key",
      "services.s1": "Architectural planning",
      "services.s1p": "Complete planning of the property: layouts and flow, openings, lighting and construction details — to the millimetre. Orderly working drawings that translate a dream into the language of a building site.",
      "services.s2": "Interior design",
      "services.s2p": "A complete design language for the home: materials, custom carpentry, furniture, textiles and lighting — all chosen with care, listening to who you are and to the light of the house.",
      "services.s3": "Site supervision",
      "services.s3p": "Present throughout the build: coordinating suppliers and trades, site visits, supervising details and finish — so that what was planned is exactly what gets built.",
      "services.s4": "Styling & completion",
      "services.s4p": "The final layer that turns a house into a place: objects, art, greenery and precise styling — the small details that leave a feeling.",
      "process.kicker": "Process", "process.title": "Five steps, one home",
      "process.t1": "Discovery", "process.d1": "A first meeting, listening to needs and dreams — building a realistic budget and timeline.",
      "process.t2": "Concept", "process.d2": "A design direction, mood boards and materials — the language the home will be built from.",
      "process.t3": "Detailed design", "process.d3": "Working drawings, carpentry, lighting and electricity — every detail closed before we begin.",
      "process.t4": "Execution", "process.d4": "Close guidance of the build, coordinating trades and supervising the quality of finish.",
      "process.t5": "Reveal & styling", "process.d5": "Final styling, lights on — and your home, ready for life.",
      "insta.kicker": "The studio's everyday, on Instagram",
      "contact.kicker": "Contact", "contact.title": "Let's begin with your home.",
      "contact.sub": "Tell us about the project — we'll get back to you to arrange an introduction.",
      "contact.dm": "Message on Instagram",
      "footer.rights": "All rights reserved",
      "lb.close": "Close", "lb.prev": "Previous", "lb.next": "Next",
      "cursor.view": "View", "cursor.follow": "Follow", "cursor.mail": "Say hi"
    }
  };

  let lang = localStorage.getItem("sele-lang");
  if (lang !== "he" && lang !== "en") lang = "he";
  const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.he[key] || "";

  function applyLang(next, firstRun) {
    lang = next;
    try { localStorage.setItem("sele-lang", lang); } catch (e) { /* private mode */ }
    doc.setAttribute("lang", lang);
    doc.setAttribute("dir", lang === "he" ? "rtl" : "ltr");
    document.title = t("title");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (el.classList.contains("word-mask")) {
        setMaskText(el, t(key), !firstRun);
      } else {
        el.textContent = t(key);
      }
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const [attr, key] = el.getAttribute("data-i18n-attr").split(":");
      el.setAttribute(attr, t(key));
    });

    if (!firstRun && hasST) requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------ word masking */
  function splitWords(el, revealed) {
    const text = el.textContent;
    el.textContent = "";
    text.split(/\s+/).filter(Boolean).forEach((word, i, arr) => {
      const mask = document.createElement("span");
      mask.className = "wm";
      mask.style.cssText = "display:inline-block;overflow:hidden;vertical-align:bottom;";
      const inner = document.createElement("span");
      inner.className = "wm-i";
      inner.style.display = "inline-block";
      inner.textContent = word;
      if (animate && !revealed) inner.style.transform = "translateY(115%)";
      mask.appendChild(inner);
      el.appendChild(mask);
      if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }
  function setMaskText(el, text, revealed) {
    el.textContent = text;
    splitWords(el, revealed);
  }

  // Static (non-i18n) masks — statement lines
  document.querySelectorAll(".word-mask:not([data-i18n])").forEach((el) => splitWords(el, false));
  // First i18n pass (also splits i18n masks, hidden state)
  applyLang(lang, true);

  document.getElementById("year").textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------- Lenis */
  let lenis = null;
  if (typeof window.Lenis !== "undefined" && !reduced) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    if (hasGsap) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    if (hasST) lenis.on("scroll", ScrollTrigger.update);
  }

  function scrollToEl(target) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        closeMenu();
        scrollToEl(id);
      }
    });
  });

  /* ---------------------------------------------------------- Header */
  const header = document.getElementById("header");
  const onScroll = () => header.classList.toggle("scrolled", (window.scrollY || 0) > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------- Burger */
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");
  let menuOpen = false;

  function openMenu() {
    menuOpen = true;
    body.classList.add("menu-open");
    burger.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
    menu.style.visibility = "visible";
    if (lenis) lenis.stop();
    if (hasGsap && !reduced) {
      gsap.timeline()
        .to(menu, { clipPath: "inset(0% 0 0% 0)", duration: .7, ease: "power4.inOut" })
        .fromTo(".menu-link", { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, stagger: .07, ease: "power3.out" }, "-=.25")
        .fromTo(".menu-foot a", { opacity: 0 }, { opacity: 1, duration: .4, stagger: .08 }, "-=.3");
    } else {
      menu.style.clipPath = "inset(0 0 0 0)";
    }
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    body.classList.remove("menu-open");
    burger.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
    if (hasGsap && !reduced) {
      gsap.to(menu, {
        clipPath: "inset(0% 0 100% 0)", duration: .55, ease: "power4.inOut",
        onComplete: () => { menu.style.visibility = "hidden"; }
      });
    } else {
      menu.style.clipPath = "inset(0 0 100% 0)";
      menu.style.visibility = "hidden";
    }
  }
  burger.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeMenu(); closeLightbox(); } });

  /* -------------------------------------------------- Lang toggle */
  document.getElementById("lang-toggle").addEventListener("click", () => {
    applyLang(lang === "he" ? "en" : "he", false);
  });

  /* ------------------------------------------------------ Cursor */
  const cursor = document.getElementById("cursor");
  const cursorLabel = document.getElementById("cursor-label");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer && hasGsap) {
    const xTo = gsap.quickTo(cursor, "x", { duration: .18, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: .18, ease: "power3" });
    const xToL = gsap.quickTo(cursorLabel, "x", { duration: .26, ease: "power3" });
    const yToL = gsap.quickTo(cursorLabel, "y", { duration: .26, ease: "power3" });
    window.addEventListener("pointermove", (e) => {
      body.classList.add("cursor-on");
      xTo(e.clientX); yTo(e.clientY); xToL(e.clientX); yToL(e.clientY);
    }, { passive: true });
    document.querySelectorAll("[data-cursor-label]").forEach((el) => {
      el.addEventListener("pointerenter", () => {
        cursorLabel.textContent = t("cursor." + el.getAttribute("data-cursor-label"));
        body.classList.add("cursor-big");
      });
      el.addEventListener("pointerleave", () => body.classList.remove("cursor-big"));
    });
  }

  /* -------------------------------------------------- Accordion */
  document.querySelectorAll("[data-service]").forEach((service) => {
    const head = service.querySelector(".service-head");
    const bodyEl = service.querySelector(".service-body");
    head.addEventListener("click", () => {
      const isOpen = service.classList.contains("open");
      document.querySelectorAll("[data-service].open").forEach((other) => {
        if (other !== service) {
          other.classList.remove("open");
          other.querySelector(".service-head").setAttribute("aria-expanded", "false");
          if (hasGsap) gsap.to(other.querySelector(".service-body"), { height: 0, duration: .5, ease: "power3.inOut" });
          else other.querySelector(".service-body").style.height = "0px";
        }
      });
      service.classList.toggle("open", !isOpen);
      head.setAttribute("aria-expanded", String(!isOpen));
      if (hasGsap) {
        gsap.to(bodyEl, { height: isOpen ? 0 : "auto", duration: .55, ease: "power3.inOut", onComplete: () => hasST && ScrollTrigger.refresh() });
      } else {
        bodyEl.style.height = isOpen ? "0px" : "auto";
      }
    });
  });

  /* -------------------------------------------------- Lightbox */
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector(".lb-img");
  const lbText = lb.querySelector(".lb-text");
  const lbCounter = lb.querySelector(".lb-counter");
  let gallery = [], gIndex = 0, lbOpenState = false, lastFocus = null;

  function renderSlide(dir) {
    const item = gallery[gIndex];
    if (!item) return;
    const swap = () => {
      lbImg.src = item.src;
      lbImg.alt = (lang === "he" ? item.he : item.en) || "";
      lbText.textContent = (lang === "he" ? item.he : item.en) || "";
      lbCounter.textContent = (gIndex + 1) + " / " + gallery.length;
    };
    if (hasGsap && !reduced && dir) {
      gsap.timeline()
        .to([lbImg, lbText], { opacity: 0, x: dir * -26, duration: .22, ease: "power2.in", onComplete: swap })
        .fromTo([lbImg, lbText], { opacity: 0, x: dir * 26 }, { opacity: 1, x: 0, duration: .38, ease: "power3.out" });
    } else {
      swap();
    }
  }
  function openLightbox(items, startIndex, opener) {
    gallery = items; gIndex = startIndex || 0;
    lastFocus = opener || null;
    lbOpenState = true;
    renderSlide(0);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    if (lenis) lenis.stop();
    body.style.overflow = "hidden";
    lb.querySelector(".lb-close").focus({ preventScroll: true });
    // preload neighbours
    items.forEach((it) => { const im = new Image(); im.src = it.src; });
  }
  function closeLightbox() {
    if (!lbOpenState) return;
    lbOpenState = false;
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    if (lenis) lenis.start();
    body.style.overflow = "";
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  function stepLightbox(step) {
    if (!gallery.length) return;
    gIndex = (gIndex + step + gallery.length) % gallery.length;
    renderSlide(step);
  }
  lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
  lb.querySelector(".lb-next").addEventListener("click", () => stepLightbox(1));
  lb.querySelector(".lb-prev").addEventListener("click", () => stepLightbox(-1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  window.addEventListener("keydown", (e) => {
    if (!lbOpenState) return;
    if (e.key === "ArrowRight") stepLightbox(doc.dir === "rtl" ? -1 : 1);
    if (e.key === "ArrowLeft") stepLightbox(doc.dir === "rtl" ? 1 : -1);
  });
  // touch swipe
  let touchX = null;
  lb.addEventListener("pointerdown", (e) => { touchX = e.clientX; }, { passive: true });
  lb.addEventListener("pointerup", (e) => {
    if (touchX === null) return;
    const dx = e.clientX - touchX;
    if (Math.abs(dx) > 48) stepLightbox(dx < 0 ? 1 : -1);
    touchX = null;
  }, { passive: true });

  document.querySelectorAll(".project").forEach((project) => {
    let items = [];
    try { items = JSON.parse(project.getAttribute("data-gallery") || "[]"); } catch (e) { items = []; }
    project.setAttribute("tabindex", "0");
    project.setAttribute("role", "button");
    const open = () => openLightbox(items, 0, project);
    project.addEventListener("click", open);
    project.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  /* ------------------------------------------------- Animations */
  const loader = document.getElementById("loader");
  body.classList.add("is-loading");

  function finishLoad() {
    body.classList.remove("is-loading");
    if (loader) loader.remove();
  }

  if (animate) {
    gsap.registerPlugin(ScrollTrigger);

    const seenIntro = sessionStorage.getItem("sele-intro");

    /* ---- initial states ---- */
    const heroImg = document.querySelector(".hero-media img");
    const heroReveal = document.querySelectorAll(".hero [data-reveal]");
    gsap.set(heroReveal, { opacity: 0, y: 26 });
    gsap.set(heroImg, { scale: 1.14 });

    const intro = gsap.timeline({ paused: true, onComplete: finishLoad });
    if (!seenIntro) {
      try { sessionStorage.setItem("sele-intro", "1"); } catch (e) { /* ignore */ }
      intro
        .set(".loader-word", { letterSpacing: "0.9em", opacity: 0 })
        .set(".loader-estd", { opacity: 0 })
        .set(".seal-s", { opacity: 0, scale: .92, transformOrigin: "50% 50%" })
        .to(".seal-ring", { strokeDashoffset: 0, duration: 1.15, ease: "power2.inOut", stagger: .12 })
        .to(".seal-s", { opacity: 1, scale: 1, duration: .7, ease: "power3.out" }, "-=.45")
        .to(".loader-word", { letterSpacing: "0.55em", opacity: 1, duration: .9, ease: "power3.out" }, "-=.5")
        .to(".loader-estd", { opacity: 1, duration: .5 }, "-=.5")
        .to(loader, { clipPath: "inset(0 0 100% 0)", duration: .9, ease: "power4.inOut", delay: .35 })
        .add(heroIntro(), "-=.55");
    } else {
      gsap.set(loader, { opacity: 1 });
      intro
        .to(loader, { opacity: 0, duration: .45, ease: "power2.out" })
        .add(heroIntro(), "-=.2");
    }

    function heroIntro() {
      const tl = gsap.timeline();
      tl.to(heroImg, { scale: 1, duration: 2.2, ease: "power3.out" }, 0)
        .to(".hero-title .wm-i", { y: 0, duration: 1.05, ease: "power4.out", stagger: .09 }, .15)
        .to(heroReveal, { opacity: 1, y: 0, duration: .9, ease: "power3.out", stagger: .12 }, .5);
      return tl;
    }

    window.addEventListener("load", () => intro.play(), { once: true });
    // Safety: if load event already fired or hangs
    setTimeout(() => { if (body.classList.contains("is-loading")) intro.play(); }, 2600);

    /* ---- generic reveals (outside hero) ---- */
    const generic = gsap.utils.toArray("[data-reveal]").filter((el) => !el.closest(".hero"));
    generic.forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 34 }, {
        opacity: 1, y: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });

    /* ---- clip reveals for media ---- */
    gsap.utils.toArray("[data-clip]").forEach((el) => {
      gsap.fromTo(el,
        { clipPath: "inset(6% 4% 94% 4%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)", duration: 1.35, ease: "power4.inOut",
          scrollTrigger: { trigger: el, start: "top 86%", once: true }
        });
    });

    /* ---- parallax images ---- */
    gsap.utils.toArray("[data-parallax]").forEach((img) => {
      gsap.set(img, { height: "118%", width: "104%", xPercent: -2, yPercent: -8 });
      gsap.to(img, {
        yPercent: 2, ease: "none",
        scrollTrigger: { trigger: img.closest("figure, .statement-bg, .hero-media") || img, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    /* ---- project hover zoom (composes with parallax) ---- */
    if (finePointer) {
      document.querySelectorAll(".project").forEach((project) => {
        const img = project.querySelector(".media img");
        project.addEventListener("pointerenter", () => gsap.to(img, { scale: 1.07, duration: 1, ease: "power3.out" }));
        project.addEventListener("pointerleave", () => gsap.to(img, { scale: 1, duration: 1, ease: "power3.out" }));
      });
    }

    /* ---- statement lines ---- */
    gsap.to(".statement-lines .wm-i", {
      y: 0, duration: 1.1, ease: "power4.out", stagger: .14,
      scrollTrigger: { trigger: ".statement", start: "top 70%", once: true }
    });

    /* ---- marquee ---- */
    const track = document.querySelector(".marquee-track");
    if (track) {
      gsap.to(track, { xPercent: -50, ease: "none", duration: 30, repeat: -1 });
    }

    /* ---- active nav link ---- */
    const sections = ["about", "projects", "services", "process", "contact"];
    sections.forEach((id) => {
      const sec = document.getElementById(id);
      if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: "top 45%", end: "bottom 45%",
        onToggle: (self) => {
          document.querySelectorAll('.nav-link[href="#' + id + '"]').forEach((link) =>
            link.classList.toggle("active", self.isActive));
        }
      });
    });

  } else {
    /* No animation path: show everything */
    document.querySelectorAll(".wm-i").forEach((el) => { el.style.transform = "none"; });
    window.addEventListener("load", finishLoad, { once: true });
    setTimeout(finishLoad, 1200);
  }
})();
