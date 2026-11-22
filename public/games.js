// Jeux en solo : sudoku et taquin.
(function (root) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = (a, rnd = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fmt = ms => { const s = Math.round(ms / 1000), m = Math.floor(s / 60); return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`; };
  const seg = (name, items, cur) => `<div class="row seg" data-seg="${name}">${items.map(([v, l]) => `<button data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('')}</div>`;

  // =================== SUDOKU ===================
  const BOX = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };           // lignes × colonnes d'un bloc
  const GIVENS = { 4: [9, 7, 5], 6: [22, 18, 14], 9: [42, 34, 28] }; // chiffres donnés : facile, moyen, difficile
  function ok(g, n, br, bc, r, c, v) {
    for (let i = 0; i < n; i++) if (g[r * n + i] === v || g[i * n + c] === v) return false;
    const r0 = r - r % br, c0 = c - c % bc;
    for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) if (g[(r0 + i) * n + c0 + j] === v) return false;
    return true;
  }
  function fill(g, n, br, bc) {
    const k = g.indexOf(0); if (k < 0) return true;
    const r = Math.floor(k / n), c = k % n;
    for (const v of shuffle([...Array(n)].map((_, i) => i + 1))) if (ok(g, n, br, bc, r, c, v)) { g[k] = v; if (fill(g, n, br, bc)) return true; g[k] = 0; }
    return false;
  }
  function solutions(g, n, br, bc, limit) {
    let best = -1, opts = null;
    for (let k = 0; k < g.length; k++) if (!g[k]) {
      const r = Math.floor(k / n), c = k % n, o = [];
      for (let v = 1; v <= n; v++) if (ok(g, n, br, bc, r, c, v)) o.push(v);
      if (!o.length) return 0;
      if (!opts || o.length < opts.length) { best = k; opts = o; if (o.length === 1) break; }
    }
    if (best < 0) return 1;
    let t = 0;
    for (const v of opts) { g[best] = v; t += solutions(g, n, br, bc, limit - t); g[best] = 0; if (t >= limit) break; }
    return t;
  }
  function makeSudoku(n, diff) {
    const [br, bc] = BOX[n], sol = Array(n * n).fill(0);
    fill(sol, n, br, bc);
    const puz = sol.slice(); let givens = n * n;
    for (const k of shuffle([...Array(n * n).keys()])) {
      if (givens <= GIVENS[n][diff]) break;
      const v = puz[k]; puz[k] = 0;
      if (solutions(puz, n, br, bc, 2) !== 1) puz[k] = v; else givens--;
    }
    return { n, br, bc, sol, puz };
  }

  function mountSudoku(box, snd = {}) {
    const st = { n: 6, diff: 0, help: true, pencil: false };
    let P, val, notes, sel, t0, done, timer;
    box.innerHTML = `
      <div class="gTop">
        <div><b>Taille</b>${seg('n', [[4, '4 × 4'], [6, '6 × 6'], [9, '9 × 9']], st.n)}</div>
        <div><b>Difficulté</b>${seg('diff', [[0, 'Facile'], [1, 'Moyen'], [2, 'Difficile']], st.diff)}</div>
        <button class="big" data-act="new">Nouvelle grille</button>
      </div>
      <div class="gMain">
        <div class="sdk" role="grid" aria-label="Grille de sudoku"></div>
        <div class="gSide">
          <div class="pad"></div>
          <div class="row"><button class="ghost dark" data-act="erase">Effacer</button><button class="ghost dark" data-act="pencil" aria-pressed="false">Crayon : non</button></div>
          <button class="ghost dark" data-act="help" aria-pressed="true">Montrer les erreurs : oui</button>
          <p class="gInfo"><span data-time>0 s</span></p>
          <p class="soft gRule">Chaque ligne, chaque colonne et chaque bloc doit contenir une seule fois chaque chiffre.</p>
        </div>
      </div>
      <div class="gWin hidden"></div>`;
    const grid = box.querySelector('.sdk'), pad = box.querySelector('.pad'), win = box.querySelector('.gWin');
    function start() {
      P = makeSudoku(st.n, st.diff); val = P.puz.slice(); notes = val.map(() => new Set()); sel = val.indexOf(0); done = false; t0 = Date.now();
      win.classList.add('hidden'); grid.style.setProperty('--n', P.n);
      pad.style.setProperty('--n', P.n === 9 ? 5 : P.n === 6 ? 3 : 4);
      pad.innerHTML = [...Array(P.n)].map((_, i) => `<button data-num="${i + 1}">${i + 1}</button>`).join('');
      render();
    }
    function render() {
      const { n, br, bc } = P, sr = Math.floor(sel / n), sc = sel % n, sv = val[sel];
      grid.innerHTML = val.map((v, k) => {
        const r = Math.floor(k / n), c = k % n, given = P.puz[k] !== 0;
        const peer = k !== sel && (r === sr || c === sc || (Math.floor(r / br) === Math.floor(sr / br) && Math.floor(c / bc) === Math.floor(sc / bc)));
        const cls = ['cell2', given ? 'given' : 'user', k === sel ? 'sel' : '', peer ? 'peer' : '', v && v === sv ? 'same' : '', st.help && v && !given && v !== P.sol[k] ? 'err' : '', (c + 1) % bc === 0 && c < n - 1 ? 'bR' : '', (r + 1) % br === 0 && r < n - 1 ? 'bB' : ''].filter(Boolean).join(' ');
        const inner = v ? v : notes[k].size ? `<span class="notes" style="--n:${bc}">${[...Array(n)].map((_, i) => `<i>${notes[k].has(i + 1) ? i + 1 : ''}</i>`).join('')}</span>` : '';
        return `<button class="${cls}" data-k="${k}" aria-label="Ligne ${r + 1}, colonne ${c + 1}${v ? ', ' + v : ', vide'}">${inner}</button>`;
      }).join('');
    }
    function put(v) {
      if (done || P.puz[sel]) return;
      if (st.pencil && v) { notes[sel].has(v) ? notes[sel].delete(v) : notes[sel].add(v); render(); return; }
      val[sel] = v; notes[sel].clear();
      if (v) { if (st.help && v !== P.sol[sel]) snd.no?.(); else snd.place?.(); }
      render();
      if (val.every((x, k) => x === P.sol[k])) {
        done = true; snd.win?.();
        win.innerHTML = `<h2>Bravo, grille terminée !</h2><p class="lead">En ${fmt(Date.now() - t0)}.</p><button class="big" data-act="new">Une autre grille</button>`;
        win.classList.remove('hidden');
      }
    }
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.k) { sel = +b.dataset.k; render(); return; }
      if (b.dataset.num) return put(+b.dataset.num);
      const sg = b.closest('[data-seg]');
      if (sg) { st[sg.dataset.seg] = +b.dataset.v; sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); return start(); }
      const a = b.dataset.act;
      if (a === 'new') start();
      if (a === 'erase') put(0);
      if (a === 'pencil') { st.pencil = !st.pencil; b.setAttribute('aria-pressed', st.pencil); b.textContent = 'Crayon : ' + (st.pencil ? 'oui' : 'non'); }
      if (a === 'help') { st.help = !st.help; b.setAttribute('aria-pressed', st.help); b.textContent = 'Montrer les erreurs : ' + (st.help ? 'oui' : 'non'); render(); }
    });
    box.addEventListener('keydown', e => {
      if (!P) return; const n = P.n;
      if (/^[1-9]$/.test(e.key) && +e.key <= n) { put(+e.key); e.preventDefault(); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { put(0); e.preventDefault(); }
      else if (e.key.startsWith('Arrow')) {
        const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -n, ArrowDown: n }[e.key]; const k = sel + d;
        if (k >= 0 && k < n * n) { sel = k; render(); box.querySelector(`[data-k="${k}"]`)?.focus(); e.preventDefault(); }
      }
    });
    timer = setInterval(() => { if (!done && P) { const el = box.querySelector('[data-time]'); if (el) el.textContent = fmt(Date.now() - t0); } }, 1000);
    start();
    return { destroy() { clearInterval(timer); } };
  }

  // =================== TAQUIN ===================
  function mountTaquin(box, images, snd = {}) {
    const st = { n: 3, img: 0, nums: true };
    let b, moves, t0, done, timer;
    box.innerHTML = `
      <div class="gTop">
        <div><b>Taille</b>${seg('n', [[3, '3 × 3'], [4, '4 × 4'], [5, '5 × 5']], st.n)}</div>
        <div class="gPick"><b>Image</b><select class="gSel" aria-label="Choisir l'image">${images.map((im, i) => `<option value="${i}">${esc(im.label)}</option>`).join('')}</select></div>
        <button class="big" data-act="new">Mélanger</button>
      </div>
      <div class="gMain">
        <div class="tq" aria-label="Taquin"></div>
        <div class="gSide">
          <p class="soft" style="margin:0">Le modèle</p>
          <div class="tqModel"></div>
          <button class="ghost dark" data-act="nums" aria-pressed="true">Numéros : oui</button>
          <p class="gInfo"><span data-moves>0 coup</span> · <span data-time>0 s</span></p>
          <p class="soft gRule">Touchez une pièce à côté de la case vide pour la faire glisser.</p>
        </div>
      </div>
      <div class="gWin hidden"></div>`;
    const board = box.querySelector('.tq'), win = box.querySelector('.gWin'), sel = box.querySelector('.gSel');
    const N = () => st.n * st.n;
    function start() {
      const n = st.n, im = images[st.img];
      b = [...Array(N()).keys()]; b[N() - 1] = -1; moves = 0; done = false; t0 = Date.now();
      // mélange par vrais déplacements : la partie a toujours une solution
      let e = N() - 1, prev = -1;
      for (let i = 0; i < 60 * n * n; i++) {
        const r = Math.floor(e / n), c = e % n, nb = [];
        if (r > 0) nb.push(e - n); if (r < n - 1) nb.push(e + n); if (c > 0) nb.push(e - 1); if (c < n - 1) nb.push(e + 1);
        const pick = shuffle(nb.filter(x => x !== prev))[0]; b[e] = b[pick]; b[pick] = -1; prev = e; e = pick;
      }
      const w = 400 / n;
      board.style.setProperty('--n', n);
      board.innerHTML = [...Array(N() - 1).keys()].map(t => `<button class="tile" data-t="${t}" aria-label="Pièce ${t + 1}"><svg viewBox="${(t % n) * w} ${Math.floor(t / n) * w} ${w} ${w}" preserveAspectRatio="none">${im.svg}</svg><span class="num">${t + 1}</span></button>`).join('');
      box.querySelector('.tqModel').innerHTML = `<svg viewBox="0 0 400 400">${im.svg}</svg>`;
      board.classList.toggle('nonum', !st.nums); win.classList.add('hidden'); board.classList.remove('solved');
      place(); info();
    }
    function place() {
      const n = st.n;
      b.forEach((t, k) => { if (t < 0) return; const el = board.querySelector(`[data-t="${t}"]`); el.style.left = (k % n) * 100 / n + '%'; el.style.top = Math.floor(k / n) * 100 / n + '%'; });
    }
    function info() { box.querySelector('[data-moves]').textContent = `${moves} coup${moves > 1 ? 's' : ''}`; }
    board.addEventListener('click', e => {
      const el = e.target.closest('.tile'); if (!el || done) return;
      const n = st.n, k = b.indexOf(+el.dataset.t), z = b.indexOf(-1);
      const kr = Math.floor(k / n), kc = k % n, zr = Math.floor(z / n), zc = z % n;
      if (kr !== zr && kc !== zc) { snd.no?.(); return; }
      const step = kr === zr ? (kc < zc ? 1 : -1) : (kr < zr ? n : -n);
      for (let p = z; p !== k; p -= step) { b[p] = b[p - step]; }
      b[k] = -1; moves++; place(); info(); snd.place?.();
      if (b.every((t, i) => i === N() - 1 ? t === -1 : t === i)) {
        done = true; board.classList.add('solved'); snd.win?.();
        win.innerHTML = `<h2>Bravo, image reconstituée !</h2><p class="lead">${moves} coups, en ${fmt(Date.now() - t0)}.</p><button class="big" data-act="new">Rejouer</button>`;
        win.classList.remove('hidden');
      }
    });
    box.addEventListener('click', e => {
      const bt = e.target.closest('button'); if (!bt || bt.classList.contains('tile')) return;
      const sg = bt.closest('[data-seg]');
      if (sg) { st[sg.dataset.seg] = +bt.dataset.v; sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === bt)); return start(); }
      if (bt.dataset.act === 'new') start();
      if (bt.dataset.act === 'nums') { st.nums = !st.nums; bt.setAttribute('aria-pressed', st.nums); bt.textContent = 'Numéros : ' + (st.nums ? 'oui' : 'non'); board.classList.toggle('nonum', !st.nums); }
    });
    sel.addEventListener('change', () => { st.img = +sel.value; start(); });
    timer = setInterval(() => { if (!done && b) { const el = box.querySelector('[data-time]'); if (el) el.textContent = fmt(Date.now() - t0); } }, 1000);
    start();
    return { destroy() { clearInterval(timer); } };
  }

  // =================== DOMINOS ===================
  // Une suite : chaque domino touche le suivant par le même nombre de points. Tous les dominos doivent être posés.
  function makeChain(n, vmax = 6) {
    const V = [...Array(vmax + 1).keys()];
    for (let tries = 0; tries < 50; tries++) {
      const used = new Set(), vals = [Math.floor(Math.random() * (vmax + 1))];
      const dfs = () => {
        if (vals.length === n + 1) return true;
        const a = vals[vals.length - 1];
        for (const b of shuffle(V)) {
          const key = Math.min(a, b) + '-' + Math.max(a, b);
          if (used.has(key)) continue;
          used.add(key); vals.push(b);
          if (dfs()) return true;
          vals.pop(); used.delete(key);
        }
        return false;
      };
      if (dfs()) return vals.slice(1).map((b, i) => [vals[i], b]);
    }
    return null;
  }
  const PIPS = { 0: [], 1: [[30, 30]], 2: [[15, 15], [45, 45]], 3: [[15, 15], [30, 30], [45, 45]], 4: [[15, 15], [45, 15], [15, 45], [45, 45]], 5: [[15, 15], [45, 15], [30, 30], [15, 45], [45, 45]], 6: [[15, 15], [45, 15], [15, 30], [45, 30], [15, 45], [45, 45]], 7: [[15, 15], [45, 15], [15, 30], [30, 30], [45, 30], [15, 45], [45, 45]], 8: [[15, 15], [30, 15], [45, 15], [15, 30], [45, 30], [15, 45], [30, 45], [45, 45]], 9: [[15, 15], [30, 15], [45, 15], [15, 30], [30, 30], [45, 30], [15, 45], [30, 45], [45, 45]] };
  const PIPCOL = ['#1f2433', '#e63946', '#f4a259', '#2e9b4f', '#3a86ff', '#9b5de5', '#0e4f5c', '#c2185b', '#6d4c41', '#00897b'];
  // Dominos au rendu réaliste : ivoire bombé, épaisseur, points creusés, rivet en laiton.
  const DOM_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="dmFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset=".55" stop-color="#f6efdd"/><stop offset="1" stop-color="#e7dcc2"/></linearGradient>
