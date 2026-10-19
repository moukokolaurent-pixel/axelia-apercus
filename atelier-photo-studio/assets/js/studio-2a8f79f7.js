/* Proposition « studio » de l'accueil : Anne sur son fond de studio, son nom derrière elle.
   La lumière suit le pointeur (au doigt, elle dérive seule et suit le pouce) ; l'ombre portée d'Anne lui répond sur
   le fond. Un clic sur la scène (une touche au doigt) change le fond.
   Première visite : le retardateur de l'appareil compte trois secondes, le flash part, le studio apparaît.
   site.js pilote l'entrée (window.Studio) ; sans JavaScript, la scène est fixe et tout est visible. */
(() => {
  const hero = document.querySelector("[data-studio]");
  if (!hero) return;
  const $ = (s, r = hero) => r.querySelector(s);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const studio = $(".studio"), anne = $(".studio__anne"), ombre = $(".studio__ombre"), plan = $(".studio__plan"), halo = $(".studio__halo"), lampe = $(".studio__lampe");

  /* ── Les fonds ─────────────────────────────────────────────────────── */
  const FONDS = ["creme", "gris", "noir"];
  const choix = [...hero.querySelectorAll("[data-fond-choix]")];
  const choisir = f => {
    hero.dataset.fond = f;
    choix.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.fondChoix === f)));
    dispatchEvent(new CustomEvent("apm:fond")); // l'en-tête change de couleur avec le fond
  };
  choix.forEach(b => b.addEventListener("click", () => choisir(b.dataset.fondChoix)));
  hero.addEventListener("click", e => {
    if (e.target.closest("a, button, input, select, textarea, label")) return;
    if (String(getSelection ? getSelection() : "").length) return; // sélectionner du texte n'est pas changer de fond
    choisir(FONDS[(FONDS.indexOf(hero.dataset.fond) + 1) % FONDS.length]);
  });

  /* ── La lumière ────────────────────────────────────────────────────── */
  // Repères relatifs au héros, mesurés au chargement et au redimensionnement
  let A = { x: 0, y: 0, w: 1, h: 1 }, W = 1, H = 1;
  const mesurer = () => {
    const r = hero.getBoundingClientRect(), a = anne.getBoundingClientRect();
    W = r.width; H = r.height;
    A = { x: a.left - r.left, y: a.top - r.top, w: a.width || 1, h: a.height || 1 };
  };
  // Au repos : la lumière principale d'un portrait, en haut à gauche du sujet ; au doigt, elle passe au-dessus de sa tête
  const repos = () => ({ x: A.x + A.w * .04, y: A.y + A.h * (fine ? .08 : -.03) });
  const L = { x: 0, y: 0, tx: 0, ty: 0 };
  const borne = (v, a, b) => Math.max(a, Math.min(b, v));
  const poser = () => {
    // L'ombre part à l'opposé de la lumière, d'autant plus loin que la lumière est de côté
    const cx = A.x + A.w * .5, cy = A.y + A.h * .3;
    const sx = borne((cx - L.x) * .24, -A.w * .34, A.w * .34), sy = borne((cy - L.y) * .05, -10, 34);
    const t = `translate3d(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px, 0)`;
    lampe.style.transform = t; halo.style.transform = t;
    ombre.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    // Lumière en face : l'ombre se cache derrière elle ; de côté, elle s'affirme
    plan.style.setProperty("--force", (.2 + .8 * Math.min(1, Math.hypot(sx, sy * 2) / (A.w * .2))).toFixed(2));
  };
  const auRepos = () => { const r = repos(); L.x = L.tx = r.x; L.y = L.ty = r.y; poser(); };
  mesurer(); auRepos();
  if (!fine) lampe.classList.add("is-cache");
  addEventListener("resize", () => { mesurer(); if (reduced) auRepos(); });
  const img = $("img", anne);
  if (img && !img.complete) img.addEventListener("load", () => { mesurer(); if (reduced) auRepos(); }, { once: true });

  if (!reduced) {
    let suivi = false, libreA = 0, temps = 0, visible = true, last = performance.now();
    const viser = (x, y) => { const r = hero.getBoundingClientRect(); L.tx = borne(x - r.left, 0, W); L.ty = borne(y - r.top, 0, H); suivi = true; };
    if (fine) {
      hero.addEventListener("pointermove", e => viser(e.clientX, e.clientY));
      hero.addEventListener("pointerleave", () => { suivi = false; });
    } else {
      // touchmove continue pendant le défilement (passif) : la lumière suit le pouce, puis repart seule
      const doigt = e => { const p = e.touches[0]; if (p) { viser(p.clientX, p.clientY); lampe.classList.remove("is-cache"); } };
      hero.addEventListener("touchstart", doigt, { passive: true });
      hero.addEventListener("touchmove", doigt, { passive: true });
      hero.addEventListener("touchend", () => { suivi = false; libreA = performance.now() + 1800; setTimeout(() => { if (!suivi) lampe.classList.add("is-cache"); }, 700); }, { passive: true });
    }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; last = performance.now(); }).observe(hero);
    const boucle = now => {
      requestAnimationFrame(boucle);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!visible) return;
      temps += dt;
      if (!suivi && now > libreA) {
        const r = repos();
        // Au doigt, personne ne déplace la lumière : elle passe doucement d'un côté à l'autre d'Anne
        const amp = fine ? 0 : 1;
        L.tx = r.x + (Math.sin(temps * .4 - 1.2) + 1) * A.w * .48 * amp;
        L.ty = r.y + Math.sin(temps * .29) * A.h * .05 * amp;
      }
      const k = 1 - Math.exp(-dt * (suivi ? 7 : 2));
      const dx = L.tx - L.x, dy = L.ty - L.y;
      if (Math.abs(dx) + Math.abs(dy) < .15) return;
      L.x += dx * k; L.y += dy * k;
      poser();
    };
    requestAnimationFrame(boucle);
  }

  /* ── Entrée et retardateur (appelés par site.js, qui a GSAP et les courbes) ─ */
  const lettres = [...hero.querySelectorAll(".studio__mot > span")];
  window.Studio = {
    // États de départ, posés juste avant de jouer
    preparer() {
      const g = window.gsap;
      g.set(lettres, { yPercent: 110 });
      g.set([ombre, halo, lampe], { opacity: 0 });
      g.set(img, { opacity: 0 });
      g.set(studio, { "--nuit": 1 });
    },
    // flash : le flash vient de partir, la scène est là, surexposée, et se pose ; sinon la lumière s'allume
    entree({ E, flash }) {
      const g = window.gsap, tl = g.timeline();
      if (flash) {
        tl.set(studio, { "--nuit": 0 }, 0)
          .fromTo(img, { opacity: 1, filter: "brightness(1.7) contrast(.75)" }, { filter: "brightness(1) contrast(1)", duration: 1.8, ease: E.souffle, clearProps: "filter" }, 0)
          .set(halo, { opacity: 1 }, 0);
      } else {
        // d'abord sur Anne, puis sur le fond, comme on allume la lampe pilote avant le fond
        tl.fromTo(img, { opacity: 0, filter: "brightness(.45)" }, { opacity: 1, filter: "brightness(1)", duration: 1.4, ease: E.souffle, clearProps: "filter" }, 0)
          .to(studio, { "--nuit": 0, duration: 1.5, ease: E.souffle }, .2)
          .to(halo, { opacity: 1, duration: 1.6, ease: E.souffle }, .3);
      }
      tl.fromTo(anne, { y: 16 }, { y: 0, duration: 2, ease: E.bain, clearProps: "transform" }, 0)
        .to(ombre, { opacity: 1, duration: 1.2, ease: E.souffle }, flash ? .25 : .7)
        .to(lettres, { yPercent: 0, duration: 1.5, ease: E.bain, stagger: .045, clearProps: "transform" }, flash ? .2 : .45)
        .to(lampe, { opacity: 1, duration: .9, ease: E.souffle }, 1.4);
      return tl;
    },
    // Trois secondes de retardateur (raccourcies), le voyant s'affole à la dernière, puis le flash
    retardateur(el, { E, auFlash, fin }) {
      const g = window.gsap;
      const chiffre = el.querySelector(".retardateur__chiffre"), arc = el.querySelector(".retardateur__arc");
      const led = el.querySelector(".retardateur__led"), eclair = el.querySelector(".retardateur__flash");
      const reste = [...el.children].filter(c => c !== eclair);
      const S = .8, t0 = .2, tf = t0 + 3 * S;
      const tl = g.timeline({ onComplete: fin });
      [3, 2, 1].forEach((n, i) => {
        const t = t0 + i * S;
        tl.call(() => { chiffre.textContent = n; if (n === 1 && led) led.classList.add("is-vite"); }, null, t)
          .fromTo(arc, { strokeDashoffset: 0 }, { strokeDashoffset: -100, duration: S, ease: "none" }, t)
          .fromTo(chiffre, { opacity: .3 }, { opacity: 1, duration: .3, ease: E.papier }, t);
      });
      tl.call(auFlash, null, tf)
        .to(eclair, { opacity: 1, duration: .06, ease: "none" }, tf)
        .set(reste, { opacity: 0 }, tf + .06)
        .set(el, { backgroundColor: "transparent" }, tf + .06)
        .to(eclair, { opacity: 0, duration: 1, ease: E.souffle }, tf + .12);
      return { passer() { if (tl.time() < tf) tl.seek(tf - .001); } };
    }
  };
})();
