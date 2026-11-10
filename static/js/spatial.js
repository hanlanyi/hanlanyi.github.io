// Spatial wall: every video and post laid out in depth.
// Mono: pointer moves the camera for parallax.
// Stereo: the scene is drawn twice, once per eye, as a side-by-side image for
// AR glasses in SBS 3D mode (e.g. 3840x1080, each half feeding one eye).
(async () => {
  const view = document.querySelector('[data-spatial-view]');
  if (!view) return;
  const stereoBtn = document.querySelector('[data-spatial-stereo]');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let items = [];
  try { items = (await (await fetch('/index.json')).json()).filter((i) => i.k === 'video' || i.k === 'post'); } catch {}
  if (!items.length) { view.textContent = 'Could not load the wall.'; return; }

  const state = {
    index: 0,
    stereo: false,
    eyeSep: Number(sessionStorage.getItem('eyeSep')) || 14, // half the camera separation, px
    look: { x: 0, y: 0 },
  };
  const SPACING = 300;
  let eyes = [];

  const cardHtml = (it) => `
    ${it.img ? `<img src="${it.img}" alt="">` : `<div class="s-text">${esc(it.e || '')}</div>`}
    <p class="s-kind">${it.k} · ${it.d}</p>
    <p class="s-title">${esc(it.t)}</p>`;

  function build() {
    view.querySelectorAll('.eye, .s-exit').forEach((n) => n.remove());
    view.classList.toggle('is-stereo', state.stereo);
    eyes = (state.stereo ? [-1, 1] : [0]).map((side) => {
      const eye = document.createElement('div');
      eye.className = 'eye';
      eye.innerHTML = '<div class="eye-shift"><div class="eye-persp"><div class="eye-scene"><div class="s-grid"></div></div></div></div>';
      const scene = eye.querySelector('.eye-scene');
      const cards = items.map((it) => {
        const c = document.createElement('div');
        c.className = 's-card';
        c.innerHTML = cardHtml(it);
        scene.append(c);
        return c;
      });
      view.append(eye);
      return { side, shift: eye.querySelector('.eye-shift'), scene, cards };
    });
    if (state.stereo) {
      const hint = document.createElement('p');
      hint.className = 's-exit';
      hint.textContent = 'S or Esc to leave 3D';
      view.append(hint);
    }
    if (!state.stereo) {
      eyes[0].cards.forEach((c, i) => c.addEventListener('click', () => (i === state.index ? open() : move(i - state.index))));
    }
    paint();
  }

  function paint() {
    const e = state.stereo ? state.eyeSep : 0;
    for (const eye of eyes) {
      // Off-axis stereo: slide the camera sideways (scene moves the other way),
      // then slide the finished image back so depth 0 lands on the screen plane.
      const cam = -eye.side * e;
      eye.shift.style.transform = `translateX(${-cam}px)`;
      eye.scene.style.transform = `translate3d(${cam - state.look.x}px, ${-state.look.y}px, 0)`;
      eye.cards.forEach((card, i) => {
        const off = i - state.index, far = Math.abs(off);
        const x = off * SPACING + Math.sign(off) * 40;
        const z = far === 0 ? 140 : -160 - far * 150;
        card.style.transform = `translate3d(${x}px, 0, ${z}px) rotateY(${Math.max(-1, Math.min(1, off)) * -22}deg)`;
        card.style.opacity = far > 4 ? 0 : 1 - far * 0.14;
        card.style.zIndex = 100 - far;
        card.classList.toggle('is-on', far === 0);
      });
    }
    view.setAttribute('aria-label', `Spatial wall. Selected: ${items[state.index].k}, ${items[state.index].t}`);
  }

  const move = (d) => { state.index = Math.max(0, Math.min(items.length - 1, state.index + d)); paint(); };
  const open = () => { location.href = items[state.index].u; };
  function setStereo(on) {
    state.stereo = on;
    state.look = { x: 0, y: 0 };
    stereoBtn.setAttribute('aria-pressed', String(on));
    build();
    if (on) { view.focus(); document.documentElement.requestFullscreen?.().catch(() => {}); }
    else if (document.fullscreenElement) document.exitFullscreen?.();
  }

  document.querySelector('[data-spatial-prev]').addEventListener('click', () => move(-1));
  document.querySelector('[data-spatial-next]').addEventListener('click', () => move(1));
  stereoBtn.addEventListener('click', () => setStereo(!state.stereo));
  view.addEventListener('pointermove', (ev) => {
    if (state.stereo || ev.pointerType !== 'mouse') return;
    const r = view.getBoundingClientRect();
    state.look = { x: ((ev.clientX - r.left) / r.width - 0.5) * 120, y: ((ev.clientY - r.top) / r.height - 0.5) * 50 };
    paint();
  });
  let touchX = null;
  view.addEventListener('touchstart', (ev) => { touchX = ev.touches[0].clientX; }, { passive: true });
  view.addEventListener('touchend', (ev) => {
    if (touchX === null) return;
    const dx = ev.changedTouches[0].clientX - touchX; touchX = null;
    if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
  });
  document.addEventListener('keydown', (ev) => {
    if (/^(INPUT|TEXTAREA)$/.test(ev.target.tagName) || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const k = ev.key;
    if (k === 'ArrowRight' || k === 'd') { ev.preventDefault(); move(1); }
    else if (k === 'ArrowLeft' || k === 'a') { ev.preventDefault(); move(-1); }
    else if (k === 'Enter' && (state.stereo || ev.target === view)) open();
    else if (k === 's' || k === 'S') setStereo(!state.stereo);
    else if (k === 'Escape' && state.stereo) setStereo(false);
    else if (k === '[' || k === ']') {
      state.eyeSep = Math.max(0, Math.min(40, state.eyeSep + (k === ']' ? 2 : -2)));
      sessionStorage.setItem('eyeSep', state.eyeSep);
      paint();
    }
  });

  if (/[?&]stereo=1/.test(location.search)) setStereo(true); else build();
})();