<linearGradient id="dmSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9ccae"/><stop offset="1" stop-color="#a8987a"/></linearGradient>
<radialGradient id="dmSheen" cx=".3" cy=".15" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".4" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="dmPin" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#d4a637"/><stop offset="1" stop-color="#7a5a12"/></radialGradient>
<radialGradient id="dmHole" cx=".5" cy=".38" r=".62"><stop offset="0" stop-color="#000" stop-opacity=".95"/><stop offset=".7" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="dmGrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .48  0 0 0 0 .35  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
</defs></svg>`;
  const pip = (cx, cy, col, r = 6.2) => `<circle cx="${cx}" cy="${cy + .8}" r="${r + .2}" fill="#fff" opacity=".9"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#dmHole)" opacity=".55"/><ellipse cx="${cx - 1.6}" cy="${cy - 2.2}" rx="2" ry="1.2" fill="#fff" opacity=".35"/>`;
  const domSVG = (a, b, color) => `<svg viewBox="0 0 124 70" aria-hidden="true"><rect x="2" y="6" width="120" height="62" rx="11" fill="url(#dmSide)"/><rect x="2" y="2" width="120" height="60" rx="11" fill="url(#dmFace)"/><rect x="2" y="2" width="120" height="60" rx="11" filter="url(#dmGrain)" fill="#fff"/><rect x="2" y="2" width="120" height="60" rx="11" fill="url(#dmSheen)"/><rect x="2.5" y="2.5" width="119" height="59" rx="10.5" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1"/><path d="M62 9V55" stroke="#8c7d60" stroke-width="2.4" stroke-linecap="round"/><path d="M63.3 9V55" stroke="#fff" stroke-opacity=".8" stroke-width="1"/>${[[a, 2], [b, 62]].map(([v, dx]) => PIPS[v].map(([x, y]) => pip(x + dx, y + 2, color ? PIPCOL[v] : '#16181d', v > 6 ? 5.2 : 6.2)).join('')).join('')}<circle cx="62" cy="32" r="3.6" fill="url(#dmPin)" stroke="#6b4e10" stroke-width=".6"/></svg>`;

  function mountDomino(box, snd = {}) {
    // Niveaux : jeu classique (0 à 6 points) ou grand jeu (0 à 9), avec ou sans dominos pièges qui ne servent à rien.
    const DLV = { 1: { v: 6, x: 0 }, 2: { v: 9, x: 0 }, 3: { v: 9, x: 4 }, 4: { v: 9, x: 8 } };
    const st = { n: 10, lv: 2, color: false };
    let sol, tray, chain, t0, done, timer;   // tray : [{id,a,b}] ; chain : [{id,a,b}] orientés
    box.innerHTML = DOM_DEFS + `
      <div class="gTop">
        <div><b>Nombre de dominos</b>${seg('n', [[4, '4'], [6, '6'], [10, '10'], [15, '15'], [20, '20'], [30, '30'], [40, '40']], st.n)}</div>
        <div><b>Difficulté</b>${seg('lv', [[1, 'Classique'], [2, 'Grand jeu'], [3, 'Avec pièges'], [4, 'Expert']], st.lv)}</div>
        <button class="big" data-act="new">Nouvelle partie</button>
      </div>
      <p class="soft gRule" style="margin:0 0 12px">Posez les dominos à la suite : deux côtés qui se touchent doivent avoir le même nombre de points. <span data-goal></span> Touchez un domino du bas pour le poser au bout de la suite (il se retourne tout seul). Touchez un domino posé pour le reprendre, avec ceux qui le suivent.</p>
      <div class="chainBox"><div class="chain" aria-label="La suite de dominos"></div></div>
      <div class="domTray" aria-label="Dominos à poser"></div>
      <div class="row" style="margin-top:14px">
        <button class="ghost dark" data-act="hint">Un indice</button>
        <button class="ghost dark" data-act="color" aria-pressed="false">Points en couleur : non</button>
        <span class="gInfo"><span data-count></span> · <span data-time>0 s</span></span>
      </div>
      <div class="gWin hidden"></div>`;
    const chainEl = box.querySelector('.chain'), trayEl = box.querySelector('.domTray'), win = box.querySelector('.gWin');
    function start() {
      const L = DLV[st.lv];
      if (L.v === 6 && st.n > 20) { st.lv = 2; box.querySelectorAll('[data-seg="lv"] button').forEach(x => x.setAttribute('aria-pressed', x.dataset.v === '2')); return start(); }
      sol = makeChain(st.n, L.v).map(([a, b], id) => ({ id, a, b }));
      // pièges : des dominos du même jeu, absents de la solution, qui ressemblent aux bons
      const inSol = new Set(sol.map(d => Math.min(d.a, d.b) + '-' + Math.max(d.a, d.b))), rest = [];
      for (let a = 0; a <= L.v; a++) for (let b = a; b <= L.v; b++) if (!inSol.has(a + '-' + b)) rest.push([a, b]);
      const traps = shuffle(rest).slice(0, L.x).map(([a, b], k) => ({ id: 1000 + k, a, b }));
      tray = shuffle(sol.concat(traps).map(d => (Math.random() < .5 ? { ...d } : { id: d.id, a: d.b, b: d.a })));
      box.querySelector('[data-goal]').innerHTML = L.x ? `<b>Attention : ${L.x} dominos sont des pièges</b> et ne servent pas. Il faut en poser ${st.n}.` : `Il faut poser <b>tous</b> les dominos.`;
      box.classList.toggle('manyDom', tray.length > 22);
      chain = []; done = false; t0 = Date.now(); win.classList.add('hidden');
      render();
    }
    function render() {
      chainEl.innerHTML = chain.length ? chain.map((d, i) => `<button class="dom placed" data-c="${i}" aria-label="Domino posé ${d.a} et ${d.b}">${domSVG(d.a, d.b, st.color)}</button>`).join('') + (chain.length < st.n ? '<span class="domNext" aria-hidden="true">?</span>' : '') : '<span class="domEmpty">Touchez un domino pour commencer la suite</span>';
      trayEl.innerHTML = tray.map(d => `<button class="dom" data-id="${d.id}" aria-label="Domino ${d.a} et ${d.b}">${domSVG(d.a, d.b, st.color)}</button>`).join('');
      box.querySelector('[data-count]').textContent = `${chain.length} / ${st.n} posés`;
    }
    function place(d) {
      const i = tray.findIndex(x => x.id === d.id);
      if (!chain.length) { chain.push(tray.splice(i, 1)[0]); }
      else {
        const end = chain[chain.length - 1].b;
        let piece = null;
        if (d.a === end) piece = { ...d }; else if (d.b === end) piece = { id: d.id, a: d.b, b: d.a };
        else if (chain.length === 1 && (d.a === chain[0].a || d.b === chain[0].a)) { // on retourne le premier domino
          const f = chain[0]; chain[0] = { id: f.id, a: f.b, b: f.a };
          piece = d.a === chain[0].b ? { ...d } : { id: d.id, a: d.b, b: d.a };
        }
        if (!piece) { snd.no?.(); const el = trayEl.querySelector(`[data-id="${d.id}"]`); el?.classList.remove('no'); void el?.offsetWidth; el?.classList.add('no'); return; }
        tray.splice(i, 1); chain.push(piece);
      }
      snd.place?.(); render(); afterPlace();
    }
    function afterPlace() {
      if (chain.length === st.n) {
        done = true; snd.win?.();
        win.innerHTML = `<h2>Bravo, tous les dominos sont posés !</h2><p class="lead">En ${fmt(Date.now() - t0)}.</p><button class="big" data-act="new">Rejouer</button>`;
        win.classList.remove('hidden');
      } else if (!tray.some(x => [x.a, x.b].includes(chain[chain.length - 1].b)) && !(chain.length === 1 && tray.some(x => [x.a, x.b].includes(chain[0].a)))) {
        box.dispatchEvent(new CustomEvent('stuck'));
      }
    }
    function takeBack(i) { const back = chain.splice(i); tray.push(...back); snd.place?.(); render(); }
    function hint() {
      // garde le début de la suite qui correspond à la solution, puis pose le domino suivant
      const fwd = sol, rev = sol.slice().reverse().map(d => ({ id: d.id, a: d.b, b: d.a }));
      const same = (x, y) => x.id === y.id && x.a === y.a && x.b === y.b;
      const pre = s => { let k = 0; while (k < chain.length && same(chain[k], s[k])) k++; return k; };
      const s = pre(fwd) >= pre(rev) ? fwd : rev, k = pre(s);
      if (k < chain.length) takeBack(k);
      const next = s[k]; const j = tray.findIndex(x => x.id === next.id); tray.splice(j, 1); chain.push(next);
      render(); toast(k < chain.length - 1 ? 'J’ai repris quelques dominos et posé le bon' : 'Voici le domino suivant');
      afterPlace();
    }
    const toast = t => snd.toast?.(t);
    box.addEventListener('stuck', () => toast('Plus aucun domino ne va au bout : touchez un domino posé pour le reprendre'));
    box.addEventListener('click', e => {
      const bt = e.target.closest('button'); if (!bt) return;
      if (bt.dataset.c !== undefined) { if (!done) takeBack(+bt.dataset.c); return; }
      if (bt.dataset.id !== undefined) { if (!done) place(tray.find(x => x.id === +bt.dataset.id)); return; }
      const sg = bt.closest('[data-seg]');
      if (sg) { st[sg.dataset.seg] = +bt.dataset.v; sg.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === bt)); return start(); }
      if (bt.dataset.act === 'new') start();
      if (bt.dataset.act === 'hint' && !done) hint();
      if (bt.dataset.act === 'color') { st.color = !st.color; bt.setAttribute('aria-pressed', st.color); bt.textContent = 'Points en couleur : ' + (st.color ? 'oui' : 'non'); render(); }
    });
    timer = setInterval(() => { if (!done && sol) { const el = box.querySelector('[data-time]'); if (el) el.textContent = fmt(Date.now() - t0); } }, 1000);
    start();
    return { destroy() { clearInterval(timer); } };
  }

  root.Games = { mountSudoku, mountTaquin, mountDomino, makeSudoku, makeChain };
})(this);
