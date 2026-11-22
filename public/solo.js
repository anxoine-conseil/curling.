{
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LEVELS = PAP.LEVELS;
const { TEXTS, TEXT_LEVELS } = PAP;
const THEMES = PAP.THEMES;
if (location.protocol !== 'file:' && !/claude|artifact/.test(location.hostname)) Puzzle.preloadPhotos(THEMES);
const seenTexts = new Set();
const S = { theme: 'maison', level: 4, speed: 'calm', round: 0, players: [], snd: true };
let ac = null, tick = null, puzzle = null, t0 = 0, finished = false, txt = null;

// ---------- son ----------
function tone(f, d, type = 'sine', delay = 0, vol = .15) { if (!S.snd || !ac) return; const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d); }
const sPlace = () => { tone(660, .12); tone(990, .15, 'sine', .07, .1); };
const sNo = () => tone(200, .18, 'triangle', 0, .12);
const sWin = () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .3, 'triangle', i * .12, .14));
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2300); }
$('sndBtn').addEventListener('click', () => { S.snd = !S.snd; $('sndBtn').textContent = 'Son : ' + (S.snd ? 'oui' : 'non'); });

// ---------- outils ----------
const isText = th => th.kind === 'text';
const isCalc = th => th.kind === 'calc';
const isRec = th => th.kind === 'recipe';
const seenRec = {};
const recAt = i => PAP.recipeRound(THEMES[S.theme].bank, S.items[i], S.level, S.seeds[i]);
const recRounds = () => Array.from({ length: 5 }, (_, i) => S.seeds && S.seeds[i] ? recAt(i) : null);
const calcRounds = () => Array.from({ length: 5 }, (_, i) => S.seeds && S.seeds[i] ? PAP.calcRound(S.level, S.seeds[i]) : null);
const quoteHTML = Puzzle.quoteHTML;
const items = () => S.items.map(i => TEXTS[i]);
const scene = (th, upto) => isRec(th) ? Puzzle.cookbook(recRounds(), upto, (th.unit || 'Recette') + ' à découvrir…') : isText(th) ? Puzzle.carnet(items(), upto) : isCalc(th) ? Puzzle.calcBoard(calcRounds(), upto) : Puzzle.scene(th, upto);
const piecesFor = th => isRec(th) ? recAt(S.round).need : isText(th) ? PAP.frags(items()[S.round], S.level).length : isCalc(th) ? PAP.calcRound(S.level, S.seeds[S.round]).slots.length : LEVELS[S.level].n ** 2;
const medal = i => `<span class="medal ${i < 3 ? 'm' + (i + 1) : ''}">${i + 1}</span>`;
const pts = n => `${n} point${n > 1 ? 's' : ''}`;
function show(v) {
  ['home', 'game', 'final', 'cat', 'sdk', 'tq', 'dom'].forEach(s => $(s).classList.toggle('hidden', s !== v));
  mountGame(v);
  $('roundLbl').classList.toggle('hidden', v !== 'game');
  $('tabs').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
  window.scrollTo(0, 0);
}
const snd = { place: () => sPlace(), no: () => sNo(), win: () => sWin(), toast: t => toast(t) };
const mounted = {};
const IMAGES = Object.values(THEMES).filter(t => t.objects).flatMap(t => t.objects.map(o => ({ label: `${o.name} (${t.name})`, svg: o.bg + o.fg })));
function mountGame(v) {
  if (mounted[v]) return;
  if (v === 'sdk') mounted.sdk = Games.mountSudoku($('sdkBox'), snd);
  if (v === 'tq') mounted.tq = Games.mountTaquin($('tqBox'), IMAGES, snd);
  if (v === 'dom') mounted.dom = Games.mountDomino($('domBox'), snd);
}
document.addEventListener('pointerdown', () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} }, { once: true });
if (/solo\.html$/.test(location.pathname)) $('homeLink').classList.remove('hidden');
$('tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; stop(); show(b.dataset.v); });

// ---------- accueil ----------
function renderHome() {
  const th = THEMES[S.theme];
  const themeBtn = ([k, t]) => `<button class="th" data-t="${k}" aria-pressed="${k === S.theme}">${isText(t) ? Puzzle.textPreview() : isCalc(t) ? Puzzle.calcPreview() : isRec(t) ? Puzzle.recipePreview(k) : Puzzle.full(t.objects[0])}<b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`;
  $('themes').innerHTML = PAP.CATEGORIES.map(c => `<div class="catHead">${esc(c.name)}</div>` + Object.entries(THEMES).filter(([, t]) => t.cat === c.id).map(themeBtn).join('') + (c.soon ? `<div class="th soon"><b>${esc(c.name)}</b><span>${esc(c.soon)}</span></div>` : '')).join('');
  $('levels').innerHTML = Object.entries(LEVELS).map(([k, l]) => th.kind
    ? `<button class="lv txt" data-l="${k}" aria-pressed="${+k === S.level}"><b>${l.name}</b><span>${(isCalc(th) ? PAP.CALC_LEVELS : isRec(th) ? PAP.recLevels(th.bank) : TEXT_LEVELS)[k]}</span></button>`
    : `<button class="lv" data-l="${k}" aria-pressed="${+k === S.level}">${Puzzle.gridPreview(th.objects[0], l)}<b>${l.name}</b><span>${l.desc}</span></button>`).join('');
}
$('themes').addEventListener('click', e => { const b = e.target.closest('.th'); if (b) { S.theme = b.dataset.t; renderHome(); } });
$('levels').addEventListener('click', e => { const b = e.target.closest('.lv'); if (b) { S.level = +b.dataset.l; renderHome(); } });
$('speed').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.speed = b.dataset.s; $('speed').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
$('startBtn').addEventListener('click', () => {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
  const name = ($('nm').value.trim() || 'Moi').slice(0, 14);
  S.players = S.speed === 'solo' ? [{ name, pts: 0, me: true }] : [{ name, pts: 0, me: true }, { name: 'Jeannine', pts: 0 }, { name: 'Marcel', pts: 0 }, { name: 'Odette', pts: 0 }];
  S.items = isText(THEMES[S.theme]) ? PAP.pickTexts(S.level, seenTexts, Math.random) : isRec(THEMES[S.theme]) ? PAP.pickRecipes(THEMES[S.theme].bank, (seenRec[THEMES[S.theme].bank] ||= new Set()), Math.random) : [];
  S.seeds = []; S.round = 0; show('game'); startRound();
});
$('quitBtn').addEventListener('click', () => { stop(); show('home'); });
function stop() { clearInterval(tick); puzzle?.destroy(); puzzle = null; $('ov').classList.add('hidden'); }

// ---------- manche ----------
function startRound() {
  const th = THEMES[S.theme], lv = LEVELS[S.level], text = isText(th) || isCalc(th) || isRec(th);
  S.seeds[S.round] = Math.floor(Math.random() * 2 ** 31);
  finished = false; t0 = performance.now(); puzzle?.destroy(); puzzle = null;
  $('imgArea').classList.toggle('hidden', text); $('txtArea').classList.toggle('hidden', !text);
  const label = isRec(th) ? `${th.unit || 'Recette'} ${S.round + 1} sur 5 : ${recAt(S.round).name}` : isCalc(th) ? `Calcul ${S.round + 1} sur 5` : text ? `Phrase ${S.round + 1} sur 5` : `Objet ${S.round + 1} sur 5 : ${th.objects[S.round].name}`;
  $('roundLbl').textContent = label;
  if (isRec(th)) {
    txt = null;
    $('hint').textContent = (th.bank === 'fromages' ? 'Trouvez 3 choses : le lait, la région, et la famille du fromage (pâte molle, pâte pressée, pâte persillée…).' : 'Mettez dans le panier les 5 bons éléments de la recette.') + ' Touchez le panier pour retirer un élément.';
    puzzle = Puzzle.mountRecipe($('line'), $('frags'), { round: recAt(S.round), onPlace(list, done) { sPlace(); S.players[0].prog = list.length; renderPlayers(); if (done) endRound(); }, onWrong(msg) { sNo(); if (msg) toast(msg); } });
  } else if (isCalc(th)) {
    txt = null;
    const rd = PAP.calcRound(S.level, S.seeds[S.round]);
    $('hint').textContent = 'Touchez les nombres et les signes pour faire un calcul juste. Touchez une case pour la vider.';
    puzzle = Puzzle.mountCalc($('line'), $('frags'), { round: rd, check: v => PAP.calcCheck(rd.slots, v), onPlace(list, done) { sPlace(); S.players[0].prog = list.length; renderPlayers(); if (done) endRound(); }, onWrong(msg) { sNo(); if (msg) toast(msg); } });
  } else if (text) {
    const item = items()[S.round], frags = PAP.frags(item, S.level);
    txt = { frags, next: 0 };
    $('hint').textContent = 'Touchez les morceaux dans le bon ordre pour reconstituer la phrase.';
    $('line').innerHTML = frags.map((f, i) => `<span class="slot" data-i="${i}" style="width:${Math.max(2, f.length * .55)}em"></span>`).join('');
    const order = frags.map((f, i) => i).sort(() => Math.random() - .5);
    $('frags').innerHTML = order.map(i => `<button class="frag" data-i="${i}">${esc(frags[i])}</button>`).join('');
    markNext();
  } else {
    const obj = th.objects[S.round];
    $('hint').textContent = lv.rot ? `Reconstituez ${obj.name.toLowerCase()} : touchez une pièce pour la tourner, puis glissez-la à sa place.` : `Reconstituez ${obj.name.toLowerCase()} : glissez chaque pièce à sa place, ou touchez la pièce puis sa case.`;
    $('imgArea').classList.toggle('jig', !!lv.jig);
    puzzle = Puzzle.mount($('board'), $('tray'), {
      obj, lv, seed: Math.floor(Math.random() * 2 ** 31),
      onPlace(list, done) { sPlace(); S.players[0].prog = list.length; renderPlayers(); if (done) endRound(); },
      onWrong(msg) { sNo(); if (msg) toast(msg); },
      onRotate() { tone(520, .08, 'sine', 0, .08); }
    });
  }
  const tot = piecesFor(th), k = text ? 1.1 : lv.rot ? 1.8 : lv.jig ? 1.3 : 1, [a, z] = S.speed === 'calm' ? [3.2, 6] : [1.6, 3.2];
  S.players.forEach(p => { p.done = false; p.prog = 0; p.tot = tot; if (!p.me) p.finishAt = t0 + tot * k * (a + Math.random() * (z - a)) * 1000; });
  renderPlayers(); $('sceneBox').innerHTML = scene(th, S.round);
  clearInterval(tick); tick = setInterval(botTick, 250);
}
function markNext() { $('line').querySelectorAll('.slot').forEach(s => s.classList.toggle('next', +s.dataset.i === txt.next)); }
$('frags').addEventListener('click', e => {
  const b = e.target.closest('.frag'); if (!b || finished || !txt) return;
  if (b.textContent === txt.frags[txt.next]) {
    const slot = $('line').querySelector(`.slot[data-i="${txt.next}"]`);
    slot.textContent = b.textContent; slot.classList.add('full'); slot.style.width = ''; b.remove();
    txt.next++; sPlace(); markNext(); S.players[0].prog = txt.next; renderPlayers();
    if (txt.next === txt.frags.length) endRound();
  } else { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); sNo(); }
});
function botTick() {
  const now = performance.now();
  S.players.forEach(p => { if (p.me || p.done) return; p.prog = Math.min(p.tot, Math.floor((now - t0) / (p.finishAt - t0) * p.tot)); if (p.prog >= p.tot) { p.done = true; p.doneT = now; toast(`${p.name} a terminé !`); } });
  renderPlayers();
}
function renderPlayers() {
  $('players').innerHTML = S.players.map(p => `<div class="pl${p.me ? ' me' : ''}"><div><div class="nm">${esc(p.name)}</div><div class="lvl">${p.prog || 0} / ${p.tot || 0}</div></div><div class="pt">${pts(p.pts)}</div><div class="bar"><i style="width:${(p.prog || 0) / (p.tot || 1) * 100}%"></i></div></div>`).join('');
}
function endRound() {
  if (finished) return; finished = true; clearInterval(tick);
  const th = THEMES[S.theme], now = performance.now();
  const order = S.players.map(p => ({ p, t: p.me ? now : (p.done ? p.doneT : p.finishAt) })).sort((a, b) => a.t - b.t);
  order.forEach((r, i) => { r.gain = i === 0 ? 3 : 1; r.p.pts += r.gain; });
  sWin();
  const solo = S.players.length === 1, secs = Math.round((now - t0) / 1000);
  $('ovT').textContent = solo ? `Bravo ${S.players[0].name} ! Terminé en ${secs >= 60 ? Math.floor(secs / 60) + ' min ' : ''}${secs % 60} s` : order[0].p.me ? `Bravo ${S.players[0].name} !` : 'Bien joué !';
  $('ovObj').innerHTML = isRec(th) ? Puzzle.recipeCard(recAt(S.round)) : isCalc(th) ? '<p class="soft" style="margin:0">Une solution :</p>' + Puzzle.eqHTML(PAP.calcRound(S.level, S.seeds[S.round])) : isText(th) ? quoteHTML(items()[S.round]) : `<div class="objImg">${Puzzle.full(th.objects[S.round], LEVELS[S.level].style)}</div>`;
  $('ovRes').innerHTML = solo ? '' : order.map((r, i) => `<li>${medal(i)}<span style="flex:1">${esc(r.p.name)}</span><b>+${pts(r.gain)}</b></li>`).join('');
  $('nextBtn').textContent = S.round < 4 ? (isRec(th) ? (th.unit || 'Recette') + ' suivante' : isCalc(th) ? 'Calcul suivant' : isText(th) ? 'Phrase suivante' : 'Objet suivant') : 'Voir la fin de la partie';
  $('sceneBox').innerHTML = scene(th, S.round + 1); renderPlayers();
  setTimeout(() => $('ov').classList.remove('hidden'), 450);
}
$('nextBtn').addEventListener('click', () => { $('ov').classList.add('hidden'); if (S.round < 4) { S.round++; startRound(); } else finale(); });

