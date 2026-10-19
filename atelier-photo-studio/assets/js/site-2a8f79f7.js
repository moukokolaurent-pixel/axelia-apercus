/* L'Atelier Photo Montpellier — mouvement et comportements de la maquette. Aucun envoi réseau.
   Principe : le contenu est visible par défaut ; les états de départ des animations sont posés ici,
   juste avant de jouer. Si le mouvement est réduit, rien de tout cela ne s'exécute. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  html.classList.remove("no-js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isDesk = () => innerWidth >= 900;
  const gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  const anim = !reduced && !!gsap;
  if (gsap && ST) gsap.registerPlugin(ST);
  if (gsap && Split) gsap.registerPlugin(Split);
  // Mesuré seulement une fois la mise en page faite (voir « Lancement ») ; la 404 tient sur un écran
  const scrollable = () => document.documentElement.scrollHeight > innerHeight + 4;
  const canScrub = () => anim && !!ST && scrollable();
  /* Téléphone : pas de survol, donc le mouvement est lié au défilement du pouce */
  const pouce = () => !isDesk() && canScrub();
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 900))]);
  const store = { set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  /* Jetons de mouvement (ux-douceur) : cinq courbes, nommées d'après le labo */
  if (gsap && window.CustomEase) gsap.registerPlugin(window.CustomEase);
  const courbe = (nom, bez, repli) => (gsap && window.CustomEase ? window.CustomEase.create(nom, bez) : repli);
  const E = {
    bain: courbe("bain", ".30,.10,.15,1", "power2.out"),       // entrées longues : titres, images, tirages
    papier: courbe("papier", ".25,.35,.20,1", "power2.out"),   // petits déplacements, interface
    lame: courbe("lame", ".55,.05,.25,1", "power2.inOut"),     // rideau, margeurs, menu, visionneuse
    souffle: courbe("souffle", ".45,0,.55,1", "sine.inOut"),   // opacités, couleurs, développement
    plume: courbe("plume", ".42,.10,.50,.92", "sine.inOut")    // l'écriture de sa main
  };
  E.sortie = E.bain; E.douce = E.papier; E.volet = E.lame; // anciens noms : le reste du fichier hérite de la douceur
  /* L'écriture de sa main : un bord d'encre fondu glisse de gauche à droite.
     Les boucles débordent de la boîte : on écrit dans un <span class="encre"> agrandi, à marges compensées (rien ne bouge). */
  const encre = el => {
    if (!el.__encre || !el.contains(el.__encre)) { const s = document.createElement("span"); s.className = "encre"; s.append(...el.childNodes); el.append(s); el.__encre = s; }
    return el.__encre;
  };
  const dureeEcriture = el => Math.min(1.8, Math.max(.8, .45 + el.textContent.trim().length * .05));
  const cacherEcrit = el => { const t = encre(el); t.classList.add("ecrit-en-cours"); gsap.set(t, { "--m": 0 }); };
  const ecrire = (el, delay = 0, duree) => { const t = encre(el); t.classList.add("ecrit-en-cours");
    return gsap.fromTo(t, { "--m": 0 }, { "--m": 116, duration: duree || dureeEcriture(el), ease: E.plume, delay, onComplete: () => t.classList.remove("ecrit-en-cours") }); };
  const tiltOf = el => parseFloat(el.style.getPropertyValue("--tilt")) || 0;

  /* ── Défilement fluide ─────────────────────────────────────────────── */
  let lenis = null;
  if (anim && ST && window.Lenis) {
    lenis = new window.Lenis({ autoRaf: false, lerp: .08, smoothWheel: true, syncTouch: false, anchors: { offset: -92, duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) },
      prevent: n => !!(n && n.closest && n.closest("[data-lenis-prevent]")) });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  if (ST) ST.config({ ignoreMobileResize: true });
  const velocity = () => (lenis ? lenis.velocity : 0);
  const lockScroll = on => {
    document.body.style.overflow = on ? "hidden" : "";
    if (lenis) on ? lenis.stop() : lenis.start();
  };

  /* ── En-tête : thème selon la section dessous, s'efface en descendant ─ */
  const header = $(".header");
  const mobileCta = $(".mobile-cta");
  const footer = $(".footer");
  const darkSel = ".hero:not(.hero--studio), .hero--studio[data-fond='noir'], .cta, .section--night, .section--gris, .film, .footer, .bleed";
  let lastY = scrollY, ticking = false;
  const headerFrame = () => {
    ticking = false;
    const y = scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 40);
      const els = document.elementsFromPoint(innerWidth / 2, (header.offsetHeight || 70) / 2);
      const under = els.find(e => e !== html && e !== document.body && !e.closest(".header, .rideau, div.intro, .menu, .etiquette, .lightbox, .mobile-cta"));
      const dark = !!(under && under.closest(darkSel));
      header.classList.toggle("header--sombre", dark);
      header.classList.toggle("header--clair", dark);
      if (Math.abs(y - lastY) > 6) {
        const hide = !reduced && y > lastY && y > innerHeight * .6 && !document.body.style.overflow && !header.contains(document.activeElement);
        header.classList.toggle("is-hidden", hide);
        html.style.setProperty("--header-offset", hide ? "0px" : header.offsetHeight + "px");
        lastY = y;
      }
    }
    if (mobileCta) {
      const nearFoot = footer && footer.getBoundingClientRect().top < innerHeight - 40;
      const typing = document.activeElement && document.activeElement.matches("input, textarea, select");
      mobileCta.classList.toggle("is-visible", y > innerHeight * .7 && !nearFoot && !typing);
    }
  };
  const requestHeader = () => { if (!ticking) { ticking = true; requestAnimationFrame(headerFrame); } };
  addEventListener("scroll", requestHeader, { passive: true });
  addEventListener("resize", requestHeader);
  addEventListener("apm:fond", requestHeader); // héros « studio » : le fond change sous l'en-tête
  document.addEventListener("focusin", requestHeader);
  headerFrame();

  /* ── Menu plein écran ──────────────────────────────────────────────── */
  const menu = $("#menu"), burger = $(".burger");
  if (menu && burger) {
    const outside = () => [$("main"), $(".footer")].filter(Boolean);
    const close = () => {
      menu.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); menu.setAttribute("aria-hidden", "true");
      outside().forEach(el => el.removeAttribute("inert")); lockScroll(false); burger.focus();
    };
    burger.addEventListener("click", () => {
      menu.classList.add("is-open"); burger.setAttribute("aria-expanded", "true"); menu.setAttribute("aria-hidden", "false");
      outside().forEach(el => el.setAttribute("inert", "")); lockScroll(true); $(".menu__close", menu).focus();
    });
    $(".menu__close", menu).addEventListener("click", close);
    menu.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    /* Le tirage de chaque page se développe au survol de son lien (ordinateur) */
    const apercu = $(".menu__apercu", menu), apImg = apercu && $("img", apercu);
    const liensApercu = $$("nav a[data-apercu]", menu);
    if (apercu && apImg) {
      burger.addEventListener("click", () => liensApercu.forEach(a => { new Image().src = a.dataset.apercu; }), { once: true });
      const montrer = a => {
        if (apImg.getAttribute("src") === a.dataset.apercu) return;
        apercu.classList.add("is-latent");
        apImg.src = a.dataset.apercu;
        $(".print", apercu).style.rotate = (Math.random() * 4 - 2).toFixed(1) + "deg";
        const reveler = () => requestAnimationFrame(() => apercu.classList.remove("is-latent"));
        apImg.decode ? apImg.decode().then(reveler, reveler) : reveler();
      };
      liensApercu.forEach(a => { a.addEventListener("pointerenter", () => montrer(a)); a.addEventListener("focus", () => montrer(a)); });
    }
  }

  /* ── Rideau entre les pages ────────────────────────────────────────── */
  const rideau = $(".rideau"), rideauTitre = $(".rideau__titre > span");
  const fileOf = href => { try { return new URL(href, location.href).pathname.split("/").pop() || "index.html"; } catch (e) { return ""; } };
  const titres = {};
  $$(".menu nav a").forEach(a => { const f = fileOf(a.getAttribute("href")); const t = a.lastElementChild ? a.lastElementChild.textContent.trim() : a.textContent.trim(); titres[f] = f === "index.html" ? "" : t; });
  // (le titre du rideau s'écrit à la sortie : plus d'état de départ en yPercent)
  const titreDe = url => (/\/journal\//.test(url.pathname) ? (titres["journal.html"] || "") : (titres[fileOf(url.href)] ?? ""));
  if (anim && rideau) {
    document.addEventListener("click", e => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || /^(tel|mailto|sms):/.test(href) || /wa\.me/.test(href)) return;
      let url;
      try { url = new URL(href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return; // même page : Lenis s'en charge
      e.preventDefault();
      const titre = titreDe(url);
      store.set("apm:nav", JSON.stringify({ t: Date.now(), titre }));
      if (rideauTitre) rideauTitre.textContent = titre;
      const d = isDesk() ? .95 : .8;
      lockScroll(true);
      if (rideauTitre && titre) cacherEcrit(rideauTitre);
      const tl = gsap.timeline({ onComplete: () => { location.href = url.href; } })
        .set(rideau, { visibility: "visible" })
        .fromTo(rideau, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: d, ease: E.lame })
        .to("main", { y: "-2.5vh", opacity: .4, duration: d, ease: E.lame }, 0);
      // le nom de la page s'écrit pendant que le rideau monte ; on part quand il est écrit
      if (rideauTitre && titre) tl.add(ecrire(rideauTitre, 0, .7), d * .35);
    });
    const prefetched = new Set();
    const prefetch = e => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      try {
        const u = new URL(a.getAttribute("href"), location.href);
        if (u.origin !== location.origin || u.pathname === location.pathname || prefetched.has(u.pathname)) return;
        prefetched.add(u.pathname);
        const l = document.createElement("link"); l.rel = "prefetch"; l.href = u.pathname; document.head.appendChild(l);
      } catch (err) {}
    };
    document.addEventListener("pointerover", prefetch, { passive: true });
    document.addEventListener("focusin", prefetch);
  }
  addEventListener("pageshow", e => {
    if (!e.persisted) return;
    html.classList.remove("entree");
    if (gsap) { gsap.set(rideau, { clipPath: "inset(100% 0% 0% 0%)" }); gsap.set("main", { clearProps: "all" }); }
    lockScroll(false);
    ST && ST.refresh();
  });

  /* ── Révélations à l'entrée dans l'écran (IntersectionObserver) ───── */
  const pending = new Map();
  let batch = [];
  /* Chorégraphie d'un lot : l'image d'abord, puis l'annotation, le titre, le texte, la légende */
  const ROLE = new WeakMap();
  const ECART = { image: 0, annotation: .1, titre: .25, texte: .6, legende: .9 };
  const flush = () => {
    const list = batch.sort((a, b) => (a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1)); batch = [];
    const roles = list.map(it => ROLE.get(it.el) || "texte");
    const base = Math.min(...roles.map(r => ECART[r]));
    const rang = {};
    list.forEach((it, i) => { const r = roles[i], k = rang[r] = (rang[r] ?? -1) + 1; it.fn(Math.min(ECART[r] - base + k * .12, 1.4)); });
  };
  const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const fn = pending.get(en.target);
      if (!fn) return;
      pending.delete(en.target); io.unobserve(en.target);
      if (!batch.length) requestAnimationFrame(flush);
      batch.push({ el: en.target, fn });
    });
  }, { rootMargin: "0px 0px -15% 0px", threshold: 0 }) : null;
  // Pied de page collant (ordinateur) : il est « à l'écran » dès le chargement, sous la page ; on attend qu'il se découvre
  const piedCollant = () => !!footer && getComputedStyle(footer).position === "sticky";
  const onEnter = (el, fn, role) => {
    if (role) ROLE.set(el, role);
    if (ST && el.closest(".footer") && piedCollant()) {
      ST.create({ trigger: "main", start: "bottom 70%", once: true, onEnter: () => { if (!batch.length) requestAnimationFrame(flush); batch.push({ el, fn }); } });
      return;
    }
    if (!io) return fn(0); pending.set(el, fn); io.observe(el);
  };
  /* Filet de sécurité : un geste très rapide peut faire passer un élément sans que l'observateur le voie */
  let dernierRattrapage = 0;
  const rattraper = () => {
    const now = performance.now();
    if (!io || !pending.size || now - dernierRattrapage < 250) return;
    dernierRattrapage = now;
    pending.forEach((fn, el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * .85 && (r.width || r.height)) { pending.delete(el); io.unobserve(el); fn(0); }
    });
  };
  addEventListener("scroll", () => requestAnimationFrame(rattraper), { passive: true });
  addEventListener("scrollend", rattraper);
  const inHero = el => !!el.closest(".hero");
  const done = new WeakSet();
  // Sur téléphone, le texte replié s'anime en se dépliant : pas de seconde révélation par-dessus
  const dansRepli = el => !isDesk() && !!el.closest(".depli__zone");
  const claim = el => { if (!el || done.has(el) || dansRepli(el)) return false; done.add(el); return true; };

  /* Lignes de titre qui montent dans leur masque */
  const lignes = (el, delay = 0) => {
    if (!Split) { gsap.set(el, { opacity: 1 }); return () => gsap.from(el, { opacity: 0, duration: 1.1, ease: E.souffle, delay }); }
    let joue = false;
    const ecrits = () => $$("em", el).filter(e => /Anne/.test(getComputedStyle(e).fontFamily));
    const italiques = () => $$("em", el).filter(e => !/Anne/.test(getComputedStyle(e).fontFamily));
    // Pas de masque : la ligne ne se fait plus trancher, elle monte doucement en s'éclairant (pas de flou : effet de gabarit)
    const split = Split.create(el, { type: "lines", linesClass: "ligne", autoSplit: true,
      onSplit(self) {
        if (joue) return;
        gsap.set(self.lines, { opacity: 0, yPercent: 30 });
        const it = italiques(); if (it.length) gsap.set(it, { opacity: 0 });
        ecrits().forEach(cacherEcrit);
      } });
    gsap.set(el, { opacity: 1 });
    return () => {
      joue = true;
      const L = split.lines, d = isDesk(), dur = d ? 1.5 : 1.2, st = d ? .16 : .12;
      const rangDe = e => Math.max(0, L.findIndex(l => l.contains(e)));
      gsap.to(L, { yPercent: 0, duration: dur, ease: E.bain, stagger: st, delay, clearProps: "transform" });
      gsap.to(L, { opacity: 1, duration: dur * .75, ease: E.souffle, stagger: st, delay });
      // l'italique arrive un souffle après sa ligne ; l'écriture de sa main, quand la ligne est à moitié là
      italiques().forEach(e => gsap.to(e, { opacity: 1, duration: .9, ease: E.souffle, delay: delay + rangDe(e) * st + .3 }));
      ecrits().forEach(e => ecrire(e, delay + rangDe(e) * st + .55));
    };
  };
  const revealLignes = el => {
    if (!claim(el)) return;
    gsap.set(el, { opacity: 0 });
    fontsReady.then(() => { const play = lignes(el); onEnter(el, d => gsap.delayedCall(d, play), "titre"); });
  };
  /* Texte latent qui se révèle mot à mot au défilement */
  const revealMots = (el, court) => {
    if (!claim(el) || !Split) return;
    fontsReady.then(() => {
      const split = Split.create(el, { type: "words" });
      gsap.set(split.words, { opacity: .12 });
      const line = el.closest(".event");
      if (line) gsap.set(line, { "--f": 0 });
      if (canScrub()) {
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: court ? "top 88%" : "top 80%", end: court ? "top 48%" : "center 42%", scrub: isDesk() ? 1.2 : .9,
          // un tirage développé ne redevient pas latent
          onLeave: self => { const a = self.animation; self.kill(false, true); gsap.to(a, { progress: 1, duration: .8, ease: E.souffle }); } } });
        if (line) tl.to(line, { "--f": 1, duration: .6, ease: E.souffle }, 0);
        tl.to(split.words, { opacity: 1, duration: 1, stagger: .14, ease: E.souffle }, 0);
      } else onEnter(el, () => { line && gsap.to(line, { "--f": 1, duration: .9, ease: E.souffle }); gsap.to(split.words, { opacity: 1, duration: 1.2, stagger: .05, ease: E.souffle }); }, "titre");
    });
  };
  /* Chiffre qui défile jusqu'à sa valeur (« 39 avis », « 15 jours ») */
  const compte = el => {
    if (!claim(el)) return;
    const m = el.textContent.trim().match(/^(\d+)(.*)$/s);
    if (!m) return;
    const cible = +m[1];
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = `<span class="compte" aria-hidden="true">0</span><span aria-hidden="true">${m[2]}</span>`;
    const n = $(".compte", el), o = { v: 0 };
    gsap.set(el, { opacity: 0, y: 12 });
    onEnter(el, d => {
      gsap.to(el, { opacity: 1, duration: .9, ease: E.souffle, delay: d });
      gsap.to(el, { y: 0, duration: 1.3, ease: E.bain, delay: d, clearProps: "transform" });
      gsap.to(o, { v: cible, duration: 2, ease: E.papier, delay: d + .1, onUpdate: () => { n.textContent = Math.round(o.v); } });
    }, "titre");
  };
  /* Une annotation au crayon : elle s'écrit de gauche à droite */
  const revealEcrit = el => {
    if (!claim(el) || inHero(el)) return;
    cacherEcrit(el);
    onEnter(el, d => ecrire(el, d), "annotation");
  };
  /* Paragraphe : le bloc entier, qui monte à peine et se pose */
  const revealTexte = el => {
    if (!claim(el) || inHero(el)) return;
    gsap.set(el, { opacity: 0, y: 14 });
    onEnter(el, d => {
      gsap.to(el, { opacity: 1, duration: 1.1, ease: E.souffle, delay: d });
      gsap.to(el, { y: 0, duration: 1.4, ease: E.bain, delay: d, clearProps: "transform" });
    }, el.matches("figcaption, .caption, cite, .small, .notice") ? "legende" : "texte");
  };
  /* Chapeau (.lead) : par lignes, sans masque ni flou */
  const revealChapeau = el => {
    if (!Split || inHero(el) || el.closest(".offer, .reviews") || !claim(el)) return;
    gsap.set(el, { opacity: 0 });
    fontsReady.then(() => {
      const split = Split.create(el, { type: "lines", linesClass: "ligne" });
      gsap.set(split.lines, { opacity: 0, yPercent: 35 }); gsap.set(el, { opacity: 1 });
      onEnter(el, d => {
        gsap.to(split.lines, { opacity: 1, duration: 1, ease: E.souffle, stagger: .09, delay: d });
        gsap.to(split.lines, { yPercent: 0, duration: 1.3, ease: E.bain, stagger: .09, delay: d, onComplete: () => split.revert() });
      }, "texte");
    });
  };
  const revealFilet = el => {
    if (!claim(el)) return;
    gsap.set(el, { "--f": 0, opacity: 0 });
    onEnter(el, d => { gsap.to(el, { "--f": 1, duration: 1.2, ease: E.bain, delay: d }); gsap.to(el, { opacity: 1, duration: .8, delay: d + .15, ease: E.souffle }); }, "texte");
  };
  /* Images : le margeur s'ouvre, le volet part du bord de l'écran, le papier se développe */
  const DEV0 = "grayscale(1) contrast(.55) brightness(1.55)", DEV1 = "grayscale(0) contrast(1) brightness(1)";
  const developpe = (img, delay = 0, dur = 2) => {
    gsap.fromTo(img, { filter: DEV0 }, { filter: DEV1, duration: dur, ease: E.souffle, delay, clearProps: "filter" });
  };
  const INSETS = { margeur: "inset(10% 16% 13% 7%)", court: "inset(6% 8% 9% 5%)", "volet-d": "inset(0% 0% 0% 30%)", "volet-g": "inset(0% 30% 0% 0%)", fente: "inset(40% 0% 40% 0%)", "fente-v": "inset(0% 38% 0% 38%)" };
  const DUREES = { margeur: 1.7, court: 1.3, "volet-d": 1.8, "volet-g": 1.8, fente: 1.5, "fente-v": 1.6 };
  const revealImage = (el, kind = "margeur") => {
    if (!claim(el) || inHero(el)) return;
    const img = $("img, video", el);
    const dev = el.hasAttribute("data-develop") && img && img.tagName === "IMG";
    // Téléphone : l'ouverture suit le pouce au lieu de partir seule
    if (pouce()) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 96%", end: kind === "court" ? "top 64%" : "top 45%", scrub: .9 } })
        .fromTo(el, { clipPath: INSETS[kind], opacity: .35 }, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, ease: "power1.out" }, 0);
      if (img) tl.fromTo(img, { scale: 1.1 }, { scale: 1, ease: "none" }, 0);
      if (dev) { gsap.set(img, { filter: DEV0 }); onEnter(el, () => developpe(img, .1, 1.6)); }
      return;
    }
    gsap.set(el, { clipPath: INSETS[kind], opacity: 0 });
    if (img) gsap.set(img, { scale: 1.08 });
    if (dev) gsap.set(img, { filter: DEV0 });
    onEnter(el, d => {
      gsap.to(el, { opacity: 1, duration: .7, ease: E.souffle, delay: d });
      gsap.to(el, { clipPath: "inset(0% 0% 0% 0%)", duration: DUREES[kind], ease: E.lame, delay: d, clearProps: "clipPath" });
      if (img) gsap.to(img, { scale: 1, duration: 2.4, ease: E.bain, delay: d });
      if (dev) developpe(img, d + .2);
    }, "image");
  };
  /* Un tirage posé sur la table */
  const poseEntree = (print, delay = 0) => {
    if (!claim(print)) return;
    const sgn = tiltOf(print) >= 0 ? 1 : -1;
    gsap.set(print, { "--dy": "60px", "--dt": 5 * sgn + "deg", opacity: 0, "--ombre": 0 });
    onEnter(print, d => {
      gsap.to(print, { "--dy": "0px", "--dt": "0deg", duration: 1.6, ease: E.bain, delay: delay + d });
      gsap.to(print, { opacity: 1, duration: .9, ease: E.souffle, delay: delay + d });
      gsap.to(print, { "--ombre": 1, duration: 1.2, ease: E.souffle, delay: delay + d + .3 });
      const img = $("img", print);
      if (print.hasAttribute("data-develop") && img) developpe(img, delay + d + .1);
    }, "image");
  };
  const poseScrub = (print, opts = {}) => {
    if (!claim(print)) return;
    const sgn = tiltOf(print) >= 0 ? 1 : -1;
    const tl = gsap.timeline({ scrollTrigger: { trigger: print, start: opts.start || "top 95%", end: opts.end || "top 55%", scrub: isDesk() ? 1 : .9 } });
    tl.fromTo(print, { "--dy": (opts.y || 100) + "px", "--dt": (opts.dt ?? 6 * sgn) + "deg" }, { "--dy": "0px", "--dt": "0deg", ease: "power1.out", duration: 1 }, 0)
      .fromTo(print, { opacity: 0 }, { opacity: 1, ease: "none", duration: .35 }, 0)
      .fromTo(print, { "--ombre": 0 }, { "--ombre": 1, ease: "none", duration: .45 }, .45);
    const img = $("img", print);
    if (print.hasAttribute("data-develop") && img) onEnter(print, () => developpe(img, .2));
  };

  /* ── Révélateur WebGL, avec repli CSS ──────────────────────────────── */
  const R = window.Revelateur;
  const glCreate = (el, opts) => (anim && R ? R.create(el, Object.assign({ vitesse: velocity }, opts)).catch(() => null) : Promise.resolve(null));

  /* ── Héros : entrée au chargement (intro complète, ou version courte) ─ */
  const hero = $(".hero");
  const heroMedia = hero ? $(".hero__media", hero) : null;
  const heroImg = heroMedia ? $(":scope > img", heroMedia) : null;
  const heroAnim = hero ? $$("[data-anim]", hero) : [];
  const accueil = !!hero && hero.matches(".hero--accueil");
  const studio = !!hero && hero.matches(".hero--studio") && !!window.Studio; // proposition « studio » (studio.js)
  /* Cadre de projection : en unités d'écran sur ordinateur, en pixels sur téléphone (sous l'en-tête, dans la marge) */
  const cadre = () => {
    if (isDesk()) return ["12svh", "18vw", "16svh", "18vw"];
    const g = Math.round(Math.min(72, Math.max(20, innerWidth * .05)));
    return [(header ? header.offsetHeight : 64) + 8 + "px", g + "px", Math.round(innerHeight * .42) + "px", g + "px"];
  };
  const moitie = () => (isDesk() ? "50svh" : Math.round(innerHeight / 2) + "px");
  const nul = () => (isDesk() ? ["0svh", "0vw"] : ["0px", "0px"]);

  /* Ouverture (ux-douceur §6) : une seule timeline, créée quand les polices sont prêtes. La photo est là dès la
     première image, latente (un trait de lumière), puis la fente s'ouvre, le tirage se développe, le titre se met
     au point, « cet instant. » s'écrit, le reste suit. t0 : départ de la fente, compté depuis l'appel. */
  let glHero = Promise.resolve(null), ouverture = null;
  const preparerHero = () => {
    if (!accueil || !heroImg) return;
    gsap.set(heroImg, { filter: "grayscale(1) brightness(.25)" }); // repli CSS : latent, jamais en couleur brute
    glHero = glCreate(heroMedia, { papier: "noir", zone: hero }).then(gl => { if (gl) gl.setProgress(.12); return gl; });
  };
  const heroEntrance = (t0 = 0, opts = {}) => {
    if (!hero) return;
    const h1 = $("h1", hero), desk = isDesk();
    const sur = $(".eyebrow", hero), lead = $(".hero__lead", hero), btns = $(".btns", hero);
    const rest = heroAnim.filter(el => el !== h1);
    rest.concat(h1 ? [h1] : []).forEach(el => done.add(el));
    gsap.set(rest, { opacity: 0, y: 10 });
    if (opts.entete && header) gsap.set(header, { opacity: 0, y: -8 });
    const appel = performance.now();
    fontsReady.then(() => {
      const tl = ouverture = gsap.timeline({ delay: Math.max(0, t0 - (performance.now() - appel) / 1000) });
      const court = !!opts.court;
      // positions (s) : ordinateur / téléphone ; version courte un peu plus serrée
      const P = desk ? { titre: court ? .5 : .7, sur: court ? 1 : 1.15, chapeau: court ? 1.2 : 1.35, entete: court ? 1.35 : 1.55 }
                     : { titre: .65, sur: 1.15, chapeau: 1.35, entete: 1.6 };
      if (studio) {
        tl.add(window.Studio.entree({ E, flash: !!opts.flash }), 0);
        Object.assign(P, { titre: .55, sur: .95, chapeau: 1.2, entete: 1.35 });
      } else if (accueil) {
        const c = cadre();
        tl.fromTo(heroMedia, { "--ct": moitie(), "--cb": moitie(), "--cr": c[1], "--cl": c[3], opacity: 1 }, { "--ct": c[0], "--cb": c[2], duration: desk ? .9 : .8, ease: E.lame }, 0);
        const dev = desk ? 2 : 1.6;
        tl.add(() => glHero.then(gl => {
          if (gl) gl.develop(dev, 0, E.souffle);
          else if (heroImg) gsap.to(heroImg, { filter: "grayscale(0) brightness(1)", duration: dev, ease: E.souffle, clearProps: "filter" });
        }), .3);
        // Sans défilement possible, le cadre s'ouvre seul ; sinon c'est le pouce (ou la molette) qui l'ouvre
        if (!canScrub()) { const z = nul(); tl.to(heroMedia, { "--ct": z[0], "--cr": z[1], "--cb": z[0], "--cl": z[1], duration: 1.1, ease: E.lame }, 2.4); }
      } else {
        tl.set(heroMedia, { opacity: 1 }, 0);
        if (heroImg) { tl.fromTo(heroImg, { scale: 1.08 }, { scale: 1, duration: 2.4, ease: E.bain }, 0); developpe(heroImg, 0, 2); }
        if (!desk && heroMedia) tl.fromTo(heroMedia, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: E.lame, clearProps: "clipPath" }, 0);
        P.titre = .4; P.sur = .85; P.chapeau = 1.05; P.entete = 1.2;
      }
      if (h1) { const play = lignes(h1, 0); tl.add(play, P.titre); }
      if (sur) tl.to(sur, { opacity: 1, y: 0, duration: .8, ease: E.souffle }, P.sur);
      const suite = [lead, btns].filter(Boolean);
      if (suite.length) tl.to(suite, { opacity: 1, y: 0, duration: 1, ease: E.souffle, stagger: .12 }, P.chapeau);
      const autres = rest.filter(el => el !== sur && !suite.includes(el));
      if (autres.length) tl.to(autres, { opacity: 1, y: 0, duration: 1, ease: E.souffle }, P.chapeau);
      if (opts.entete && header) tl.to(header, { opacity: 1, y: 0, duration: .8, ease: E.souffle, clearProps: "opacity,transform" }, P.entete);
    });
  };

  const heroScroll = () => {
    if (!hero || !canScrub() || hero.matches(".hero--404")) return;
    const content = $(".hero__content", hero), scrollHint = $(".hero__scroll", hero);
    if (studio) {
      // Profondeur au départ : le nom s'éloigne plus vite qu'Anne ; sur ordinateur, le texte s'efface
      // (au téléphone, le texte est sous la scène : on le lit en défilant, il reste net)
      // (au téléphone, Anne ne descend pas : elle passerait sous la régie et le texte)
      const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } })
        .to(".studio__nom", { yPercent: -45, ease: "none" }, 0);
      if (isDesk()) tl.fromTo(hero, { "--par": "0px" }, { "--par": () => Math.round(innerHeight * .08) + "px", ease: "none" }, 0) // via « translate » : l'entrée garde « transform »
        .to(content, { y: "-8vh", opacity: .2, ease: "none" }, 0);
    } else if (accueil) {
      // Le pouce (ou la molette) ouvre la projection jusqu'au plein écran, héros épinglé
      const c = cadre(), z = nul(), h1 = $("h1", hero), desk = isDesk();
      const tl = gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: () => "+=" + innerHeight * (desk ? .8 : .9), pin: true, scrub: .6, anticipatePin: 1 } })
        .fromTo(heroMedia, { "--ct": c[0] }, { "--ct": z[0], ease: "none", duration: .55, immediateRender: false }, 0)
        .fromTo(heroMedia, { "--cr": c[1], "--cl": c[3] }, { "--cr": z[1], "--cl": z[1], ease: "none", duration: .65, immediateRender: false }, .1)
        .fromTo(heroMedia, { "--cb": c[2] }, { "--cb": z[0], ease: "none", duration: .8, immediateRender: false }, .2)
        .fromTo(heroMedia, { "--zoom": 1.12 }, { "--zoom": 1, ease: "none", duration: 1 }, 0)
        .to(scrollHint, { opacity: 0, ease: "none", duration: .1 }, 0);
      if (desk) tl.to(h1, { x: "-2vw", ease: "none", duration: 1 }, 0);
      else tl.to(content, { y: () => -innerHeight * .05, ease: "none", duration: 1 }, 0);
      gsap.timeline({ scrollTrigger: { trigger: hero, start: "bottom bottom", end: "bottom top", scrub: true } })
        .to(heroMedia, { yPercent: 14, ease: "none" }, 0).to(content, { y: "-8vh", ease: "none" }, 0);
    } else if (!accueil && heroImg) {
      gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } })
        .to(heroImg, { yPercent: 16, ease: "none" }, 0)
        .to(content, { y: "-8vh", opacity: .2, ease: "none" }, 0);
    }
  };

  /* ── Démarrage : intro, rideau d'entrée ou entrée directe ──────────── */
  const start = () => {
    if (!anim) { html.classList.add("anim-ok"); html.classList.remove("retardateur"); return; }
    if (hero) {
      if (heroMedia) gsap.set(heroMedia, { opacity: 0 });
      gsap.set(heroAnim, { opacity: 0 });
      if (studio) window.Studio.preparer();
      if (accueil) { gsap.set(heroMedia, { "--ct": moitie(), "--cr": cadre()[1], "--cb": moitie(), "--cl": cadre()[3] }); preparerHero(); }
    }
    html.classList.add("anim-ok");
    const retardateur = $("div.retardateur"); // proposition « studio », première visite
    if (studio && html.classList.contains("retardateur") && retardateur) {
      lockScroll(true);
      const r = window.Studio.retardateur(retardateur, {
        E, auFlash: () => heroEntrance(0, { entete: true, flash: true }),
        fin: () => { retardateur.remove(); html.classList.remove("retardateur"); lockScroll(false); requestHeader(); }
      });
      const passer = () => { r.passer(); ["wheel", "touchstart", "keydown", "pointerdown"].forEach(t => removeEventListener(t, passer)); };
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach(t => addEventListener(t, passer, { passive: true }));
      return;
    }
    html.classList.remove("retardateur");
    const intro = $("div.intro"); // <html> porte aussi la classe « intro »
    if (html.classList.contains("intro") && intro) {
      // La signature s'écrit (bord d'encre), se lit, se dissout ; la fente s'ouvre dessous, noir sur noir
      const sig = $(".intro__sig", intro);
      lockScroll(true);
      gsap.set(sig, { clipPath: "none" });
      cacherEcrit(sig);
      const tl = gsap.timeline({ onComplete: () => { intro.remove(); html.classList.remove("intro"); lockScroll(false); requestHeader(); } });
      tl.add(ecrire(sig, 0, isDesk() ? .85 : .8), .1)
        .to(sig, { opacity: 0, y: -6, duration: isDesk() ? .45 : .4, ease: E.souffle }, isDesk() ? 1.15 : 1.1)
        .to(intro, { opacity: 0, duration: .35, ease: E.souffle }, 1.3);
      heroEntrance(isDesk() ? 1.25 : 1.2, { entete: true });
      const skip = () => {
        tl.progress(1);
        if (ouverture && ouverture.time() < .01) ouverture.delay(0).restart();
        ["wheel", "touchstart", "keydown", "pointerdown"].forEach(t => removeEventListener(t, skip));
      };
      ["wheel", "touchstart", "keydown", "pointerdown"].forEach(t => addEventListener(t, skip, { passive: true }));
      return;
    }
    if (html.classList.contains("entree") && rideau) {
      if (rideauTitre) rideauTitre.textContent = html.dataset.rideau || "";
      Promise.race([fontsReady, new Promise(r => setTimeout(r, 600))]).then(() => {
        gsap.set(rideau, { clipPath: "inset(0% 0% 0% 0%)", visibility: "visible" });
        html.classList.remove("entree");
        const d = isDesk() ? 1.15 : .95;
        gsap.timeline({ onComplete: () => { gsap.set(rideau, { clipPath: "inset(100% 0% 0% 0%)" }); gsap.set(rideauTitre, { clearProps: "opacity,transform" }); store.del("apm:nav"); } })
          .to(rideauTitre, { opacity: 0, y: -10, duration: .55, ease: E.souffle }, .2)
          .to(rideau, { clipPath: "inset(0% 0% 100% 0%)", duration: d, ease: E.lame }, .35);
        heroEntrance(.4, { court: true });
      });
      return;
    }
    heroEntrance(.05, { court: true, entete: true });
  };

  /* ── Mise en place des gestes ──────────────────────────────────────── */
  const setup = () => {
    if (!anim) return;
    heroScroll();

    // Titres en lignes, citations mot à mot, textes en fondu
    $$("main h1, main h2, .manifesto:not(.manifesto--xl), .footer__big, .facts dt, .offer__price, .door h3").forEach(el => {
      if (el.classList.contains("sr-only") || inHero(el) || el.closest(".offer")) return;
      if (el.matches("h2") && /^\s*«/.test(el.textContent)) return revealMots(el, true);
      if (el.matches(".manifesto") && pouce()) return revealMots(el, true);
      if (el.matches(".facts dt") && /^\d/.test(el.textContent.trim())) return compte(el);
      revealLignes(el);
    });
    $$(".event p, .manifesto--xl").forEach(el => revealMots(el));
    $$(".seances .serif-quote, .pull").forEach(el => revealMots(el, true));
    $$(".checks li, .places li, .facts > div, .options > div, .review-card").forEach(revealFilet);
    // Annotations écrites de sa main : elles s'écrivent de gauche à droite
    $$("main .eyebrow").forEach(el => { if (/Anne/.test(getComputedStyle(el).fontFamily)) revealEcrit(el); });
    $$("main .lead").forEach(revealChapeau);
    $$("main .eyebrow, main .lead, main .muted, main .caption, main figcaption, main .notice, main .review-card cite, .footer__grid > div, .strip__item p, main .small, main .serif-quote").forEach(el => { if (!el.closest(".offer, .reviews")) revealTexte(el); });

    // Signature d'Anne qui s'écrit
    $$("main .signature").forEach(sig => {
      if (!claim(sig)) return;
      cacherEcrit(sig);
      onEnter(sig, d => ecrire(sig, d + .2), "legende");
    });

    // Tirages : posés sur la table (au pouce sur téléphone)
    $$(".layered .print").forEach(p => { if (canScrub()) poseScrub(p, { start: "top 95%", end: "center 60%", y: 80, dt: -6 }); else poseEntree(p); });
    $$(".print").forEach(p => {
      if (p.closest(".planche, [data-flash]") || p.querySelector("[data-gl]")) return;
      if (pouce()) poseScrub(p, { start: "top 100%", end: "top 60%", y: 80 }); else poseEntree(p);
    });

    // Téléphone : les portes de l'accueil s'empilent comme des tirages
    const portes = $$(".doors .door");
    if (pouce() && portes.length > 1) {
      portes.forEach((d, i) => {
        d.style.setProperty("--k", i);
        const ombre = document.createElement("span"); ombre.className = "door__ombre"; ombre.setAttribute("aria-hidden", "true"); d.appendChild(ombre);
        const suivante = portes[i + 1];
        if (!suivante) return;
        gsap.timeline({ scrollTrigger: { trigger: suivante, start: "top bottom", end: () => "top " + (parseFloat(getComputedStyle(suivante).top) || 0) + "px", scrub: true, invalidateOnRefresh: true } })
          .to(d, { scale: .94, rotate: i % 2 ? 1.1 : -1.1, ease: "none" }, 0)
          .to(ombre, { opacity: .3, ease: "none" }, 0);
      });
      $(".doors").classList.add("is-pile");
    }

    // Les sections noires s'ouvrent comme la porte du labo
    if (canScrub()) $$(".section--night:not(.planche), .section--gris, .cta").forEach(s => {
      gsap.fromTo(s, { clipPath: isDesk() ? "inset(0% 4% 0% 4%)" : "inset(0% 4.5% 0% 4.5%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power1.out",
        scrollTrigger: { trigger: s, start: "top bottom", end: "top 30%", scrub: isDesk() ? true : .6 }, clearProps: "clipPath" });
    });

    // Images
    $$(".big").forEach(el => revealImage(el, el.classList.contains("big--left") ? "volet-g" : "volet-d"));
    $$(".vertical-video").forEach(el => revealImage(el, "fente-v"));
    $$(".door__img, .film-card .frame").forEach(el => revealImage(el, "margeur"));
    $$(".post .frame").forEach(el => revealImage(el, "court"));
    $$("main .frame").forEach(el => {
      if (el.closest(".print, .wall, .planche, .hero, .cta, .bleed, [data-rafale], .lightbox, aside")) return;
      revealImage(el, !isDesk() && el.getBoundingClientRect().width > innerWidth * .8 ? "fente" : "margeur");
    });

    if (canScrub()) {
      // Parallaxe lente des grandes images
      $$("[data-parallax]").forEach(el => { const img = $("img", el); img && gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }); });
      $$(".cta__media img").forEach(img => gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: "none", scrollTrigger: { trigger: img.closest(".cta"), start: "top bottom", end: "bottom top", scrub: true } }));
      if (isDesk()) {
        // Colonne du milieu des avis (les portes, devenues des volets, ne bougent plus)
        $$(".review-grid").forEach(g => $$(".review-card", g).filter((c, i) => i % 3 === 1).forEach(m => gsap.fromTo(m, { y: 30 }, { y: -30, ease: "none", scrollTrigger: { trigger: g, start: "top bottom", end: "bottom top", scrub: true } })));
      }
      // Film : la projection s'ouvre
      $$("[data-projection]").forEach(f => {
        const v = $("video", f);
        gsap.timeline({ scrollTrigger: { trigger: f, start: "top bottom", end: "top 20%", scrub: .9 } })
          .fromTo(f, { clipPath: "inset(7% 9% 7% 9%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0)
          .fromTo(v, { scale: 1.05 }, { scale: 1, ease: "none" }, 0);
      });
      // Pause plein écran de l'étang : le cadre s'ouvre
      $$(".bleed .frame").forEach(f => gsap.fromTo(f, { clipPath: "inset(6% 8% 6% 8%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "top 15%", scrub: .9 } }));
      // Chapitres : le numéro remonte doucement
      $$(".chapter").forEach(ch => { const n = $(".chapter__n", ch); n && gsap.to(n, { y: -60, ease: "none", scrollTrigger: { trigger: ch, start: "top 80%", end: "bottom 60%", scrub: true } }); });
      // Frise des étapes : un filet court, chaque étape apparaît quand il l'atteint
      $$(".steps").forEach(s => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: "top 80%", end: "top 35%", scrub: .9 } });
        tl.fromTo(s, { "--f": 0 }, { "--f": 1, ease: "none", duration: 1 }, 0);
        $$("li", s).forEach((li, i) => { done.add(li); tl.fromTo(li, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .35, ease: E.souffle }, i * .2); });
      });
    } else $$(".steps li").forEach(revealTexte);

    // Numéros de chapitre dans leur masque
    $$(".chapter__n > span").forEach(n => { if (!claim(n)) return; gsap.set(n, { yPercent: 100 }); onEnter(n.parentElement, d => gsap.to(n, { yPercent: 0, duration: 1.1, ease: E.sortie, delay: d })); });

    // Formules : le filet se trace, la carte noire s'ouvre par une fente
    $$(".offers").forEach(group => $$(".offer", group).forEach((o, i) => {
      if (!claim(o)) return;
      const kids = [...o.children];
      gsap.set(o, { "--f": 0 }); gsap.set(kids, { opacity: 0, y: 12 });
      const mark = o.classList.contains("offer--mark");
      if (mark) gsap.set(o, { clipPath: "inset(50% 0% 50% 0%)" });
      onEnter(o, () => {
        const d = i * .16;
        if (mark) gsap.to(o, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: E.lame, delay: d, clearProps: "clipPath" });
        gsap.to(o, { "--f": 1, duration: 1.2, ease: E.bain, delay: d });
        gsap.to(kids, { opacity: 1, duration: .9, ease: E.souffle, stagger: .08, delay: d + .3 });
        gsap.to(kids, { y: 0, duration: 1.2, ease: E.bain, stagger: .08, delay: d + .3, clearProps: "transform" });
      });
    }));
  };

  /* ── Planche contact : défilement horizontal épinglé ───────────────── */
  const planche = () => {
    const sec = $("[data-planche]");
    if (!sec) return;
    const strip = $(".strip", sec), items = $$(".strip__item", sec), prints = items.map(it => $(".print", it));
    const compte = $(".planche__compte", sec), vues = $(".planche__vues", sec);
    const prev = $("[data-prev]", sec), next = $("[data-next]", sec);
    const n = items.length;
    let cur = 0;
    const setCount = i => {
      if (!compte || i === cur) return; cur = i;
      const txt = `${String(i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
      if (!anim) { compte.textContent = txt; return; }
      gsap.timeline().to(compte, { yPercent: -100, opacity: 0, duration: .3, ease: E.souffle }).set(compte, { textContent: txt, yPercent: 100 }).to(compte, { yPercent: 0, opacity: 1, duration: .6, ease: E.papier });
    };
    prints.forEach(p => p && done.add(p));
    if (anim && canScrub() && ST) {
      sec.classList.add("is-pinned"); // téléphone compris : le pouce fait défiler la planche
      strip.removeAttribute("data-lenis-prevent-horizontal");
      $$("img", sec).forEach(i => { i.loading = "eager"; });
      // la bande commence après la colonne du titre sur ordinateur : on compte son décalage
      const dist = () => Math.max(0, strip.offsetLeft + strip.scrollWidth - innerWidth);
      const tween = gsap.to(strip, { x: () => -dist(), ease: "none" });
      const st = ST.create({ trigger: sec, start: "top top", end: () => "+=" + Math.max(1, dist()), pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true, animation: tween,
        onUpdate: self => setCount(Math.round(self.progress * (n - 1))) });
      if (vues) gsap.to(vues, { x: () => -dist() * 1.15, ease: "none", scrollTrigger: { trigger: sec, start: "top top", end: () => "+=" + Math.max(1, dist()), scrub: true, invalidateOnRefresh: true } });
      prints.forEach((p, i) => {
        if (!p) return;
        const t = tiltOf(p), sgn = t >= 0 ? 1 : -1;
        gsap.fromTo(p, { "--dt": 4 * sgn + "deg", scale: .94, opacity: .7 }, { "--dt": -t + "deg", scale: 1, opacity: 1, ease: "none", scrollTrigger: { trigger: items[i], containerAnimation: tween, start: "left 85%", end: "left 40%", scrub: true } });
        gsap.fromTo(p, { "--dt": -t + "deg", opacity: 1 }, { "--dt": -2 * t + "deg", opacity: .75, ease: "none", immediateRender: false, scrollTrigger: { trigger: items[i], containerAnimation: tween, start: "right 35%", end: "right 0%", scrub: true } });
      });
      const go = i => { const k = Math.max(0, Math.min(n - 1, i)); const y = st.start + (st.end - st.start) * k / (n - 1); lenis ? lenis.scrollTo(y, { duration: 1.4, easing: t => 1 - Math.pow(1 - t, 4) }) : scrollTo({ top: y, behavior: "smooth" }); };
      prev && prev.addEventListener("click", () => go(cur - 1));
      next && next.addEventListener("click", () => go(cur + 1));
      items.forEach((it, i) => it.addEventListener("focusin", () => go(i)));
    } else {
      const step = () => strip.clientWidth * .8;
      prev && prev.addEventListener("click", () => strip.scrollBy({ left: -step(), behavior: reduced ? "auto" : "smooth" }));
      next && next.addEventListener("click", () => strip.scrollBy({ left: step(), behavior: reduced ? "auto" : "smooth" }));
      if ("IntersectionObserver" in window) {
        const obs = new IntersectionObserver(es => es.forEach(e => {
          const i = items.indexOf(e.target), p = prints[i];
          if (e.isIntersecting) { setCount(i); if (anim && p) gsap.to(p, { "--dt": -tiltOf(p) + "deg", duration: .6, ease: E.sortie }); }
          else if (anim && p) gsap.to(p, { "--dt": "0deg", duration: .6, ease: E.sortie });
        }), { root: strip, threshold: .6 });
        items.forEach(it => obs.observe(it));
      }
    }
  };

  /* ── Index : un trait glisse sous l'élément actif ──────────────────── */
  const traits = [];
  const placeTrait = nav => {
    const t = nav.__trait; if (!t) return;
    const act = nav.querySelector('[aria-current="true"], [aria-pressed="true"], [aria-selected="true"]');
    if (!act) { t.style.width = "0px"; return; }
    const nr = nav.getBoundingClientRect(), ar = act.getBoundingClientRect();
    t.style.width = ar.width + "px"; t.style.transform = `translateX(${ar.left - nr.left + nav.scrollLeft}px)`;
    if (nav.scrollWidth > nav.clientWidth + 2) nav.scrollTo({ left: act.offsetLeft - (nav.clientWidth - act.offsetWidth) / 2, behavior: reduced ? "auto" : "smooth" });
  };
  $$(".anchor-nav, .filters, .tabs").forEach(nav => {
    const t = document.createElement("span"); t.className = "index__trait"; t.setAttribute("aria-hidden", "true");
    nav.appendChild(t); nav.__trait = t; traits.push(nav);
    requestAnimationFrame(() => placeTrait(nav));
  });
  html.classList.add("index-ok");
  addEventListener("resize", () => traits.forEach(placeTrait));
  fontsReady.then(() => traits.forEach(placeTrait));
  /* Suivi de la section en cours dans les index d'ancres */
  $$("nav[data-suivi]").forEach(nav => {
    const links = $$('a[href^="#"]', nav);
    const targets = links.map(a => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
    const set = id => { links.forEach(a => { if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }); placeTrait(nav); };
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(e.target.id); }), { rootMargin: "-45% 0px -54% 0px" });
      targets.forEach(t => obs.observe(t));
    }
  });

  /* ── Séances (portraits) : la lumière glisse d'une séance à l'autre ── */
  const seances = $("[data-seances]");
  if (seances && anim) {
    const colors = { creme: "#F2EEE7", "creme-2": "#E8E3DA" };
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) gsap.to(seances, { backgroundColor: colors[e.target.dataset.fond] || colors.creme, duration: .8, ease: "power2.inOut" }); }), { rootMargin: "-45% 0px -54% 0px" });
    $$("section[data-fond]", seances).forEach(s => obs.observe(s));
  }

  /* ── Page Anne : le fil, exposer, flasher, filmer, développer ──────── */
  const parcours = $("[data-parcours]");
  if (parcours && anim && canScrub()) {
    const rail = $(".rail", parcours), trait = $(".rail__trait", parcours);
    const chap = $$("[data-chapitre]", parcours);
    const points = chap.map(() => { const p = document.createElement("span"); p.className = "rail__point"; rail.appendChild(p); return p; });
    const placePoints = () => { const top = parcours.getBoundingClientRect().top; chap.forEach((c, i) => { points[i].style.top = c.getBoundingClientRect().top - top + 120 + "px"; }); };
    placePoints(); addEventListener("resize", placePoints);
    gsap.fromTo(trait, { "--f": 0 }, { "--f": 1, ease: "none", scrollTrigger: { trigger: parcours, start: "top 60%", end: "bottom 60%", scrub: true,
      onUpdate: self => { const h = parcours.offsetHeight * self.progress; points.forEach(p => p.classList.toggle("is-on", parseFloat(p.style.top) <= h)); } } });
  }
  if (anim && canScrub()) $$(".big--expose").forEach(el => {
    done.add(el);
    const img = $("img", el);
    gsap.timeline({ scrollTrigger: { trigger: el, start: "top 85%", end: "top 35%", scrub: .6 } })
      .fromTo(el, { "--expo": 1 }, { "--expo": 0, ease: "none" }, 0).fromTo(img, { scale: 1.08 }, { scale: 1, ease: "none" }, 0);
  });
  if (anim) $$("[data-flash]").forEach(box => {
    const ps = $$(".print", box);
    ps.forEach(p => { done.add(p); gsap.set(p, { "--dy": "90px", "--dt": (tiltOf(p) >= 0 ? 7 : -7) + "deg", opacity: 0 }); const f = document.createElement("span"); f.className = "flash"; $(".frame", p).appendChild(f); });
    onEnter(box, () => ps.forEach((p, i) => {
      const d = i * .4;
      gsap.to(p, { "--dy": "0px", "--dt": "0deg", opacity: 1, duration: 1.1, ease: E.sortie, delay: d });
      gsap.timeline({ delay: d + .15 }).to($(".flash", p), { opacity: .8, duration: .06, ease: "none" }).to($(".flash", p), { opacity: 0, duration: .26, ease: "power2.out" });
    }));
  });
  const tc = $(".timecode"), tcVideo = tc ? tc.parentElement.querySelector("video") : null;
  if (tc && tcVideo && !reduced) {
    const fmt = s => { const f = Math.floor((s % 1) * 25), t = Math.floor(s); return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60, f].map(x => String(x).padStart(2, "0")).join(":"); };
    const upd = () => { tc.textContent = fmt(tcVideo.currentTime || 0); if (!tcVideo.paused) requestAnimationFrame(upd); };
    tcVideo.addEventListener("play", upd); tcVideo.addEventListener("seeked", upd);
  }
  /* Chambre noire : le tirage se développe au rythme du défilement */
  if (anim) $$('[data-gl="scrub"]').forEach(frame => {
    const print = frame.closest(".print"), img = $("img", frame), cap = print && print.parentElement.querySelector(".print-caption");
    if (print) done.add(print);
    if (cap) { done.add(cap); gsap.set(cap, { opacity: 0 }); }
    const scrubbed = canScrub();
    glCreate(frame, { papier: "blanc", liquide: .012, interactif: false }).then(gl => {
      if (scrubbed) {
        if (!gl) gsap.set(img, { filter: "brightness(2.4) contrast(.3) grayscale(1)" });
        ST.create({ trigger: frame, start: "top 75%", end: "center 50%", scrub: .5, onUpdate: self => {
          const p = self.progress;
          if (gl) gl.setProgress(p);
          else gsap.set(img, { filter: `brightness(${2.4 - 1.4 * p}) contrast(${.3 + .7 * p}) grayscale(${1 - p})` });
          if (cap && p > .95) gsap.to(cap, { opacity: 1, duration: .8, overwrite: true });
        } });
      } else onEnter(frame, () => { gl ? gl.develop(3) : developpe(img, 0, 2.4); cap && gsap.to(cap, { opacity: 1, duration: .8, delay: 2.4 }); });
    });
  });
  /* Pause de l'étang (mariage) : développement à l'entrée */
  if (anim) $$(".bleed .frame").forEach(frame => {
    done.add(frame);
    const img = $("img", frame);
    onEnter(frame, () => glCreate(frame, { papier: "blanc" }).then(gl => { if (gl) gl.develop(2); else developpe(img, 0, 1.8); }));
  });

  /* ── Entreprises : la série prise au flash ─────────────────────────── */
  if (anim) $$("[data-rafale]").forEach(box => {
    const frames = $$(".frame", box);
    frames.forEach(f => { done.add(f); const fl = document.createElement("span"); fl.className = "flash"; f.appendChild(fl); gsap.set(f, { opacity: 0 }); gsap.set($("img", f), { scale: 1.04 }); });
    frames.forEach((f, i) => {
      const d = .4 + i * .16;
      gsap.to(f, { opacity: 1, duration: .5, delay: d });
      gsap.to($("img", f), { scale: 1, duration: .8, ease: E.sortie, delay: d });
      gsap.fromTo($(".flash", f), { opacity: .7 }, { opacity: 0, duration: .22, ease: "power2.out", delay: d });
    });
    if (canScrub() && isDesk()) frames.forEach(f => gsap.to(f, { y: f.classList.contains("m-push") ? 40 : -40, ease: "none", scrollTrigger: { trigger: box, start: "top top", end: "bottom top", scrub: true } }));
  });

  /* ── 404 : le pointeur révèle l'image latente ──────────────────────── */
  const pinceau = $("[data-pinceau]");
  if (pinceau && anim) {
    const lat = $(".hero__latent", pinceau);
    let tx = .5, ty = .5, x = .5, y = .5, lastMove = 0;
    pinceau.addEventListener("pointermove", e => { const r = pinceau.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; lastMove = performance.now(); });
    gsap.ticker.add(() => {
      const now = performance.now();
      if (now - lastMove > 2000) { const t = now / 14000 * Math.PI * 2; tx = .5 + Math.sin(t) * .3; ty = .5 + Math.sin(2 * t) * .18; }
      x += (tx - x) * .08; y += (ty - y) * .08;
      lat.style.setProperty("--x", (x * 100).toFixed(2) + "%"); lat.style.setProperty("--y", (y * 100).toFixed(2) + "%");
    });
  }

  /* ── Vidéos d'ambiance : lecture quand visibles ────────────────────── */
  const loops = $$("video[data-loop]");
  if (reduced) loops.forEach(v => { v.removeAttribute("autoplay"); v.pause(); });
  else if ("IntersectionObserver" in window) {
    const vio = new IntersectionObserver(entries => entries.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) { if (v.preload === "none") v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
    }), { threshold: .2 });
    loops.forEach(v => vio.observe(v));
  }

  /* ── Films complets dans une fenêtre ───────────────────────────────── */
  const dialog = $("#film-dialog");
  if (dialog) {
    const vid = $("video", dialog), title = $(".dialog__title", dialog), closeBtn = $(".dialog__close", dialog);
    closeBtn.classList.add("repere"); closeBtn.innerHTML = '<span class="croix" aria-hidden="true"></span>';
    $$("[data-film]").forEach(b => b.addEventListener("click", () => {
      vid.src = b.dataset.film; vid.poster = b.dataset.poster || "";
      title.textContent = b.dataset.title || "";
      dialog.showModal(); lockScroll(true); vid.play().catch(() => {});
      if (anim) gsap.fromTo(dialog, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .5, ease: E.sortie });
    }));
    const stop = () => { vid.pause(); vid.removeAttribute("src"); vid.load(); lockScroll(false); };
    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", stop);
    dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  }

  /* ── Avis : un à la fois, lignes qui montent ───────────────────────── */
  $$("[data-reviews]").forEach(box => {
    const items = $$(".review", box);
    if (items.length < 2) return;
    const count = $(".reviews__count", box), timerBar = $(".minuterie", box), pauseBtn = $("[data-pause]", box);
    let i = 0, timer, paused = reduced, busy = false, split = null;
    const DUR = 9000;
    const show = n => {
      if (busy) return;
      const from = items[i]; i = (n + items.length) % items.length; const to = items[i];
      if (count) count.textContent = `${String(i + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
      if (!anim || !Split) { from.classList.remove("is-active"); to.classList.add("is-active"); return; }
      busy = true;
      const outSplit = split || Split.create($("blockquote", from), { type: "lines" });
      const h0 = box.offsetHeight;
      gsap.to(outSplit.lines, { opacity: 0, y: -8, duration: .6, ease: E.souffle, stagger: .04, onComplete: () => {
        outSplit.revert(); from.classList.remove("is-active"); to.classList.add("is-active");
        const h1 = box.offsetHeight;
        gsap.fromTo(box, { height: h0 }, { height: h1, duration: .8, ease: E.lame, clearProps: "height" });
        split = Split.create($("blockquote", to), { type: "lines" });
        gsap.from(split.lines, { opacity: 0, yPercent: 30, duration: 1.2, ease: E.bain, stagger: .1, onComplete: () => { busy = false; } });
        gsap.from($("cite", to), { opacity: 0, duration: .9, ease: E.souffle, delay: .6 });
      } });
    };
    const runBar = () => { if (!timerBar) return; timerBar.classList.remove("is-run"); void timerBar.offsetWidth; if (!paused) timerBar.classList.add("is-run"); };
    const restart = () => { clearInterval(timer); runBar(); if (!paused) timer = setInterval(() => { show(i + 1); runBar(); }, DUR); };
    $("[data-prev]", box).addEventListener("click", () => { show(i - 1); restart(); });
    $("[data-next]", box).addEventListener("click", () => { show(i + 1); restart(); });
    if (pauseBtn) {
      const label = () => { pauseBtn.setAttribute("aria-pressed", String(paused)); pauseBtn.setAttribute("aria-label", paused ? "Relancer les avis" : "Mettre les avis en pause"); };
      label();
      pauseBtn.addEventListener("click", () => { paused = !paused; label(); restart(); });
    }
    const hold = () => { clearInterval(timer); timerBar && timerBar.classList.remove("is-run"); };
    box.addEventListener("mouseenter", hold);
    box.addEventListener("mouseleave", restart);
    box.addEventListener("focusin", hold);
    restart();
  });

  /* ── Replis « légende » : l'amorce du <head> gère l'état, ici on anime ── */
  if (anim) window.depliAnime = (b, zone, ouvrir) => {
    if (zone.dataset.anime) return; // un second appui pendant le mouvement est ignoré
    zone.dataset.anime = "1";
    const D = window.depli, mot = $(".lien__mot", b);
    const fin = () => { delete zone.dataset.anime; gsap.set(zone, { clearProps: "height,overflow" }); lenis && lenis.resize(); ST && ST.refresh(); };
    D.libelle(b, ouvrir);
    if (mot) gsap.fromTo(mot, { yPercent: 100 }, { yPercent: 0, duration: .45, ease: E.sortie });
    if (ouvrir) {
      D.zone(zone, true);
      // le texte monte du bac, ligne par ligne
      const textes = $$("p, li", zone).filter(el => !el.closest("details"));
      const split = Split && textes.length ? Split.create(textes, { type: "lines", linesClass: "ligne" }) : null;
      const h = zone.scrollHeight;
      gsap.set(zone, { height: 0, overflow: "clip" });
      gsap.to(zone, { height: h, duration: Math.min(1, .55 + h / 1600), ease: E.papier, onComplete: fin });
      if (split) gsap.from(split.lines, { yPercent: 40, opacity: 0, duration: 1, ease: E.bain, delay: .1,
        stagger: { amount: Math.min(.5, split.lines.length * .035) }, onComplete: () => split.revert() });
      const filets = $$(".checks li, .review-card", zone);
      const reste = $$(":scope > .eyebrow, :scope > details, .review-card .stars, .review-card cite", zone);
      if (filets.length) gsap.fromTo(filets, { "--f": 0 }, { "--f": 1, duration: .9, ease: E.sortie, stagger: .06, delay: .1 });
      if (reste.length) gsap.from(reste, { opacity: 0, y: 14, duration: .6, ease: E.sortie, stagger: .04, delay: .15 });
    } else {
      gsap.to(zone.children, { opacity: 0, duration: .2, ease: "power1.in" });
      gsap.to(zone, { height: 0, overflow: "clip", duration: .4, ease: "power3.in",
        onComplete: () => { gsap.set(zone.children, { clearProps: "opacity" }); D.zone(zone, false); fin(); } });
    }
  };

  /* ── FAQ : ouverture animée ────────────────────────────────────────── */
  if (anim) $$(".faq details").forEach(d => {
    const sum = $("summary", d), body = $(":scope > div", d);
    if (!sum || !body) return;
    if (!sum.querySelector("span")) sum.innerHTML = `<span>${sum.innerHTML}</span>`;
    sum.addEventListener("click", e => {
      e.preventDefault();
      if (d.open) gsap.to(body, { height: 0, opacity: 0, duration: .35, ease: "power3.in", onComplete: () => { d.open = false; gsap.set(body, { clearProps: "all" }); ST && ST.refresh(); } });
      else { d.open = true; gsap.fromTo(body, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: .5, ease: "power3.out", onComplete: () => { gsap.set(body, { clearProps: "all" }); ST && ST.refresh(); } }); }
    });
  });

  /* ── Étiquette qui suit le pointeur (mur du portfolio, cartes film) ── */
  if (fine && anim) {
    const et = document.createElement("span"); et.className = "etiquette"; et.setAttribute("aria-hidden", "true"); document.body.appendChild(et);
    const ex = gsap.quickTo(et, "x", { duration: .35, ease: "power3.out" }), ey = gsap.quickTo(et, "y", { duration: .35, ease: "power3.out" });
    const label = el => { if (el.matches("[data-lightbox]")) return el.dataset.caption || "Agrandir"; const sr = el.querySelector(".sr-only"); return sr ? sr.textContent.trim() : ""; };
    document.addEventListener("pointermove", e => {
      const t = e.target.closest && e.target.closest("[data-lightbox], .film-card");
      if (t) { et.textContent = label(t); et.classList.toggle("is-clair", !!t.closest(".section--night, .section--gris")); ex(e.clientX + 16); ey(e.clientY + 16); }
      et.classList.toggle("is-on", !!(t && et.textContent));
    }, { passive: true });
  }

  /* ── Au doigt : le bouton répond à l'appui (pastille qui s'étend, flèche qui part) ── */
  if (!fine) {
    const presse = e => {
      const b = e.target.closest && e.target.closest(".btn, .lien, .repere, .door, .play, .mobile-cta a");
      if (!b) return;
      b.classList.add("is-press");
      const fin = () => b.classList.remove("is-press");
      const t = setTimeout(fin, 700);
      // le doigt part en défilement : le navigateur annule l'appui
      b.addEventListener("pointercancel", () => { clearTimeout(t); fin(); }, { once: true });
    };
    document.addEventListener("pointerdown", presse, { passive: true });
  }

  /* ── Boutons magnétiques (pointeur fin) ────────────────────────────── */
  if (fine && anim) $$(".btn, .play__icon").forEach(b => {
    const bx = gsap.quickTo(b, "x", { duration: .5, ease: "power3.out" }), by = gsap.quickTo(b, "y", { duration: .5, ease: "power3.out" });
    const past = b.querySelector(".btn__pastille");
    const px = past ? gsap.quickTo(past, "x", { duration: .5, ease: "power3.out" }) : null, py = past ? gsap.quickTo(past, "y", { duration: .5, ease: "power3.out" }) : null;
    b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); const dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height; bx(dx * 8); by(dy * 8); px && px(dx * 14); py && py(dy * 14); });
    b.addEventListener("pointerleave", () => { bx(0); by(0); px && px(0); py && py(0); });
  });

  /* ── Portfolio : mur en colonnes qui glissent à des vitesses différentes ─ */
  const wall = $("[data-wall]");
  const wallFigs = wall ? $$("figure", wall) : [];
  wallFigs.forEach((f, k) => { f.dataset.i = k; });
  let wallCols = [];
  const wallCount = () => innerWidth >= 1100 ? 4 : innerWidth >= 700 ? 3 : 2;
  const layoutWall = () => {
    if (!wall) return;
    const n = wallCount();
    const cols = Array.from({ length: n }, () => { const c = document.createElement("div"); c.className = "wall__col"; return c; });
    const h = new Array(n).fill(0);
    wallFigs.forEach(f => {
      if (f.hidden) { cols[0].appendChild(f); return; }
      const img = $("img", f), k = h.indexOf(Math.min(...h));
      cols[k].appendChild(f);
      h[k] += (+img.getAttribute("height") || 1) / (+img.getAttribute("width") || 1);
    });
    wallCols.forEach(c => c.remove());
    cols.forEach(c => wall.appendChild(c));
    wallCols = cols;
    wall.classList.add("is-ready");
  };
  if (wall) {
    layoutWall();
    let cols0 = wallCount();
    addEventListener("resize", () => { if (wallCount() !== cols0) { cols0 = wallCount(); layoutWall(); ST && ST.refresh(); } });
    if (anim) {
      // Entrée façon planche contact, colonne par colonne
      const first = wallCols.flatMap((c, ci) => [...c.children].slice(0, 3).map((f, ri) => ({ f, d: ci * .06 + ri * .12 })));
      first.forEach(({ f, d }) => { gsap.set(f, { clipPath: "inset(10% 10% 10% 10%)", opacity: 0 }); gsap.to(f, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, duration: .9, ease: E.sortie, delay: .3 + d, clearProps: "clipPath" }); });
      wallFigs.filter(f => !first.some(x => x.f === f)).forEach(f => { gsap.set(f, { opacity: 0, y: 24 }); onEnter(f, d => gsap.to(f, { opacity: 1, y: 0, duration: .55, ease: E.sortie, delay: d * .6 })); });
      if (canScrub()) {
        const lift = () => (innerWidth < 700 ? [0, 60] : [0, 140, 60, 200]);
        ST.create({ trigger: wall, start: "top bottom", end: "bottom top", scrub: true, onUpdate: self => { const l = lift(); wallCols.forEach((c, i) => gsap.set(c, { y: -self.progress * l[i % l.length] })); } });
      }
    }
    if (fine) {
      wall.addEventListener("pointerover", e => wall.classList.toggle("has-hover", !!e.target.closest("[data-lightbox]")));
      wall.addEventListener("pointerleave", () => wall.classList.remove("has-hover"));
    }
  }
  const filters = $(".filters");
  if (filters) {
    const apply = cat => {
      wallFigs.forEach(f => { f.hidden = cat !== "all" && f.dataset.cat !== cat; if (gsap) gsap.set(f, { clearProps: "opacity,transform,clipPath" }); });
      layoutWall();
      if (anim) gsap.fromTo(wallFigs.filter(f => !f.hidden).sort((a, b) => a.dataset.i - b.dataset.i).slice(0, 16), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .55, ease: E.sortie, stagger: .025 });
      ST && ST.refresh();
    };
    $$("button", filters).forEach(b => b.addEventListener("click", () => {
      $$("button", filters).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      placeTrait(filters);
      if (anim && wall) gsap.to(wall, { opacity: 0, duration: .25, ease: "power2.in", onComplete: () => { apply(b.dataset.filter); gsap.to(wall, { opacity: 1, duration: .2 }); } });
      else apply(b.dataset.filter);
    }));
    const pre = $(`button[data-filter="${location.hash.slice(1)}"]`, filters);
    pre && pre.click();
  }

  /* ── Visionneuse : la vignette s'agrandit, glissement au doigt ─────── */
  const lb = $("#lightbox");
  if (lb) {
    const stage = $(".lightbox__stage", lb), img = $("img", stage), cap = $(".lightbox__cap", lb), num = $(".lightbox__num", lb);
    let list = [], idx = 0, opener = null;
    const fill = (b, dir) => {
      const thumb = $("img", b);
      img.src = thumb.currentSrc || thumb.src; img.alt = thumb.alt;
      const full = new Image(); full.src = b.dataset.full;
      if (full.decode) full.decode().then(() => { if (list[idx] === b) img.src = full.src; }).catch(() => {});
      cap.textContent = b.dataset.caption || ""; num.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
      if (anim && dir) gsap.fromTo(img, { x: dir * innerWidth * .04, opacity: 0 }, { x: 0, opacity: 1, duration: .7, ease: E.sortie });
    };
    const show = (n, dir = 0) => {
      const go = () => { idx = (n + list.length) % list.length; fill(list[idx], dir); };
      if (anim && dir) gsap.to(img, { x: -dir * innerWidth * .04, opacity: 0, duration: .3, ease: "power3.in", onComplete: go }); else go();
    };
    const outside = () => [$("main"), header, $(".footer")].filter(Boolean);
    const open = b => {
      list = $$("[data-lightbox]").filter(x => !x.closest("figure[hidden]")).sort((a, c) => a.closest("figure").dataset.i - c.closest("figure").dataset.i);
      opener = b; idx = list.indexOf(b); fill(b, 0);
      lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false"); lockScroll(true);
      outside().forEach(el => el.setAttribute("inert", ""));
      if (anim) {
        const tr = b.getBoundingClientRect();
        requestAnimationFrame(() => {
          const fr = img.getBoundingClientRect();
          if (fr.width && tr.width) gsap.fromTo(img, { x: tr.left + tr.width / 2 - (fr.left + fr.width / 2), y: tr.top + tr.height / 2 - (fr.top + fr.height / 2), scale: tr.width / fr.width }, { x: 0, y: 0, scale: 1, duration: .75, ease: E.volet });
        });
      }
      $(".lightbox__close", lb).focus();
    };
    const close = () => {
      lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true"); lockScroll(false);
      outside().forEach(el => el.removeAttribute("inert"));
      if (gsap) gsap.set(img, { clearProps: "transform,opacity" });
      opener && opener.focus();
    };
    $$("[data-lightbox]").forEach(b => b.addEventListener("click", () => open(b)));
    $(".lightbox__close", lb).addEventListener("click", close);
    $(".lightbox__prev", lb).addEventListener("click", () => show(idx - 1, -1));
    $(".lightbox__next", lb).addEventListener("click", () => show(idx + 1, 1));
    lb.addEventListener("click", e => { if (e.target === lb || e.target === stage) close(); });
    addEventListener("keydown", e => {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1, -1);
      if (e.key === "ArrowRight") show(idx + 1, 1);
    });
    let x0 = null, t0 = 0;
    stage.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; t0 = performance.now(); }, { passive: true });
    stage.addEventListener("touchmove", e => { if (x0 === null || !anim) return; const dx = e.touches[0].clientX - x0; gsap.set(img, { x: dx * .6, opacity: 1 - Math.min(.3, Math.abs(dx) / 600) }); }, { passive: true });
    stage.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, v = Math.abs(dx) / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) > 60 || v > .4) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      else if (anim) gsap.to(img, { x: 0, opacity: 1, duration: .4, ease: E.sortie });
      x0 = null;
    });
  }

  /* ── Vérifier une date (page mariage) → page contact pré-remplie ──── */
  $$("[data-datecheck]").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    const p = new URLSearchParams({ type: "mariage" });
    const d = f.elements.date.value, l = f.elements.lieu.value.trim();
    if (d) p.set("date", d); if (l) p.set("lieu", l);
    location.href = f.getAttribute("action") + "?" + p.toString();
  }));

  /* ── Contact : onglets, créneaux de démonstration, récapitulatif ──── */
  const contact = $("#contact-form");
  if (contact) {
    const tablist = $("[role=tablist]", contact.parentElement);
    const tabs = $$("[role=tab]", contact.parentElement);
    const panels = $$("[role=tabpanel]", contact);
    const typeInput = contact.elements.type;
    const select = (name, animate) => {
      tabs.forEach(t => { const on = t.dataset.type === name; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(p => {
        const on = p.dataset.type === name; p.hidden = !on;
        $$("input, select, textarea", p).forEach(el => { el.disabled = !on; });
        if (on && animate && anim) gsap.fromTo([...p.children], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .35, ease: E.sortie, stagger: .03 });
      });
      typeInput.value = name;
      if (tablist) placeTrait(tablist);
    };
    tabs.forEach((t, k) => {
      t.addEventListener("click", () => select(t.dataset.type, true));
      t.addEventListener("keydown", e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const n = tabs[(k + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        n.focus(); select(n.dataset.type, true);
      });
    });
    const q = new URLSearchParams(location.search);
    select(q.get("type") && tabs.some(t => t.dataset.type === q.get("type")) ? q.get("type") : tabs[0].dataset.type, false);
    if (q.get("date") && contact.elements.date_mariage) contact.elements.date_mariage.value = q.get("date");
    if (q.get("lieu") && contact.elements.lieu) contact.elements.lieu.value = q.get("lieu");
    if (q.get("seance")) { const r = $(`input[name=seance][data-id="${q.get("seance")}"]`, contact); if (r) r.checked = true; }

    /* Créneaux : 12 prochains jours ouvrés, trois horaires — données de démonstration */
    const slotsBox = $(".slots", contact);
    if (slotsBox) {
      const hours = ["10 h", "14 h 30", "17 h 30"];
      const fmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
      const d = new Date(); d.setHours(12, 0, 0, 0); let made = 0, k = 0;
      while (made < 12) {
        d.setDate(d.getDate() + 1); k++;
        if (d.getDay() === 0) continue;
        const h = hours[(k + made) % hours.length];
        const b = document.createElement("button");
        b.type = "button"; b.setAttribute("aria-pressed", "false");
        b.dataset.value = `${fmt.format(d)} à ${h}`;
        b.innerHTML = `<small>${fmt.format(d)}</small>${h}`;
        b.addEventListener("click", () => {
          $$("button", slotsBox).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
          contact.elements.creneau.value = b.dataset.value;
        });
        slotsBox.appendChild(b); made++;
      }
    }

    contact.addEventListener("submit", e => {
      e.preventDefault();
      if (!contact.reportValidity()) return;
      const out = $("#contact-confirm");
      const dl = $("dl", out); dl.innerHTML = "";
      const types = { mariage: "Un mariage", portrait: "Une séance portrait", entreprise: "Une entreprise", cadeau: "Offrir une séance" };
      new FormData(contact).forEach((v, k) => {
        if (!v || k === "consent") return;
        if (k === "type") v = types[v] || v;
        const el = contact.elements[k];
        const lf = contact.querySelector(`[data-label-for="${k}"]`);
        const lab = k === "type" ? "Demande" : lf ? lf.textContent : (el && el.labels && el.labels[0] ? el.labels[0].textContent : k);
        const dt = document.createElement("dt"); dt.textContent = lab.replace(/\s*\*$/, "");
        const dd = document.createElement("dd"); dd.textContent = v;
        dl.append(dt, dd);
      });
      const swap = () => {
        contact.hidden = true; if (tablist) tablist.hidden = true;
        out.hidden = false; out.focus();
        if (anim) { gsap.from(out, { opacity: 0, y: 16, duration: .6, ease: E.sortie }); gsap.from($$("dt, dd", out), { opacity: 0, duration: .4, stagger: .03, delay: .2 }); }
      };
      if (anim) gsap.to(contact, { opacity: 0, duration: .25, onComplete: () => { gsap.set(contact, { clearProps: "opacity" }); swap(); } }); else swap();
    });
    const again = $("#contact-again");
    if (again) again.addEventListener("click", () => { $("#contact-confirm").hidden = true; contact.hidden = false; if (tablist) tablist.hidden = false; });
  }

  /* ── Lancement ─────────────────────────────────────────────────────── */
  /* Si la page n'a pas encore de hauteur quand ce script s'exécute, tout ce qui dépend du défilement serait
     coupé. On attend donc une mise en page réelle (1,5 s au plus). */
  const lancer = () => {
    try { planche(); setup(); } catch (err) { console.error(err); }
    start();
    // Les épinglages sont créés dans le désordre (planche avant héros) : on les remet dans l'ordre de la page
    if (ST) { ST.sort(); ST.refresh(); fontsReady.then(() => ST.refresh()); addEventListener("load", () => ST.refresh()); }
    requestHeader();
  };
  const pret = () => document.body.offsetHeight > 0;
  if (pret()) lancer();
  else { let n = 0; const attendre = () => (pret() || ++n > 90 ? lancer() : requestAnimationFrame(attendre)); requestAnimationFrame(attendre); }
})();
