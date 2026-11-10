// AAA demo: three tabs, one per agent, drawn with CSS 3D boxes.
// Everything here is scripted; no model runs in the browser.
(() => {
  const root = document.querySelector('[data-demo]');
  if (!root) return;
  const data = JSON.parse(document.getElementById('aaa-data').textContent);
  const $ = (s) => root.querySelector(s);
  const stage = $('.demo-stage'), world = $('[data-world]'), trace = $('[data-demo-trace]');
  const titleEl = $('[data-demo-title]'), subEl = $('[data-demo-sub]'), promptsEl = $('[data-demo-prompts]');
  const form = $('[data-demo-form]'), input = $('#demo-in'), fineEl = $('[data-demo-fine]');
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const U = 20; // px per world unit before scaling
  // Agent colours match the ones serialized in the Unity scene (Atto blue, Acco green, Anno red).
  const COLOR = { atto: '#0066ff', acco: '#33cc33', anno: '#e63333', cube: '#111', wood: '#4a5148', floor: '#10140f' };
  // The spawned cube prefab is a Rubik's cube: one sticker colour per face.
  const RUBIK = ['#1faa4b', '#1a5fd6', '#d22b2b', '#f08a1c', '#f4f4f0', '#f2d21f']; // front, back, right, left, top, bottom
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const wait = (ms) => new Promise((r) => setTimeout(r, calm ? 0 : ms));
  const f2 = (n) => n.toFixed(2);

  /* ---------- tiny 3D scene ---------- */
  let actors = [], tweens = [], centre = [0, 0, 0], extent = 12;
  let yaw = -0.6, pitch = 0.45, sway = true, dragging = false, lastX = 0, lastY = 0, clock = 0, lastTime = 0;

  function box(w, h, d, color, cls = '') {
    const b = document.createElement('div');
    b.className = `bx ${cls}`;
    b.style.setProperty('--c', color);
    let n = 0;
    const face = (fw, fh, tr, shade) => {
      const e = document.createElement('i');
      e.style.cssText = `width:${fw * U}px;height:${fh * U}px;margin:${-fh * U / 2}px 0 0 ${-fw * U / 2}px;transform:${tr};--s:${shade}%;--f:${RUBIK[n++]}`;
      b.append(e);
    };
    face(w, h, `translateZ(${d * U / 2}px)`, 78);
    face(w, h, `rotateY(180deg) translateZ(${d * U / 2}px)`, 52);
    face(d, h, `rotateY(90deg) translateZ(${w * U / 2}px)`, 62);
    face(d, h, `rotateY(-90deg) translateZ(${w * U / 2}px)`, 68);
    face(w, d, `rotateX(90deg) translateZ(${h * U / 2}px)`, 100);
    face(w, d, `rotateX(-90deg) translateZ(${h * U / 2}px)`, 36);
    world.append(b);
    return b;
  }
  function actor(size, color, p, opts = {}) {
    const [w, h, d] = Array.isArray(size) ? size : [size, size, size];
    const a = { el: box(w, h, d, color, opts.cls), p: p.slice(), s: opts.s ?? 1, hover: !!opts.hover, phase: actors.length * 1.7 };
    actors.push(a);
    return a;
  }
  function tween(a, prop, to, seconds) {
    return new Promise((res) => tweens.push({ a, prop, from: prop === 'p' ? a.p.slice() : a.s, to, t: 0, dur: calm ? 0.001 : seconds, res }));
  }
  function reset() { world.textContent = ''; actors = []; tweens = []; }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0); lastTime = now; clock += dt;
    for (const tw of tweens) {
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = ease(tw.t);
      if (tw.prop === 'p') tw.a.p = tw.from.map((v, i) => v + (tw.to[i] - v) * k);
      else tw.a.s = tw.from + (tw.to - tw.from) * k;
      if (tw.t === 1) tw.res();
    }
    tweens = tweens.filter((tw) => tw.t < 1);
    if (scene.tick) scene.tick();
    for (const a of actors) {
      const bob = a.hover && !calm ? Math.sin(clock * 1.6 + a.phase) * 0.12 : 0;
      a.el.style.transform = `translate3d(${(a.p[0] - centre[0]) * U}px,${-(a.p[1] + bob - centre[1]) * U}px,${(a.p[2] - centre[2]) * U}px) scale3d(${a.s},${a.s},${a.s})`;
    }
    const r = stage.getBoundingClientRect();
    const scale = Math.min(r.width, r.height) / (extent * U);
    const y = yaw + (sway && !calm ? Math.sin(clock * 0.25) * 0.35 : 0);
    world.style.transform = `scale(${scale}) rotateX(${-pitch}rad) rotateY(${y}rad)`;
    requestAnimationFrame(frame);
  }

  /* ---------- trace ---------- */
  let runId = 0, lines = [];
  const show = () => { trace.textContent = lines.join('\n'); trace.scrollTop = trace.scrollHeight; };
  const say = (...l) => { lines.push(...l); show(); };
  async function typeOut(prefix, text, id) {
    lines.push(prefix); const at = lines.length - 1;
    for (let i = 0; i <= text.length; i += 2) {
      if (id !== runId) return;
      lines[at] = prefix + text.slice(0, i + 2); show();
      await wait(14);
    }
    lines[at] = prefix + text; show();
  }

  /* ---------- Atto: answers ---------- */
  const atto = {
    title: 'Ask Atto about Lanyi',
    sub: 'Atto is the orchestrator. Every request starts here, and what Atto finally answers is what you see.',
    fine: 'These answers are a fixed script. On the headset Atto reasons with a local LLM.',
    idle: 'Atto is listening. Pick a question.',
    prompts: () => data.qa.map((x) => x.q),
    build() {
      extent = 11; centre = [0, 2.6, 0]; yaw = -0.6; pitch = 0.4;
      actor([14, 0.1, 14], COLOR.floor, [0, 0, 0], { cls: 'is-floor' });
      this.body = actor(3, COLOR.atto, [0, 3.2, 0], { hover: true });
    },
    async run(text, id) {
      const item = data.qa.find((x) => x.q === text);
      say(`User: ${text}`, '');
      tween(this.body, 's', 1.15, 0.3);
      await wait(450); if (id !== runId) return;
      say(`Thought: ${item.thought}`);
      await wait(600); if (id !== runId) return;
      await typeOut('FinalAnswer: ', item.a, id);
      if (id === runId) tween(this.body, 's', 1, 0.3);
    },
  };

  /* ---------- Acco: builds in a room it understands ---------- */
  // Room coordinates are metres; 1 world unit = 10 cm.
  const M = 10, EDGE = 0.2;
  const TABLE = { x: 0.6, z: 0, top: 0.74 }, CHAIR = { x: -0.75, z: 0.1, seat: 0.46 };
  const HOME = { atto: [-1.45, 1.45, -1.2], acco: [-1.45, 1.45, -0.75] };
  const m = (p) => p.map((v) => v * M);
  const acco = {
    title: 'Ask Acco to build',
    sub: 'Acco is the executor. It knows the room (a table, a chair, everything already spawned), so each cube lands where the words say.',
    fine: 'Scripted, with the real tool name and result format. On the headset the room comes from Meta’s scene understanding.',
    idle: 'Scene: TABLE, CHAIR, 0 cubes. Pick a request.',
    prompts: () => ['Put a cube on the table', 'Put a cube on the chair', 'Put a cube under the table', 'Stack another one on top', 'Clear the scene'],
    build() {
      extent = 36; centre = [0, 4.5, 0]; yaw = -0.75; pitch = 0.5;
      this.cubes = []; this.cubeActors = [];
      actor([34, 0.1, 30], COLOR.floor, [0, -0.05, 0], { cls: 'is-floor' });
      // table: 1.2 x 0.7 m top, 0.74 m high
      actor([12, 0.4, 7], COLOR.wood, m([TABLE.x, TABLE.top - 0.02, TABLE.z]));
      for (const [dx, dz] of [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]]) actor([0.5, 7, 0.5], COLOR.wood, m([TABLE.x + dx, 0.35, TABLE.z + dz]));
      // chair: seat 0.42 m square at 0.46 m, back on the far side from the table
      actor([4.2, 0.4, 4.2], COLOR.wood, m([CHAIR.x, CHAIR.seat - 0.02, CHAIR.z]));
      actor([0.4, 4.6, 4.2], COLOR.wood, m([CHAIR.x - 0.19, CHAIR.seat + 0.23, CHAIR.z]));
      for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) actor([0.4, 4.2, 0.4], COLOR.wood, m([CHAIR.x + dx, 0.21, CHAIR.z + dz]));
      this.atto = actor(2.2, COLOR.atto, m(HOME.atto), { hover: true });
      this.body = actor(2.2, COLOR.acco, m(HOME.acco), { hover: true });
    },
    // Decide where the cube goes: the "scene understanding" step.
    place(text) {
      const on = (where) => this.cubes.filter((c) => c.where === where);
      if (/table/i.test(text) && /under/i.test(text)) {
        const n = on('under').length;
        if (n >= 2) return { fail: 'There is no room left under the table.' };
        return { where: 'under', pos: [TABLE.x - 0.15 + n * 0.3, EDGE / 2, TABLE.z], why: `Under the table means on the floor, inside the table's footprint. The floor is y = 0, so the cube's centre sits at y = ${f2(EDGE / 2)}.`, done: 'There is a cube under the table.' };
      }
      if (/table/i.test(text)) {
        const n = on('table').length;
        if (n >= 3) return { fail: 'The table is full. Try stacking, or clear the scene.' };
        const x = TABLE.x + [0, -0.3, 0.3][n];
        return { where: 'table', pos: [x, TABLE.top + EDGE / 2, TABLE.z], why: `On the table means resting on its top at y = ${f2(TABLE.top)}. The cube edge is ${f2(EDGE)}, so its centre sits at y = ${f2(TABLE.top)} + ${f2(EDGE / 2)} = ${f2(TABLE.top + EDGE / 2)}.${n ? ' That spot is taken, so I move along the table.' : ''}`, done: 'There is a cube on the table.' };
      }
      if (/chair/i.test(text)) {
        if (on('chair').length) return { fail: 'The chair seat already holds a cube.' };
        return { where: 'chair', pos: [CHAIR.x, CHAIR.seat + EDGE / 2, CHAIR.z], why: `On the chair means on the seat at y = ${f2(CHAIR.seat)}, not the backrest. Centre at y = ${f2(CHAIR.seat + EDGE / 2)}.`, done: 'There is a cube on the chair.' };
      }
      const last = this.cubes[this.cubes.length - 1];
      if (!last) return { fail: 'There is nothing to stack on yet. Ask me for a cube first.' };
      if (last.pos[1] > 1.3) return { fail: 'That stack is tall enough.' };
      return { where: last.where + '+', pos: [last.pos[0], last.pos[1] + EDGE, last.pos[2]], why: `"On top" refers to the last cube I spawned, at (${last.pos.map(f2).join(', ')}). One cube edge higher is y = ${f2(last.pos[1] + EDGE)}.`, done: 'Stacked.' };
    },
    async run(text, id) {
      say(`User: ${text}`, '');
      if (/clear/i.test(text)) {
        this.cubeActors.forEach((a) => a.el.remove());
        actors = actors.filter((a) => !this.cubeActors.includes(a));
        this.cubes = []; this.cubeActors = [];
        say('[Atto] FinalAnswer: Scene cleared. TABLE and CHAIR remain.');
        return;
      }
      await wait(400); if (id !== runId) return;
      say("[Atto] Thought: Building is Acco's job.", `[Atto] Action: delegate_to_executor(task=${text.toLowerCase()})`, '');
      await wait(700); if (id !== runId) return;
      say(`[Acco] Scene: TABLE top y=${f2(TABLE.top)} at (${f2(TABLE.x)}, ${f2(TABLE.z)}) · CHAIR seat y=${f2(CHAIR.seat)} at (${f2(CHAIR.x)}, ${f2(CHAIR.z)}) · cubes: ${this.cubes.length}`);
      const plan = this.place(text);
      await wait(700); if (id !== runId) return;
      if (plan.fail) {
        say(`[Acco] Thought: ${plan.fail}`, '', `[Atto] Observation: Acco did not spawn anything.`, `[Atto] FinalAnswer: ${plan.fail}`);
        return;
      }
      say(`[Acco] Thought: ${plan.why}`);
      await wait(900); if (id !== runId) return;
      const [x, y, z] = plan.pos;
      say(`[Acco] Action: spawn_cube(x=${f2(x)}, y=${f2(y)}, z=${f2(z)})`);
      const above = [x, y + 0.45, z];
      await tween(this.body, 'p', m(above), 1.1); if (id !== runId) return;
      const cube = actor(EDGE * M, COLOR.cube, m(above), { s: 0.01, cls: 'is-rubik' });
      this.cubeActors.push(cube); this.cubes.push({ where: plan.where, pos: plan.pos });
      tween(cube, 's', 1, 0.35);
      await tween(cube, 'p', m(plan.pos), 0.5); if (id !== runId) return;
      say(`[Acco] Observation: spawncube::${+f2(x)}::${+f2(y)}::${+f2(z)}`, '');
      await tween(this.body, 'p', m(HOME.acco), 1); if (id !== runId) return;
      say(`[Atto] Observation: Acco spawned a cube at (${f2(x)}, ${f2(y)}, ${f2(z)}).`, `[Atto] FinalAnswer: Done. ${plan.done}`);
    },
  };

  /* ---------- Anno: changes shape ---------- */
  const order = (cells) => cells.map((c) => c.slice()).sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
  const WORDS = { stairs: /stair|step/, pyramid: /pyramid/, pillar: /pillar|column|tower/, plane: /plane|flat|wall|floor|sheet/, cube: /cube|box|block/ };
  const anno = {
    title: 'Tell Atto to reshape Anno',
    sub: 'Anno is the shape-shifter: a body of 27 small cubes. These are the same five presets the headset loads from anno_shapes.json.',
    fine: 'The trace is scripted to show the shape of one turn. On the headset the same steps come from a local LLM.',
    idle: 'Anno is a cube. Pick a shape or type a request.',
    freeText: true,
    prompts: () => Object.keys(data.shapes),
    build() {
      extent = 12.5; centre = [0, 0, 0]; yaw = -0.65; pitch = 0.42;
      this.shape = 'cube';
      this.pieces = order(data.shapes.cube).map((p) => actor(1, COLOR.anno, p));
      this.spawned = null;
    },
    tick() { // keep the body centred while it changes
      for (let j = 0; j < 3; j++) {
        const v = this.pieces.map((a) => a.p[j]);
        centre[j] = (Math.min(...v) + Math.max(...v)) / 2;
      }
    },
    async morph(name) {
      const target = order(data.shapes[name]);
      this.shape = name;
      this.pieces.forEach((a) => tween(a, 's', 0.9, 0.3));
      await Promise.all(this.pieces.map((a, i) => tween(a, 'p', target[i], 1.4)));
      // idle cube is one merged body; the pieces only show while shaped
      if (this.shape === 'cube') this.pieces.forEach((a) => tween(a, 's', 1, 0.3));
    },
    plan(text) {
      const steps = [];
      for (const part of text.toLowerCase().split(/\bthen\b|\band\b|[,;.]/).map((s) => s.trim()).filter(Boolean)) {
        const aboutAnno = /anno|turn|into|become|morph|transform|shape/.test(part);
        if (/\bhome\b|go back|come back|return/.test(part)) { steps.push({ tool: 'anno_go_home', args: '', why: 'Anno should reset and return home.', obs: 'Anno reset to a cube and flew home.', run: () => this.morph('cube') }); continue; }
        const found = Object.keys(WORDS).find((n) => WORDS[n].test(part));
        if (found && (aboutAnno || found !== 'cube')) {
          steps.push({ tool: 'transform_anno', args: `shape=${found}`, why: `Anno should become ${found === 'stairs' ? 'stairs' : 'a ' + found}.`, obs: `Anno flew to its work spot and morphed into ${found}.`, run: () => this.morph(found) });
        } else if (found === 'cube' || /spawn|put|place|create|build|give me/.test(part)) {
          steps.push({ tool: 'delegate_to_executor', args: 'task=spawn a cube', why: "Building is Acco's job.", obs: 'Acco flew to the target and called spawn_cube. A cube now exists.', run: () => {
            if (!this.spawned) this.spawned = actor(1.5, COLOR.cube, [-5.5, 5, 1.5], { s: 0.01, cls: 'is-rubik' });
            tween(this.spawned, 's', 1, 0.3); tween(this.spawned, 'p', [-5.5, -0.75, 1.5], 0.7);
          } });
        }
      }
      return steps;
    },
    async run(text, id) {
      if (data.shapes[text]) text = text === 'cube' ? 'turn Anno back into a cube' : `turn Anno into ${text === 'stairs' ? 'stairs' : 'a ' + text}`;
      const steps = this.plan(text);
      say(`User: ${text}`, '');
      await wait(400); if (id !== runId) return;
      if (!steps.length) { say('Thought: Nothing here maps to a tool I have.', 'FinalAnswer: I can spawn a cube, reshape Anno (cube, plane, pillar, stairs, pyramid), or send Anno home.'); return; }
      say(`Thought: Plan: ${steps.map((s, i) => `${i + 1}) ${s.tool}`).join(', ')}.`);
      for (const s of steps) {
        await wait(700); if (id !== runId) return;
        say('', `Thought: ${s.why}`, `Action: ${s.tool}(${s.args})`);
        s.run();
        await wait(1500); if (id !== runId) return;
        say(`Observation: ${s.obs}`);
      }
      await wait(500); if (id !== runId) return;
      say('', 'FinalAnswer: Done.');
    },
  };

  /* ---------- tabs ---------- */
  const scenes = { atto, acco, anno };
  let scene = atto;
  function run(text) { const id = ++runId; lines = []; scene.run(text, id); }
  function select(name, focus) {
    runId++; reset();
    scene = scenes[name]; sway = true;
    tabs.forEach((t) => { const on = t.dataset.tab === name; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    $('[role="tabpanel"]').setAttribute('aria-labelledby', `tab-${name}`);
    titleEl.textContent = scene.title; subEl.textContent = scene.sub; fineEl.textContent = scene.fine;
    promptsEl.innerHTML = '';
    for (const p of scene.prompts()) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = p;
      b.addEventListener('click', () => run(p));
      promptsEl.append(b);
    }
    promptsEl.classList.toggle('is-chips', !!scene.freeText);
    form.hidden = !scene.freeText;
    lines = [scene.idle]; show();
    scene.build();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true); }
    });
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value.trim(); if (v) run(v); });

  stage.addEventListener('pointerdown', (e) => { dragging = true; sway = false; lastX = e.clientX; lastY = e.clientY; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.01; pitch = Math.max(0.05, Math.min(1.3, pitch + (e.clientY - lastY) * 0.01));
    lastX = e.clientX; lastY = e.clientY;
  });
  ['pointerup', 'pointercancel'].forEach((ev) => stage.addEventListener(ev, () => { dragging = false; }));

  const start = /^#(atto|acco|anno)$/.test(location.hash) ? location.hash.slice(1) : 'atto';
  select(start);
  requestAnimationFrame(frame);
})();
