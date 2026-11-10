// About page: a small dotted globe that flies the route between the places lived in.
(() => {
  const el = document.querySelector('[data-globe]');
  if (!el) return;
  const stops = JSON.parse(el.querySelector('script[type="application/json"]').textContent);
  const canvas = el.querySelector('canvas'), ctx = canvas.getContext('2d');
  const $ = (s) => el.querySelector(s);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAD = Math.PI / 180;
  const LEG_SECONDS = 2.4;

  const vec = (lon, lat) => [Math.cos(lat * RAD) * Math.cos(lon * RAD), Math.cos(lat * RAD) * Math.sin(lon * RAD), Math.sin(lat * RAD)];
  const lonLat = ([x, y, z]) => [Math.atan2(y, x) / RAD, Math.asin(Math.max(-1, Math.min(1, z))) / RAD];
  const slerp = (a, b, t) => {
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const w = Math.acos(dot);
    if (w < 1e-6) return a;
    const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
    return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  };
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const points = stops.map((s) => vec(s.lon, s.lat));

  let land = [];
  fetch('/data/land.json').then((r) => r.json()).then((d) => { for (let i = 0; i < d.length; i += 2) land.push(vec(d[i], d[i + 1])); }).catch(() => {});

  let progress = 0, target = 0;            // position along the route, in stops
  let drag = [0, 0], dragging = false, lastX = 0, lastY = 0, lastTime = 0, clock = 0;

  const here = (p) => { // unit vector at route position p
    const k = Math.min(stops.length - 2, Math.floor(p));
    return slerp(points[k], points[k + 1], ease(p - k));
  };

  function draw() {
    const w = canvas.width, h = canvas.height, R = Math.min(w, h) * 0.46, cx = w / 2, cy = h / 2;
    const d = w / canvas.clientWidth || 1;
    const [lon0, lat0] = lonLat(here(progress));
    const cl = (lon0 + drag[0]) * RAD, cp = Math.max(-80, Math.min(80, lat0 * 0.9 + drag[1])) * RAD;
    const sinP = Math.sin(cp), cosP = Math.cos(cp);
    // rotate so (cl, cp) faces the viewer; returns [x right, y up, z toward viewer]
    const project = ([x, y, z]) => {
      const x1 = x * Math.cos(cl) + y * Math.sin(cl), y1 = -x * Math.sin(cl) + y * Math.cos(cl);
      return [y1, z * cosP - x1 * sinP, z * sinP + x1 * cosP];
    };
    ctx.clearRect(0, 0, w, h);

    const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    ocean.addColorStop(0, '#3fb0f5'); ocean.addColorStop(0.6, '#1b95e8'); ocean.addColorStop(1, '#0c5c9c');
    ctx.fillStyle = ocean;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#e1edfb';
    const dot = R * 0.011;
    for (const v of land) {
      const p = project(v);
      if (p[2] <= 0.02) continue;
      const s = dot * (0.45 + 0.55 * p[2]);
      ctx.globalAlpha = 0.35 + 0.65 * p[2];
      ctx.fillRect(cx + p[0] * R - s, cy - p[1] * R - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;

    // route travelled so far, as great-circle arcs
    ctx.lineWidth = 2 * d; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
    for (let k = 0; k < stops.length - 1 && k < progress; k++) {
      const upTo = Math.min(1, progress - k), n = 64;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const t = (i / n);
        if (t > ease(upTo) + 1e-9) break;
        const p = project(slerp(points[k], points[k + 1], t));
        if (p[2] <= 0) { pen = false; continue; }
        const X = cx + p[0] * R, Y = cy - p[1] * R;
        pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        pen = true;
      }
      ctx.stroke();
    }

    // stops
    ctx.font = `${11 * d}px ui-monospace, Consolas, monospace`; ctx.textBaseline = 'middle';
    stops.forEach((s, i) => {
      const p = project(points[i]);
      if (p[2] <= 0) return;
      const X = cx + p[0] * R, Y = cy - p[1] * R, reached = progress >= i - 1e-6;
      ctx.beginPath(); ctx.arc(X, Y, (reached ? 4 : 3) * d, 0, Math.PI * 2);
      if (reached) { ctx.fillStyle = '#fff'; ctx.fill(); } else { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5 * d; ctx.stroke(); }
      if (i === Math.round(progress) && Math.abs(progress - i) < 0.02) {
        const pulse = calm ? 0.5 : (clock % 1.6) / 1.6;
        ctx.beginPath(); ctx.arc(X, Y, (5 + pulse * 10) * d, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`; ctx.lineWidth = 1.5 * d; ctx.stroke();
      }
      if (reached) {
        ctx.lineWidth = 3 * d; ctx.strokeStyle = '#0c5c9c'; ctx.strokeText(s.city, X + 9 * d, Y);
        ctx.fillStyle = '#fff'; ctx.fillText(s.city, X + 9 * d, Y);
      }
    });
  }

  function sync() {
    const i = target, s = stops[i];
    $('[data-globe-count]').textContent = `${i + 1} / ${stops.length}`;
    $('[data-globe-city]').textContent = s.city;
    $('[data-globe-sub]').textContent = `${s.local} · ${s.country}`;
    $('[data-globe-prev]').disabled = i === 0;
    $('[data-globe-next]').disabled = i === stops.length - 1;
    el.querySelectorAll('[data-globe-stop]').forEach((b, k) => b.setAttribute('aria-current', k === i ? 'step' : 'false'));
  }
  function go(i) {
    target = Math.max(0, Math.min(stops.length - 1, i));
    if (calm) progress = target;
    sync();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0); lastTime = now; clock += dt;
    if (progress !== target) {
      const far = Math.abs(target - progress);
      const step = (dt / LEG_SECONDS) * Math.max(1, far); // hurry when several stops away
      progress = far <= step ? target : progress + Math.sign(target - progress) * step;
      drag = drag.map((v) => v * 0.9);
    }
    draw();
    requestAnimationFrame(frame);
  }
  function resize() {
    const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  }

  $('[data-globe-prev]').addEventListener('click', () => go(target - 1));
  $('[data-globe-next]').addEventListener('click', () => go(target + 1));
  el.querySelectorAll('[data-globe-stop]').forEach((b, k) => b.addEventListener('click', () => go(k)));
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    drag = [drag[0] - (e.clientX - lastX) * 0.4, drag[1] + (e.clientY - lastY) * 0.4];
    lastX = e.clientX; lastY = e.clientY;
  });
  ['pointerup', 'pointercancel'].forEach((ev) => canvas.addEventListener(ev, () => { dragging = false; }));

  new ResizeObserver(resize).observe(canvas);
  resize(); sync();
  requestAnimationFrame(frame);
})();