// ---------- finale ----------
function finale() {
  puzzle?.destroy(); puzzle = null;
  const th = THEMES[S.theme]; show('final');
  S.quiz = isText(th) ? PAP.textQuiz(S.items, Math.random) : isCalc(th) ? PAP.calcQuiz(S.level, S.seeds, Math.random) : isRec(th) ? PAP.recipeQuiz(th.bank, S.items, Math.random) : th.quiz;
  $('finalScene').innerHTML = scene(th, 5);
  $('quiz').classList.remove('hidden'); $('podium').classList.add('hidden'); $('qs').dataset.done = '';
  $('qText').textContent = 'Question bonus : ' + S.quiz.q;
  $('qs').innerHTML = S.quiz.options.map((o, i) => `<button data-i="${i}">${esc(o)}</button>`).join('');
}
$('qs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || $('qs').dataset.done) return; $('qs').dataset.done = '1';
  const th = S, ok = +b.dataset.i === th.quiz.answer;
  b.classList.add(ok ? 'ok' : 'ko'); $('qs').querySelector(`[data-i="${th.quiz.answer}"]`).classList.add('ok');
  if (ok) { S.players[0].pts += 1; sWin(); toast('Bonne réponse : +1 point bonus !'); } else { sNo(); toast(`La réponse était : ${th.quiz.options[th.quiz.answer]}`); }
  const rank = [...S.players].sort((a, b) => b.pts - a.pts);
  $('finalRes').innerHTML = rank.map((p, i) => `<li>${medal(i)}<span style="flex:1">${esc(p.name)}</span><b>${pts(p.pts)}</b></li>`).join('');
  setTimeout(() => $('podium').classList.remove('hidden'), 700);
});
$('againBtn').addEventListener('click', () => show('home'));

