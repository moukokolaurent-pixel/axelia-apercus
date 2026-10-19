/* Révélateur : la photo monte comme un tirage dans le bac de la chambre noire (WebGL, sans bibliothèque).
   Les ombres apparaissent d'abord (la lumière, sur papier noir), le noir et blanc précède la couleur, le bain ondule puis se calme.
   À progression 1, le rendu est identique à l'image d'origine : passer du canvas à l'<img> ne se voit pas.
   Tout échec (pas de WebGL, image refusée, contexte perdu) laisse l'<img> en place. */
(() => {
  const VERT = "attribute vec2 position;varying vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}";
  const FRAG = `precision mediump float;
uniform sampler2D tMap;uniform vec2 uRes,uImg,uMouse;uniform float uProgress,uTime,uVel,uHover,uLiquid,uNeg;uniform vec3 uPaper;varying vec2 vUv;
vec2 cover(vec2 uv){float rs=uRes.x/uRes.y,ri=uImg.x/uImg.y;vec2 s=rs>ri?vec2(1.,ri/rs):vec2(rs/ri,1.);return (uv-.5)*s+.5;}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=vUv;float p=uProgress;
  float calme=1.-smoothstep(0.,.85,p);
  uv+=uLiquid*calme*vec2(sin(uv.y*16.+uTime*1.4),cos(uv.x*12.+uTime*1.1));
  uv.y+=uVel*.03*sin(uv.x*3.14159);
  uv.x+=uVel*.006*sin(uv.y*6.2832+uTime);
  vec2 asp=vec2(uRes.x/uRes.y,1.);vec2 d=(uv-uMouse)*asp;float r=length(d);
  uv+=(d/max(r,1e-4))/asp*sin(r*38.-uTime*5.)*exp(-r*7.)*.0035*uHover;
  vec3 c=texture2D(tMap,cover(uv)).rgb;
  float L=dot(c,vec3(.299,.587,.114));float t=p*1.35;
  float a=smoothstep(1.-t,1.35-t,mix(1.-L,L,uNeg));
  vec3 dev=mix(vec3(L),c,smoothstep(.55,1.,p));
  dev=(dev-.5)*mix(.75,1.,p)+.5;
  vec3 col=mix(uPaper,dev,a);
  col+=(hash(vUv*uRes+fract(uTime))-.5)*.05*calme;
  gl_FragColor=vec4(col,1.);
}`;
  const PAPIERS = { blanc: [251 / 255, 250 / 255, 247 / 255], noir: [17 / 255, 16 / 255, 16 / 255] };
  const coarse = matchMedia("(pointer: coarse)").matches;
  let supported = null;

  function ok() {
    if (supported !== null) return supported;
    supported = false;
    try {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      if (location.protocol === "file:") return false;
      const c = navigator.connection;
      if (c && c.saveData) return false;
      if (coarse && (navigator.hardwareConcurrency || 4) < 4) return false;
      const gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return false;
      const f = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
      supported = !!(f && f.precision > 0);
      const lose = gl.getExtension("WEBGL_lose_context");
      lose && lose.loseContext();
    } catch (e) { supported = false; }
    return supported;
  }

  function shader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  /* el : conteneur positionné qui contient l'<img> ; options : papier, liquide, interactif, vitesse() */
  async function create(el, opts = {}) {
    if (!ok()) return null;
    const img = el.querySelector("img");
    if (!img) return null;
    try { if (img.decode) await img.decode(); } catch (e) { if (!img.complete || !img.naturalWidth) return null; }
    const canvas = document.createElement("canvas");
    canvas.className = "gl-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, premultipliedAlpha: false, powerPreference: "high-performance" });
    if (!gl) return null;
    let prog, tex;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); // lève une erreur si l'image est refusée
    } catch (e) { return null; }

    const U = {};
    ["tMap", "uRes", "uImg", "uMouse", "uProgress", "uTime", "uVel", "uHover", "uLiquid", "uPaper", "uNeg"].forEach(n => { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.tMap, 0);
    gl.uniform2f(U.uImg, img.naturalWidth, img.naturalHeight);
    gl.uniform3fv(U.uPaper, PAPIERS[opts.papier] || PAPIERS.blanc);
    // Sur papier noir (projection), la lumière apparaît d'abord ; sur papier blanc, les ombres
    gl.uniform1f(U.uNeg, opts.papier === "noir" ? 1 : 0);
    gl.uniform1f(U.uLiquid, opts.liquide || .006);

    const st = { p: 0, time: 0, vel: 0, hover: 0, hoverTarget: 0, mx: .5, my: .5, visible: true, lost: false, dirty: true, anim: false };
    // Au doigt aussi : le bain ondule avec la vitesse du défilement et sous le pouce
    const interactive = opts.interactif !== false;
    const dprMax = coarse ? 1.5 : 2;

    const resize = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); gl.uniform2f(U.uRes, w, h); st.dirty = true; }
    };
    const draw = () => {
      if (st.lost) return;
      gl.uniform1f(U.uProgress, st.p);
      gl.uniform1f(U.uTime, st.time);
      gl.uniform1f(U.uVel, st.vel);
      gl.uniform1f(U.uHover, st.hover);
      gl.uniform2f(U.uMouse, st.mx, st.my);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    el.appendChild(canvas);
    resize();
    draw();
    el.classList.add("gl-pret");

    let last = performance.now();
    const tick = () => {
      if (!st.visible || st.lost) return;
      const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
      const target = interactive && opts.vitesse ? Math.max(-1, Math.min(1, opts.vitesse() / 30)) : 0;
      st.vel += (target - st.vel) * (1 - Math.exp(-dt * 6));
      st.hover += (st.hoverTarget - st.hover) * (1 - Math.exp(-dt * 5));
      const busy = st.anim || st.p < 1 || st.hover > .001 || Math.abs(st.vel) > .0005 || st.dirty;
      if (!busy) return;
      st.time += dt;
      st.dirty = false;
      draw();
    };
    const ticker = window.gsap ? window.gsap.ticker : null;
    let raf = 0;
    const loop = () => { tick(); raf = requestAnimationFrame(loop); };
    if (ticker) ticker.add(tick); else raf = requestAnimationFrame(loop);

    const ro = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    ro && ro.observe(el);
    const io = new IntersectionObserver(es => { st.visible = es[0].isIntersecting; if (st.visible) { last = performance.now(); st.dirty = true; } }, { rootMargin: "20% 0px" });
    io.observe(el);

    const zone = opts.zone || el;
    const vise = (x, y) => { const r = el.getBoundingClientRect(); st.mx = (x - r.left) / r.width; st.my = 1 - (y - r.top) / r.height; st.hoverTarget = 1; };
    if (interactive && !coarse) {
      zone.addEventListener("pointermove", e => vise(e.clientX, e.clientY));
      zone.addEventListener("pointerleave", () => { st.hoverTarget = 0; });
    } else if (interactive) {
      // touchmove continue pendant le défilement (passif), contrairement à pointermove
      const doigt = e => { const t = e.touches[0]; if (t) vise(t.clientX, t.clientY); };
      zone.addEventListener("touchstart", doigt, { passive: true });
      zone.addEventListener("touchmove", doigt, { passive: true });
      zone.addEventListener("touchend", () => { st.hoverTarget = 0; }, { passive: true });
    }
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); st.lost = true; el.classList.remove("gl-pret"); });

    const api = {
      el,
      get progress() { return st.p; },
      setProgress(v) { st.p = Math.max(0, Math.min(1, v)); st.dirty = true; },
      develop(duration = 2.4, delay = 0, ease = "power2.out") {
        return new Promise(resolve => {
          if (!window.gsap) { st.p = 1; st.dirty = true; return resolve(); }
          st.anim = true;
          window.gsap.to(st, { p: 1, duration, delay, ease, onUpdate: () => { st.dirty = true; }, onComplete: () => { st.anim = false; resolve(); } });
        });
      },
      destroy() {
        ticker ? ticker.remove(tick) : cancelAnimationFrame(raf);
        ro && ro.disconnect(); io.disconnect();
        el.classList.remove("gl-pret"); canvas.remove();
        const lose = gl.getExtension("WEBGL_lose_context"); lose && lose.loseContext();
      }
    };
    return api;
  }

  window.Revelateur = { ok, create };
})();
