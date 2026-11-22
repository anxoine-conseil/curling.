// Découpage d'une image en pièces (carrées ou de puzzle) et glisser-déposer.
// Le même "seed" donne exactement le même puzzle sur tous les téléphones.
(function (root) {
  const PAD = 0.3;
  const CP = [[[.30, 0], [.40, .02], [.38, .10]], [[.34, .20], [.40, .28], [.50, .28]], [[.60, .28], [.66, .20], [.62, .10]], [[.60, .02], [.70, 0], [1, 0]]];

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mkEdges(n, R) { const s = () => (R() < .5 ? 1 : -1), H = [], V = []; for (let i = 0; i < n; i++) { H[i] = []; V[i] = []; for (let j = 0; j < n; j++) { H[i][j] = s(); V[i][j] = s(); } } return { H, V }; }
  function edge(ax, ay, bx, by, nx, ny, b) {
    if (!b) return `L${bx} ${by}`;
    const L = Math.hypot(bx - ax, by - ay), tx = bx - ax, ty = by - ay;
    const P = ([u, h]) => `${(ax + tx * u + nx * h * L * b).toFixed(1)} ${(ay + ty * u + ny * h * L * b).toFixed(1)}`;
    return CP.map(s => 'C' + s.map(P).join(' ')).join('');
  }
  function piecePath(i, n, E) {
    const r = Math.floor(i / n), c = i % n, w = 400 / n, x = c * w, y = r * w;
    const t = r > 0 ? -E.H[r][c] : 0, bo = r < n - 1 ? E.H[r + 1][c] : 0, l = c > 0 ? -E.V[r][c] : 0, ri = c < n - 1 ? E.V[r][c + 1] : 0;
    return `M${x} ${y}` + edge(x, y, x + w, y, 0, -1, t) + edge(x + w, y, x + w, y + w, 1, 0, ri) + edge(x + w, y + w, x, y + w, 0, 1, bo) + edge(x, y + w, x, y, -1, 0, l) + 'Z';
  }
  let uid = 0;
  function pieceHTML(i, o, lv, E, rot) {
    const n = lv.n, w = 400 / n, x = (i % n) * w, y = Math.floor(i / n) * w;
    if (!lv.jig) return `<div class="pc" data-i="${i}" data-rot="0"><svg viewBox="${x} ${y} ${w} ${w}" preserveAspectRatio="none">${art(o, lv.style)}</svg></div>`;
    const d = piecePath(i, n, E), id = `cp${++uid}`;
    return `<div class="pc jig" data-i="${i}" data-rot="${rot}"><svg viewBox="${x - PAD * w} ${y - PAD * w} ${w * (1 + 2 * PAD)} ${w * (1 + 2 * PAD)}" style="transform:rotate(${rot}deg)"><clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${art(o, lv.style)}</g><path class="hit" d="${d}" fill="transparent" stroke="rgba(31,36,51,.45)" stroke-width="${(w / 60).toFixed(1)}"/></svg></div>`;
  }
  // Le même dessin, rendu selon le niveau : gros traits (1-2), traits fins (3-4), rendu réaliste (5-6).
  const KLINE = 'stroke="#13293d" stroke-width="4" stroke-linejoin="round"';
  const REAL_DEFS = `<defs><filter id="rl-3d" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceAlpha" stdDeviation="7" result="b"/><feSpecularLighting in="b" surfaceScale="3" specularConstant=".32" specularExponent="22" lighting-color="#ffffff" result="sp"><fePointLight x="60" y="20" z="260"/></feSpecularLighting><feComposite in="sp" in2="SourceAlpha" operator="in" result="sp2"/><feGaussianBlur in="SourceAlpha" stdDeviation="5" result="sh"/><feOffset in="sh" dx="4" dy="7" result="sh2"/><feComponentTransfer in="sh2" result="sh3"><feFuncA type="linear" slope=".32"/></feComponentTransfer><feColorMatrix in="SourceGraphic" type="saturate" values="1.12" result="sat"/><feMerge><feMergeNode in="sh3"/><feMergeNode in="sat"/><feMergeNode in="sp2"/></feMerge></filter><filter id="rl-grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/></filter><radialGradient id="rl-light" cx="22%" cy="12%" r="95%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#0b1a2a" stop-opacity=".22"/></radialGradient><linearGradient id="rl-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset=".6" stop-color="#fff" stop-opacity=".0"/></linearGradient></defs>`;
  let artId = 0;
  function art(o, style = 'line') {
    // une vraie photo, si on en ajoute une un jour (champ « photo » de l'objet), remplace le rendu réaliste
    if (o.photo && o.photoOk) return `<image href="${o.photo}" width="400" height="400" preserveAspectRatio="xMidYMid slice"/>`;
    // style BD franco-belge (niveaux 3 et 4) : dessin détaillé propre à l'objet, sinon traits fins
    if ((style === 'bold' || style === 'line') && o.aff) return o.aff;
    if ((style === 'bd' || style === 'real') && o.lig) return o.lig;
    if (style === 'bd') return o.bd ? o.bd.replace(/BDX/g, 'bd' + (++artId)) : o.bg + o.fg;
    if (style === 'bold') return o.bg + o.fg.split(KLINE).join('stroke="#13293d" stroke-width="10" stroke-linejoin="round"');
    if (style === 'real') {
      const fg = o.fg.split(KLINE).join('stroke="rgba(11,26,42,.22)" stroke-width="1.5" stroke-linejoin="round"');
      const u = 'rl' + (++artId) + '-';  // identifiants uniques : chaque image garde ses propres effets
      return (`${REAL_DEFS}${o.bg}<rect width="400" height="400" fill="url(#rl-sky)"/><g filter="url(#rl-3d)">${fg}</g><rect width="400" height="400" filter="url(#rl-grain)" opacity=".10" style="mix-blend-mode:multiply"/><rect width="400" height="400" fill="url(#rl-light)"/>`).replace(/rl-/g, u);
    }
    return o.bg + o.fg;
  }
  const full = (o, style) => `<svg viewBox="0 0 400 400">${art(o, style)}</svg>`;

  // Monte un puzzle dans board + tray. opts: {obj, lv, seed, placed[], onPlace(placedArray), onWrong(msg), onRotate()}
  function mount(board, tray, opts) {
    const { obj, lv, seed } = opts, n = lv.n, tot = n * n, R = rng(seed), E = mkEdges(n, R);
    const rots = Array.from({ length: tot }, () => (lv.rot ? [0, 90, 180, 270][Math.floor(R() * 4)] : 0));
    const order = Array.from({ length: tot }, (_, i) => i);
    for (let i = tot - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const placed = new Set(opts.placed || []);
    let sel = null, drag = null, alive = true;

    board.innerHTML = `<div class="sil">${full(obj, lv.style)}</div>`;
    board.style.gridTemplateColumns = board.style.gridTemplateRows = `repeat(${n},minmax(0,1fr))`;
    board.classList.toggle('jig', !!lv.jig); tray.classList.toggle('jig', !!lv.jig);
    board.insertAdjacentHTML('beforeend', Array.from({ length: tot }, (_, i) => `<div class="cell" data-i="${i}"></div>`).join(''));
    tray.innerHTML = order.map(i => pieceHTML(i, obj, lv, E, rots[i])).join('');
    for (const i of placed) { const p = tray.querySelector(`.pc[data-i="${i}"]`); if (p) settle(p, board.querySelector(`.cell[data-i="${i}"]`), true); }

    const size = () => { const ps = (board.clientWidth / n) + 'px'; board.style.setProperty('--ps', ps); tray.style.setProperty('--ps', ps); };
    const ro = new ResizeObserver(size); ro.observe(board); size();

    function settle(p, cell, quiet) {
      p.classList.remove('sel', 'drag'); p.style.left = p.style.top = '';
      const s = p.querySelector('svg'); s.style.transform = ''; p.dataset.rot = '0';
      cell.appendChild(p); placed.add(+p.dataset.i);
      if (!quiet) opts.onPlace?.([...placed], placed.size === tot);
    }
    function rotate(p) {
      const s = p.querySelector('svg'), cur = parseFloat((s.style.transform.match(/-?\d+/) || [0])[0]);
      s.style.transform = `rotate(${cur + 90}deg)`; p.dataset.rot = (+p.dataset.rot + 90) % 360; opts.onRotate?.();
    }

    function down(e) {
      const p = e.target.closest('.pc'); if (!p || !tray.contains(p)) return;
      e.preventDefault(); try { p.setPointerCapture(e.pointerId); } catch (_) {}
      drag = { p, x: e.clientX, y: e.clientY, moved: false, s: p.getBoundingClientRect().width };
    }
    function move(e) {
      if (!drag) return; const d = drag;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) { d.moved = true; d.p.classList.add('drag'); d.p.classList.remove('sel'); sel = null; }
      if (d.moved) { d.p.style.left = (e.clientX - d.s / 2) + 'px'; d.p.style.top = (e.clientY - d.s / 2) + 'px'; }
    }
    function up(e) {
      if (!drag) return; const d = drag; drag = null;
      if (!d.moved) {
        if (lv.rot) return rotate(d.p);
        tray.querySelectorAll('.pc.sel').forEach(x => x !== d.p && x.classList.remove('sel'));
        d.p.classList.toggle('sel'); sel = d.p.classList.contains('sel') ? d.p : null; return;
      }
      const cell = board.querySelector(`.cell[data-i="${d.p.dataset.i}"]`), r = cell.getBoundingClientRect();
      const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      d.p.classList.remove('drag'); d.p.style.left = d.p.style.top = '';
      const b = board.getBoundingClientRect(), onBoard = e.clientX > b.left && e.clientX < b.right && e.clientY > b.top && e.clientY < b.bottom;
      if (dist < r.width * .8) { if (d.p.dataset.rot !== '0') return opts.onWrong?.('Bonne place ! Mais tournez d’abord la pièce : touchez-la.'); settle(d.p, cell); }
      else if (onBoard) opts.onWrong?.('Pas tout à fait… essayez ailleurs');
    }
    function cancel() { if (drag) { drag.p.classList.remove('drag'); drag.p.style.left = drag.p.style.top = ''; drag = null; } }
    function boardClick(e) {
      const c = e.target.closest('.cell'); if (!c || !sel || c.querySelector('.pc')) return;
      if (c.dataset.i === sel.dataset.i) settle(sel, c);
      else { c.classList.remove('no'); void c.offsetWidth; c.classList.add('no'); opts.onWrong?.(); }
    }
    tray.addEventListener('pointerdown', down);
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    board.addEventListener('click', boardClick);

    return {
      count: () => placed.size, total: tot,
      destroy() {
        if (!alive) return; alive = false; ro.disconnect();
        tray.removeEventListener('pointerdown', down); document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel);
        board.removeEventListener('click', boardClick);
      }
    };
  }

  // Scène : les photos gagnées, des points d'interrogation pour les suivantes.
  const SLOTS = [[20, 12], [185, 12], [350, 12], [102, 166], [267, 166]];
  function scene(theme, upto) {
    const parts = SLOTS.slice(0, theme.objects.length).map(([x, y], i) => i < upto
      ? `<svg x="${x}" y="${y}" width="150" height="150" viewBox="0 0 400 400"><clipPath id="sc${++uid}"><rect width="400" height="400" rx="34"/></clipPath><g clip-path="url(#sc${uid})">${art(theme.objects[i], 'real')}</g><rect x="4" y="4" width="392" height="392" rx="32" fill="none" stroke="#fff" stroke-width="8"/></svg>`
      : `<g transform="translate(${x} ${y})"><rect x="3" y="3" width="144" height="144" rx="14" fill="rgba(255,255,255,.55)" stroke="#13293d" stroke-width="4" stroke-dasharray="12 9" opacity=".6"/><text x="75" y="100" text-anchor="middle" font-size="70" font-weight="900" fill="#13293d" opacity=".45" font-family="Sora,sans-serif">?</text></g>`);
    return `<svg viewBox="0 0 520 320"><rect width="520" height="320" rx="18" fill="#e8f1ee"/>${parts.join('')}</svg>`;
  }
  function gridPreview(obj, lv) {
    let l = '';
    if (lv.jig) { const E = mkEdges(lv.n, rng(7)); for (let i = 0; i < lv.n * lv.n; i++) l += piecePath(i, lv.n, E); }
    else for (let i = 1; i < lv.n; i++) { const p = i * 400 / lv.n; l += `M${p} 0V400M0 ${p}H400`; }
    return `<svg viewBox="0 0 400 400">${art(obj, lv.style)}<path d="${l}" fill="none" stroke="#fff" stroke-width="${lv.jig ? 6 : 10}"/></svg>`;
  }

  // ---------- Phrases à remettre dans l'ordre ----------
  const escT = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const who = it => it.a ? `${escT(it.a)}${it.src ? ', ' + escT(it.src) : ''}` : 'Proverbe';
  const quoteHTML = it => `<figure class="quote"><blockquote>« ${escT(it.t)} »</blockquote><figcaption>${who(it)}</figcaption></figure>`;
  const carnet = (items, upto) => `<div class="carnet">${items.map((it, i) => i < upto ? `<div class="q1">« ${escT(it.t)} »<small>${who(it)}</small></div>` : '<div class="qph">« … »</div>').join('')}</div>`;
  const textPreview = () => '<div class="qprev">« Je pense, donc je suis. »</div>';

  // opts: {frags, seed, placed(count), onPlace(list, done), onWrong()}
  function mountText(line, box, opts) {
    const { frags } = opts, R = rng(opts.seed), tot = frags.length;
    let next = Math.min(opts.placed || 0, tot), alive = true;
    line.innerHTML = frags.map((f, i) => `<span class="slot${i < next ? ' full' : ''}" data-i="${i}" style="${i < next ? '' : `width:${Math.max(2, f.length * .55)}em`}">${i < next ? escT(f) : ''}</span>`).join('');
    const order = frags.map((_, i) => i).filter(i => i >= next);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    box.innerHTML = order.map(i => `<button class="frag" data-i="${i}">${escT(frags[i])}</button>`).join('');
    const mark = () => line.querySelectorAll('.slot').forEach(s => s.classList.toggle('next', +s.dataset.i === next));
    mark();
    function click(e) {
      const b = e.target.closest('.frag'); if (!b || !alive || next >= tot) return;
      if (b.textContent === frags[next]) {
        const s = line.querySelector(`.slot[data-i="${next}"]`);
        s.textContent = b.textContent; s.classList.add('full'); s.style.width = ''; b.remove();
        next++; mark();
        opts.onPlace?.(Array.from({ length: next }, (_, i) => i), next === tot);
      } else { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); opts.onWrong?.(); }
    }
    box.addEventListener('click', click);
    return { count: () => next, total: tot, destroy() { alive = false; box.removeEventListener('click', click); } };
  }

  // ---------- Calcul ----------
  const S_ = v => v === '-' ? '−' : String(v);
  const eqHTML = rd => `<div class="eq">${escT(rd.text)}</div>`;
  const calcBoard = (rounds, upto) => `<div class="chalk">${rounds.map((rd, i) => i < upto ? `<div>${escT(rd.text)}</div>` : '<div class="ph">? + ? = ?</div>').join('')}</div>`;
  const calcPreview = () => '<div class="qprev calcprev">12 + 5<br>= 17</div>';
  const tilesHTML = rd => `<div class="calcTiles">${rd.tiles.map(t => `<span class="${t.k === 'o' ? 'op' : ''}">${S_(t.v)}</span>`).join('')}</div>`;

  // opts: {round (calcRound), check(vals) → bool, onPlace(list, done), onWrong(msg)}
  function mountCalc(line, box, opts) {
    const rd = opts.round, n = rd.slots.length, fill = Array(n).fill(null);
    let solved = false;
    const pieces = rd.slots.map((k, i) => `<button class="cslot ${k === 'o' ? 'op' : ''}" data-s="${i}" aria-label="Case ${i + 1}"></button>${i === n - 2 ? '<span class="ceq">=</span>' : ''}`);
    line.innerHTML = `<div class="calcLine">${pieces.join('')}</div>`;
    box.innerHTML = rd.tiles.map((t, i) => `<button class="frag ctile ${t.k === 'o' ? 'op' : ''}" data-t="${i}">${S_(t.v)}</button>`).join('');
    const filled = () => fill.filter(x => x !== null).length;
    function render() {
      line.querySelectorAll('.cslot').forEach(b => { const t = fill[+b.dataset.s]; b.textContent = t === null ? '' : S_(rd.tiles[t].v); b.classList.toggle('full', t !== null); });
      box.querySelectorAll('.ctile').forEach(b => { b.classList.toggle('used', fill.includes(+b.dataset.t)); });
    }
    function report() {
      const f = filled();
      if (f === n) {
        const ok = opts.check(fill.map((t, i) => rd.slots[i] === 'n' ? Number(rd.tiles[t].v) : rd.tiles[t].v));
        if (ok) { solved = true; line.classList.add('ok'); opts.onPlace?.(Array.from({ length: n }, (_, i) => i), true); return; }
        line.classList.remove('no'); void line.offsetWidth; line.classList.add('no');
        opts.onWrong?.('Ce n’est pas juste… touchez une case pour la changer');
      }
      opts.onPlace?.(Array.from({ length: Math.min(f, n - 1) }, (_, i) => i), false);
    }
    function tileClick(e) {
      const b = e.target.closest('.ctile'); if (!b || solved || b.classList.contains('used')) return;
      const t = +b.dataset.t, kind = rd.tiles[t].k, slot = rd.slots.findIndex((k, i) => k === kind && fill[i] === null);
      if (slot < 0) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); opts.onWrong?.(kind === 'o' ? 'Toutes les cases de signe sont prises' : 'Toutes les cases de nombre sont prises'); return; }
      fill[slot] = t; render(); report();
    }
    function slotClick(e) {
      const b = e.target.closest('.cslot'); if (!b || solved) return;
      const i = +b.dataset.s; if (fill[i] === null) return;
      fill[i] = null; render(); report();
    }
    box.addEventListener('click', tileClick); line.addEventListener('click', slotClick);
    render();
    return { count: () => (solved ? n : Math.min(filled(), n - 1)), total: n, destroy() { box.removeEventListener('click', tileClick); line.removeEventListener('click', slotClick); line.classList.remove('ok'); } };
  }

  // ---------- Cuisine ----------
  const recPhoto = (rd, cls) => rd.photo ? `<img class="${cls}" src="${rd.photo}" alt="" onerror="this.remove()">` : '';
  const recipeCard = rd => `<div class="recipe">${recPhoto(rd, 'recPhoto')}<b>${escT(rd.name)}</b><ul>${rd.ok.map(t => `<li>${escT(t)}</li>`).join('')}</ul></div>`;
  const cookbook = (rounds, upto, ph = 'Recette à découvrir…') => `<div class="cookbook">${rounds.map((rd, i) => i < upto && rd ? `<div><b>${escT(rd.name)}</b><span>${rd.ok.map(escT).join(' · ')}</span></div>` : `<div class="ph">${ph}</div>`).join('')}</div>`;
  const recipePreview = k => {
    const t = k && root.PAP && root.PAP.THEMES[k];
    if (t && t.bank) return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escT(t.name)}"><image href="photos/${t.bank}-1.jpg" width="400" height="400" preserveAspectRatio="xMidYMid slice"/></svg>`;
    return '<div class="qprev recprev">Pizza ?<br><small>5 bons sur 10</small></div>';
  };
  const isCook = t => /°C|min|heure|four|poêle|mijoter|frais,|gratiner|cuire|cuisson|caramélisation/i.test(t) && !/^Région/.test(t);
  const tcls = t => /^Région/.test(t) ? 'reg' : /^Lait de/.test(t) ? 'milk' : isCook(t) ? 'cook' : '';
  const recipeTilesHTML = rd => `<div class="recTiles">${rd.tiles.map(x => `<span class="${tcls(x.t)}">${escT(x.t)}</span>`).join('')}</div>`;

  // opts: {round (recipeRound), onPlace(list, done), onWrong(msg)}
  function mountRecipe(line, box, opts) {
    const rd = opts.round, need = rd.need, picked = [];
    let solved = false;
    line.innerHTML = `<div class="recName">${recPhoto(rd, 'recThumb')}${escT(rd.name)}</div><div class="basket" style="--n:${need}">${Array.from({ length: need }, (_, i) => `<button class="bslot" data-s="${i}" aria-label="Case ${i + 1} du panier"></button>`).join('')}</div>`;
    box.innerHTML = rd.tiles.map((x, i) => `<button class="frag rtile ${tcls(x.t)}" data-t="${i}">${escT(x.t)}</button>`).join('');
    const good = () => picked.filter(i => rd.tiles[i].ok).length;
    function render() {
      line.querySelectorAll('.bslot').forEach((b, i) => { const t = picked[i]; b.textContent = t === undefined ? '' : rd.tiles[t].t; b.classList.toggle('full', t !== undefined); });
      box.querySelectorAll('.rtile').forEach(b => b.classList.toggle('used', picked.includes(+b.dataset.t)));
    }
    function report() {
      if (picked.length === need) {
        if (good() === need) { solved = true; line.classList.add('ok'); opts.onPlace?.(Array.from({ length: need }, (_, i) => i), true); return; }
        line.classList.remove('no'); void line.offsetWidth; line.classList.add('no');
        opts.onWrong?.(`${good()} bon${good() > 1 ? 's' : ''} sur ${need}… touchez un élément du panier pour le retirer`);
      }
      const g = Math.min(picked.length, need - 1);
      opts.onPlace?.(Array.from({ length: g }, (_, i) => i), false);
    }
    function tileClick(e) {
      const b = e.target.closest('.rtile'); if (!b || solved || b.classList.contains('used')) return;
      if (picked.length >= need) { opts.onWrong?.('Le panier est plein : retirez d’abord un élément'); return; }
      picked.push(+b.dataset.t); render(); report();
    }
    function slotClick(e) {
      const b = e.target.closest('.bslot'); if (!b || solved) return;
      const i = +b.dataset.s; if (picked[i] === undefined) return;
      picked.splice(i, 1); render(); report();
    }
    box.addEventListener('click', tileClick); line.addEventListener('click', slotClick);
    render();
    return { count: () => (solved ? need : Math.min(picked.length, need - 1)), total: need, destroy() { box.removeEventListener('click', tileClick); line.removeEventListener('click', slotClick); line.classList.remove('ok'); } };
  }

  // Vérifie quelles photos existent vraiment (sinon on garde le dessin réaliste).
  function preloadPhotos(themes, done) {
    const list = Object.values(themes).flatMap(t => t.objects || []).filter(o => o.photo);
    let left = list.length; if (!left) { done?.(); return; }
    list.forEach(o => { const im = new Image(); im.onload = () => { o.photoOk = true; if (!--left) done?.(); }; im.onerror = () => { if (!--left) done?.(); }; im.src = o.photo; });
  }
  root.Puzzle = { preloadPhotos, mount, scene, full, art, gridPreview, mountText, quoteHTML, carnet, textPreview, mountCalc, eqHTML, calcBoard, calcPreview, tilesHTML, mountRecipe, recipeCard, cookbook, recipePreview, recipeTilesHTML };
})(this);