// ---------- catalogue ----------
$('styleDemo').innerHTML = [['bold', 'Niveaux 1 et 2 : dessin simple'], ['bd', 'Niveaux 3 et 4 : dessin détaillé'], ['real', 'Niveaux 5 et 6 : photo']].map(([st, l]) => `<figure>${Puzzle.full(THEMES.maison.objects[0], st)}${l}</figure>`).join('');
const groups = [[1, 'Phrases courtes (niveaux 1 et 2)'], [2, 'Phrases moyennes (niveaux 3 et 4)'], [3, 'Phrases longues (niveaux 5 et 6)']];
$('catList').innerHTML = PAP.CATEGORIES.filter(c => !c.soon).flatMap(c => Object.values(THEMES).filter(t => t.cat === c.id)).map(th => isRec(th)
  ? `<div class="card catTheme"><h2>${esc(th.name)}</h2><p class="soft" style="margin:0">${PAP.BANKS[th.bank].length} ${th.bank === 'fromages' ? 'fromages' : 'recettes'} pour commencer. Chaque partie en tire 5, sans reprendre les précédents. Les intrus sont drôles aux premiers niveaux, puis de vrais pièges aux niveaux plus difficiles.</p><div class="quotes">${PAP.BANKS[th.bank].map(r => `<div>${Puzzle.recipeCard({ name: r.name, ok: r.ok })}<p class="soft" style="margin:0 6px"><b>Intrus :</b> ${esc(r.easy.join(', '))}. <b>Pièges :</b> ${esc(r.hard.join(', '))}.</p></div>`).join('')}</div></div>`
  : isCalc(th)
  ? `<div class="card catTheme"><h2>${esc(th.name)}</h2><p class="soft" style="margin:0">Les calculs sont fabriqués au hasard à chaque partie : il y en a des milliers. Tous les joueurs reçoivent les mêmes pièces. Plusieurs réponses peuvent être justes.</p><div class="quotes">${[1, 2, 3, 4, 5, 6].map(l => { const r = PAP.calcRound(l, 1000 + l * 7); return `<div class="quote"><b>Niveau ${l}</b> · <span class="soft">${esc(PAP.CALC_LEVELS[l])}</span>${Puzzle.tilesHTML(r)}<p style="margin:10px 0 0;text-align:center">${esc(r.text)}</p></div>`; }).join('')}</div></div>`
  : isText(th)
  ? `<div class="card catTheme"><h2>${esc(th.name)}</h2><p class="soft" style="margin:0">${TEXTS.length} phrases pour commencer : chaque partie en tire 5 au hasard, sans reprendre celles déjà jouées. La question bonus change à chaque fois.</p>${groups.map(([d, label]) => `<h3>${label}</h3><div class="quotes">${TEXTS.filter(x => PAP.diffOf(x) === d).map(quoteHTML).join('')}</div>`).join('')}</div>`
  : `<div class="card catTheme"><h2>${esc(th.name)}</h2><p class="soft" style="margin:0">${esc(th.desc)}</p><div class="objs">${th.objects.map(o => `<figure>${Puzzle.full(o)}${esc(o.name)}</figure>`).join('')}</div><div class="catFoot"><div>${Puzzle.scene(th, 5)}</div><div><h3 style="margin-top:0">L'image finale</h3><p class="soft" style="margin:0">Après les 5 objets, ils se rassemblent dans cette scène.</p><p style="margin:8px 0 0"><b>Question bonus :</b> ${esc(th.quiz.q)} <span class="soft">Réponse : ${esc(th.quiz.options[th.quiz.answer])}</span></p></div></div></div>`).join('');

renderHome();

// ouvrir directement un jeu depuis l'accueil (solo.html#dom, #sdk, #tq, #cat)
const startView = location.hash.slice(1);
if (['sdk', 'tq', 'dom', 'cat'].includes(startView)) show(startView);
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (['home', 'sdk', 'tq', 'dom', 'cat'].includes(v)) { stop(); show(v); } });
}
