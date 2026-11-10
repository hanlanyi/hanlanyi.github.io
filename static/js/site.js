// Site behaviour: video stage, glasses mode + teleprompter, command palette.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;

  /* ---------- video stage ---------- */
  const player = $('[data-player]');
  if (player) {
    const play = (id) => {
      player.dataset.id = id;
      player.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="YouTube video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    };
    const select = (a, label) => {
      $$('.queue a').forEach((x) => x.removeAttribute('aria-current'));
      a.setAttribute('aria-current', 'true');
      $('[data-now-title]').textContent = a.dataset.title;
      $('[data-now-date]').textContent = a.dataset.date;
      $('[data-now-views]').textContent = a.dataset.views;
      $('[data-now-label]').textContent = label;
      $('[data-now-link]').href = a.href;
    };
    player.addEventListener('click', (e) => { if (e.target.closest('.poster')) play(player.dataset.id); });
    $$('.queue a').forEach((a, i) => a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let people open YouTube in a new tab
      e.preventDefault();
      select(a, i === 0 ? 'Latest video' : 'Now playing');
      play(a.dataset.video);
      history.replaceState(null, '', `?v=${a.dataset.video}`);
      player.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
    // Deep link: /?v=<id> (used by search and the spatial wall).
    const want = new URLSearchParams(location.search).get('v');
    const link = want && $$('.queue a').find((a) => a.dataset.video === want);
    if (link) {
      select(link, 'Selected video');
      player.dataset.id = want;
      const img = $('.poster img', player);
      if (img) img.src = `https://i.ytimg.com/vi/${want}/hqdefault.jpg`;
    }
  }

  /* ---------- glasses mode ---------- */
  const hudButtons = $$('[data-hud-toggle]');
  const prompter = $('[data-prompter]');
  const hudOn = () => root.hasAttribute('data-hud');
  const syncHud = () => {
    hudButtons.forEach((b) => b.setAttribute('aria-pressed', String(hudOn())));
    if (prompter) { prompter.hidden = !hudOn(); if (!hudOn()) scroller.stop(); }
  };
  const toggleHud = () => {
    if (hudOn()) root.removeAttribute('data-hud'); else root.setAttribute('data-hud', 'on');
    store.set('hud', hudOn() ? '1' : '0');
    syncHud();
  };

  // Teleprompter: hands-free reading at a steady pace.
  const scroller = (() => {
    let raf = 0, last = 0, carry = 0;
    let speed = Number(store.get('speed')) || 40; // px per second
    const out = $('[data-prompter-speed]');
    const btn = $('[data-prompter-toggle]');
    const paint = () => { if (out) out.textContent = speed; if (btn) btn.setAttribute('aria-pressed', String(!!raf)); };
    const step = (t) => {
      carry += ((t - last) / 1000) * speed; last = t;
      const px = Math.floor(carry);
      if (px) { window.scrollBy(0, px); carry -= px; }
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      raf = atEnd ? 0 : requestAnimationFrame(step);
      if (atEnd) paint();
    };
    return {
      toggle() { raf ? this.stop() : this.start(); },
      start() { last = performance.now(); raf = requestAnimationFrame(step); paint(); },
      stop() { cancelAnimationFrame(raf); raf = 0; paint(); },
      nudge(d) { speed = Math.min(200, Math.max(10, speed + d)); store.set('speed', speed); paint(); },
      paint,
    };
  })();
  if (prompter) {
    $('[data-prompter-toggle]').addEventListener('click', () => scroller.toggle());
    $('[data-prompter-slower]').addEventListener('click', () => scroller.nudge(-10));
    $('[data-prompter-faster]').addEventListener('click', () => scroller.nudge(10));
    // Any manual scroll input hands control back to the reader.
    ['wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => scroller.stop(), { passive: true }));
    scroller.paint();
  }
  hudButtons.forEach((b) => b.addEventListener('click', toggleHud));
  syncHud();

  /* ---------- command palette ---------- */
  let palette, input, list, items = [], shown = [], cursor = 0, lastFocus;
  const actions = [
    { k: 'do', t: 'Toggle glasses mode', run: toggleHud },
    { k: 'do', t: 'Open spatial wall in side-by-side 3D', u: '/spatial/?stereo=1' },
  ];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function buildPalette() {
    palette = document.createElement('div');
    palette.className = 'palette';
    palette.hidden = true;
    palette.innerHTML = `<div class="palette-box" role="dialog" aria-modal="true" aria-label="Search">
      <input type="text" placeholder="Search videos, posts, links…" aria-label="Search" autocomplete="off" spellcheck="false">
      <ul role="listbox"></ul></div>`;
    document.body.append(palette);
    input = $('input', palette); list = $('ul', palette);
    input.addEventListener('input', () => { cursor = 0; render(); });
    palette.addEventListener('mousedown', (e) => { if (e.target === palette) closePalette(); });
    list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) go(shown[Number(li.dataset.i)]); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cursor = Math.min(shown.length - 1, cursor + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cursor = Math.max(0, cursor - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (shown[cursor]) go(shown[cursor]); }
      else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); closePalette(); }
    });
  }
  function render() {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    shown = items.map((it) => {
      const title = it.t.toLowerCase(), body = (it.x || '').toLowerCase();
      let score = 0;
      for (const w of words) {
        if (title.includes(w)) score += title.startsWith(w) ? 4 : 3;
        else if (body.includes(w) || it.k.includes(w)) score += 1;
        else return null;
      }
      return { it, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 12).map((x) => x.it);
    list.innerHTML = shown.length
      ? shown.map((it, i) => `<li role="option" data-i="${i}" aria-selected="${i === cursor}"><span class="pk">${it.k}</span><span class="pt">${esc(it.t)}</span><span class="pd">${it.d || ''}</span></li>`).join('')
      : '<p class="palette-empty">No matches.</p>';
    const on = $('[aria-selected="true"]', list);
    if (on) on.scrollIntoView({ block: 'nearest' });
  }
  function go(it) {
    closePalette();
    if (it.run) it.run();
    else if (/^https?:/.test(it.u)) window.open(it.u, '_blank', 'noopener');
    else location.href = it.u;
  }
  async function openPalette() {
    if (!palette) buildPalette();
    if (!palette.hidden) return;
    lastFocus = document.activeElement;
    palette.hidden = false;
    input.value = ''; cursor = 0;
    if (!items.length) {
      items = actions.slice(); render();
      try { items = [...(await (await fetch('/index.json')).json()), ...actions]; } catch {}
    }
    render();
    input.focus();
  }
  function closePalette() {
    palette.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('[data-palette-open]').forEach((b) => b.addEventListener('click', openPalette));

  /* ---------- keys ---------- */
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing(e))) { e.preventDefault(); openPalette(); return; }
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'g' || e.key === 'G') { toggleHud(); return; }
    if (prompter && hudOn()) {
      if (e.key === ' ' && !e.target.closest('button, a')) { e.preventDefault(); scroller.toggle(); }
      else if (e.key === '-' || e.key === '_') scroller.nudge(-10);
      else if (e.key === '=' || e.key === '+') scroller.nudge(10);
    }
  });
})();
