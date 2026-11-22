// Curling — écran animateur et écran joueur
(() => {
  const { THEMES, LEVELS, CATEGORIES, TEXTS, TEXT_LEVELS, CALC_LEVELS, calcRound, calcCheck, recLevels, recipeRound, frags } = window.PAP;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const socket = io();
  Puzzle.preloadPhotos(THEMES, () => { try { if (S && role === 'host') renderHost(null); } catch (_) {} });
  let role = null, S = null, me = null, joinInfo = null, deadline = null, puzzle = null, puzzleKey = '', snd = true, ac = null;

  // ---------- son ----------
  function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.(); } catch (_) {} }
  function tone(f, d, type = 'sine', delay = 0, vol = .15) {
    if (!snd || !ac) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay;
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
  }
  const sPlace = () => { tone(660, .12); tone(990, .15, 'sine', .07, .1); };
  const sNo = () => tone(200, .18, 'triangle', 0, .12);
  const sWin = () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .3, 'triangle', i * .12, .14));
  function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), 2400); }

  // ---------- navigation ----------
  function view(id) { ['home', 'host', 'pl'].forEach(v => $(v).classList.toggle('hidden', v !== id)); }
  function sub(parent, id) { $(parent).querySelectorAll(':scope > .sub').forEach(s => s.classList.toggle('hidden', s.id !== id)); }
  const medal = i => `<span class="medal ${i < 3 ? 'm' + (i + 1) : ''}">${i + 1}</span>`;
  const ranking = () => [...S.players].sort((a, b) => b.pts - a.pts);
  // un joueur qui a créé la partie peut aussi la piloter (partie à distance, sans télé)
  const myHost = () => { const h = store.get('pap_host'); return h && S && h.code === S.code ? h : null; };
  const hostEmit = (ev, d = {}) => socket.emit(ev, { ...d, hostKey: myHost()?.hostKey });
  const isLocalAddr = () => /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(location.hostname);
  async function invite(code) {
    const url = `${location.origin}/?code=${code}`, text = `Viens jouer avec moi à Curling ! Ouvre ce lien, ou tape le code ${code} sur le site.`;
    if (isLocalAddr()) { toast('Le jeu tourne sur cet ordinateur : il n\u2019est joignable que sur ce Wi-Fi. Pour inviter de loin, utilisez la version en ligne.'); return; }
    try { if (navigator.share) { await navigator.share({ title: 'Curling', text, url }); return; } } catch (_) { return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Invitation copiée : collez-la dans un SMS, un e-mail ou WhatsApp'); }
    catch (_) { toast(`Envoyez ce lien : ${url}`); }
  }
  let lastTot = 0;
  const progRows = () => { const tot = lastTot; return [...S.players].sort((a, b) => (b.done - a.done) || (b.progress - a.progress)).map(p => `<div class="prow${p.done ? ' done' : ''}"><span class="nm">${esc(p.name)}</span><span class="st">${p.done ? 'Terminé !' : p.progress + (tot ? ' / ' + tot : '')}</span><div class="bar"><i style="width:${p.done ? 100 : tot ? p.progress / tot * 100 : 0}%"></i></div></div>`).join(''); };
  const resRows = () => (S.results || []).map((r, i) => `<li>${r.done ? medal(i) : '<span class="medal">–</span>'}<span style="flex:1">${esc(r.name)}</span><b>${r.done ? '+' + pts(r.gain) : 'pas fini'}</b></li>`).join('');
  const pts = n => `${n} point${n > 1 ? 's' : ''}`;
  const isTextS = () => THEMES[S.theme].kind === 'text';
  const itemsList = () => (S.items || []).map(i => TEXTS[i]);
  const curItem = () => TEXTS[S.items[S.round]];
  const isCalcS = () => THEMES[S.theme].kind === 'calc';
  const isRecS = () => THEMES[S.theme].kind === 'recipe';
  const curRecipe = () => recipeRound(THEMES[S.theme].bank, S.items[S.round], S.level, S.seed);
  const recRounds = () => Array.from({ length: S.rounds }, (_, i) => S.seeds && S.seeds[i] && S.items ? recipeRound(THEMES[S.theme].bank, S.items[i], S.level, S.seeds[i]) : null);
  const curRound = () => calcRound(S.level, S.seed);
  const calcRounds = () => Array.from({ length: S.rounds }, (_, i) => S.seeds && S.seeds[i] ? calcRound(S.level, S.seeds[i]) : null);
  const sceneFor = upto => isRecS() ? Puzzle.cookbook(recRounds(), upto, (THEMES[S.theme].unit || 'Recette') + ' à découvrir…') : isTextS() ? Puzzle.carnet(itemsList(), upto) : isCalcS() ? Puzzle.calcBoard(calcRounds(), upto) : Puzzle.scene(THEMES[S.theme], upto);
  const objFor = () => isRecS() ? Puzzle.recipeCard(curRecipe()) : isTextS() ? Puzzle.quoteHTML(curItem()) : isCalcS() ? `<p class="soft" style="margin:0">Une solution :</p>${Puzzle.eqHTML(curRound())}` : `<div class="objImg">${Puzzle.full(THEMES[S.theme].objects[S.round], LEVELS[S.level].style)}</div>`;

  // ---------- accueil ----------
  const params = new URLSearchParams(location.search);
  if (params.get('code')) $('jCode').value = params.get('code').toUpperCase().slice(0, 4);
  $('jName').value = store.get('pap_name') || '';
  $('jCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });
  $('joinForm').addEventListener('submit', e => {
    e.preventDefault(); audio();
    join($('jCode').value, $('jName').value.trim());
  });
  $('createBtn').addEventListener('click', () => {
    audio();
    socket.emit('host:create', {}, r => { if (!r?.ok) return toast('Impossible de créer la partie'); store.set('pap_host', { code: r.code, hostKey: r.hostKey }); role = 'host'; hostSetup(r.code); });
  });

  function join(code, name) {
    $('jErr').textContent = '';
    if (!name) { $('jErr').textContent = 'Indiquez votre prénom.'; return; }
    const pid = store.get('pap_pid') || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
    socket.emit('player:join', { code, name, pid }, r => {
      if (!r?.ok) { $('jErr').textContent = r?.error || 'Connexion impossible.'; if (role === 'player') { role = null; view('home'); } return; }
      store.set('pap_pid', r.pid); store.set('pap_name', name); store.set('pap_player', { code: r.code, name });
      role = 'player'; joinInfo = r; me = r.pid; view('pl'); wake();
      history.replaceState(null, '', '?code=' + r.code);
    });
  }

  // reconnexion automatique (réseau coupé, page rechargée, téléphone en veille)
  socket.on('connect', () => {
    if (role === 'host' || (!role && !params.get('code') && store.get('pap_host') && params.get('host') === '1')) {
      const h = store.get('pap_host'); if (!h) return;
      socket.emit('host:resume', h, r => { if (r?.ok) { role = 'host'; hostSetup(r.code); } else if (role === 'host') { toast('La partie a expiré'); store.del('pap_host'); role = null; view('home'); } });
    } else {
      const p = store.get('pap_player');
      if (p && (role === 'player' || (params.get('code') || '').toUpperCase() === p.code)) join(p.code, p.name);
    }
  });
  socket.on('disconnect', () => { if (role) toast('Connexion perdue… reconnexion en cours'); });
  socket.on('kicked', () => { role = null; store.del('pap_player'); view('home'); toast('Vous avez été retiré de la partie'); });

  let wakeLock = null;
  async function wake() { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch (_) {} }
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (role === 'player') wake();
    // au retour (écran rallumé, autre appli…), on refait une connexion neuve pour récupérer l'état exact
    if (role && Date.now() - hiddenAt > 3000) { if (socket.connected) socket.disconnect(); socket.connect(); }
  });
  window.addEventListener('pageshow', e => { if (e.persisted && role) { if (socket.connected) socket.disconnect(); socket.connect(); } });

  // ---------- état reçu du serveur ----------
  socket.on('state', st => {
    const prev = S; S = st;
    deadline = st.remain !== null ? Date.now() + st.remain : null;
    if (role === 'host') renderHost(prev);
    else if (role === 'player') renderPlayer(prev);
  });
  setInterval(() => {
    if (!S || !deadline) return;
    const s = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    document.querySelectorAll('[data-count]').forEach(e => { e.textContent = s; });
  }, 250);

  // =================== ANIMATEUR ===================
  function hostSetup(code) {
    view('host');
    history.replaceState(null, '', '?host=1');
    const show = origin => {
      const url = `${origin}/?code=${code}`;
      $('hQr').src = '/qr.svg?t=' + encodeURIComponent(url);
      $('hUrl').textContent = url.replace(/^https?:\/\//, '');
    };
    $('hBigCode').textContent = code; $('hCode').textContent = 'Code ' + code;
    show(location.origin);
    // ouvert en « localhost » : le QR code doit donner l'adresse de l'ordinateur sur le Wi-Fi
    if (/^(localhost|127\.|\[::1\])/.test(location.hostname)) {
      fetch('/info').then(r => r.json()).then(i => { if (i.lan && i.lan[0]) show(`http://${i.lan[0]}:${location.port || i.port}`); }).catch(() => {});
    }
  }
  $('hSnd').addEventListener('click', () => { snd = !snd; $('hSnd').setAttribute('aria-pressed', snd); $('hSnd').textContent = 'Son : ' + (snd ? 'oui' : 'non'); });
  $('hThemes').addEventListener('click', e => { const b = e.target.closest('.th'); if (b) socket.emit('host:settings', { theme: b.dataset.t }); });
  $('hLevels').addEventListener('click', e => { const b = e.target.closest('.lv'); if (b) socket.emit('host:settings', { level: +b.dataset.l }); });
  $('hPlayers').addEventListener('click', e => { const b = e.target.closest('button[data-pid]'); if (b) socket.emit('host:kick', { pid: b.dataset.pid }); });
  $('hStart').addEventListener('click', () => { audio(); socket.emit('host:start'); });
  $('hInvite').addEventListener('click', () => S && invite(S.code));
  $('hMyName').value = store.get('pap_name') || '';
  $('hPlayToo').addEventListener('click', () => {
    const name = $('hMyName').value.trim(); if (!name) { toast('Indiquez votre prénom'); $('hMyName').focus(); return; }
    audio(); join(S.code, name);
  });
  $('hStop').addEventListener('click', () => socket.emit('host:next'));
  $('hNext').addEventListener('click', () => socket.emit('host:next'));
  $('hReveal').addEventListener('click', () => socket.emit('host:next'));
  $('hAgain').addEventListener('click', () => socket.emit('host:start'));
  $('hBack').addEventListener('click', () => socket.emit('host:lobby'));
  $('hAbort').addEventListener('click', () => socket.emit('host:lobby'));
  { const b = $('hAbortTop'), L = b.textContent; let t = null; b.addEventListener('click', () => { if (!t) { b.textContent = 'Toucher encore pour arrêter'; t = setTimeout(() => { t = null; b.textContent = L; }, 3500); return; } clearTimeout(t); t = null; b.textContent = L; socket.emit('host:lobby'); }); }

  function renderHost(prev) {
    const th = THEMES[S.theme], lv = LEVELS[S.level];
    $('hRound').textContent = ['playing', 'roundEnd'].includes(S.state) ? `${({ text: 'Phrase', calc: 'Calcul', recipe: th.unit || 'Recette' })[th.kind] || 'Objet'} ${S.round + 1} sur ${S.rounds}` : '';
    $('hModelCap').textContent = th.kind === 'text' ? 'L\u2019indice' : th.kind === 'calc' ? 'Les pièces de chaque joueur' : th.kind === 'recipe' ? 'Les éléments proposés' : 'Le modèle à reconstituer';
    $('hFinalT').textContent = th.kind === 'text' ? 'Toutes les phrases sont réunies !' : th.kind === 'calc' ? 'Tous les calculs sont faits !' : th.kind === 'recipe' ? (th.book || 'Le livre de recettes est complet !') : 'Tous les objets sont réunis !';
    const online = S.players.filter(p => p.connected);

    if (S.state === 'lobby') {
      sub('host', 'hLobby');
      const themeBtn = ([k, t]) => `<button class="th" data-t="${k}" aria-pressed="${k === S.theme}">${t.kind === 'text' ? Puzzle.textPreview() : t.kind === 'calc' ? Puzzle.calcPreview() : t.kind === 'recipe' ? Puzzle.recipePreview(k) : Puzzle.full(t.objects[0])}<b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`;
      $('hThemes').innerHTML = CATEGORIES.map(c => `<div class="catHead">${esc(c.name)}</div>` + Object.entries(THEMES).filter(([, t]) => t.cat === c.id).map(themeBtn).join('') + (c.soon ? `<div class="th soon"><b>${esc(c.name)}</b><span>${esc(c.soon)}</span></div>` : '')).join('');
      $('hLevels').innerHTML = Object.entries(LEVELS).map(([k, l]) => th.kind
        ? `<button class="lv txt" data-l="${k}" aria-pressed="${+k === S.level}"><b>${l.name}</b><span>${(th.kind === 'recipe' ? recLevels(th.bank) : ({ calc: CALC_LEVELS, text: TEXT_LEVELS })[th.kind])[k]}</span></button>`
        : `<button class="lv" data-l="${k}" aria-pressed="${+k === S.level}">${Puzzle.gridPreview(th.objects[0], l)}<b>${l.name}</b><span>${th.objects[0].photo ? l.desc.split(',')[0] : l.desc}</span></button>`).join('');
      $('hCount').textContent = S.players.length;
      $('hPlayers').innerHTML = S.players.map(p => `<span class="chip${p.connected ? '' : ' off'}">${esc(p.name)}<button data-pid="${esc(p.pid)}" aria-label="Retirer ${esc(p.name)}">×</button></span>`).join('') || '<span class="soft">En attente des joueurs…</span>';
      $('hStart').disabled = !online.length;
      $('hStart').textContent = online.length ? `Lancer la partie (${online.length} joueur${online.length > 1 ? 's' : ''})` : 'Lancer la partie';
      return;
    }
    if (S.state === 'playing') {
      sub('host', 'hPlay');
      if (!prev || prev.state !== 'playing' || prev.round !== S.round || prev.seed !== S.seed) {
        if (isTextS()) {
          const it = curItem(), n = frags(it, S.level).length;
          $('hObjName').textContent = `Phrase ${S.round + 1}`;
          $('hModel').innerHTML = `<div class="clue"><b>${it.a ? 'Une citation de ' + esc(it.a) : 'Un proverbe'}</b><span>${n} morceaux à remettre dans l\u2019ordre</span></div>`;
        } else if (isRecS()) {
          const rd = curRecipe();
          $('hObjName').textContent = rd.name;
          $('hModel').innerHTML = `<div class="clue"><b>Trouvez les ${rd.need} bons éléments</b>${Puzzle.recipeTilesHTML(rd)}</div>`;
        } else if (isCalcS()) {
          $('hObjName').textContent = `Calcul ${S.round + 1}`;
          $('hModel').innerHTML = `<div class="clue"><b>Trouvez un calcul juste</b>${Puzzle.tilesHTML(curRound())}</div>`;
        } else { const obj = th.objects[S.round]; $('hObjName').textContent = obj.name; $('hModel').innerHTML = Puzzle.full(obj, lv.style); }
      }
      const tot = isRecS() ? curRecipe().need : isTextS() ? frags(curItem(), S.level).length : isCalcS() ? curRound().slots.length : lv.n ** 2;
      const rows = [...S.players].sort((a, b) => (b.done - a.done) || (b.progress - a.progress));
      $('hProg').innerHTML = rows.map(p => `<div class="prow${p.done ? ' done' : ''}"><span class="nm">${esc(p.name)}${p.connected ? '' : ' <small class="soft">(déconnecté)</small>'}</span><span class="st">${p.done ? 'Terminé !' : `${p.progress} / ${tot}`}</span><div class="bar"><i style="width:${p.progress / tot * 100}%"></i></div></div>`).join('');
      const first = S.players.find(p => p.done);
      $('hBanner').classList.toggle('hidden', !deadline);
      if (deadline && (!prev || prev.remain === null)) { $('hBanner').innerHTML = `${esc(first ? first.name : 'Quelqu’un')} a terminé en premier ! Encore <span data-count>45</span> secondes pour les autres`; tone(880, .2, 'triangle'); }
      if (first && prev) { const was = prev.players.filter(p => p.done).length, now = S.players.filter(p => p.done).length; if (now > was && was > 0) tone(700, .15); }
      return;
    }
    if (S.state === 'roundEnd') {
      sub('host', 'hEnd');
      if (prev?.state !== 'roundEnd') sWin();
      const winner = S.results?.find(r => r.done);
      $('hEndT').textContent = winner ? `Bravo ${winner.name} !` : 'Manche terminée';
      $('hEndObj').innerHTML = objFor();
      $('hEndRes').innerHTML = (S.results || []).map((r, i) => `<li>${r.done ? medal(i) : '<span class="medal">–</span>'}<span style="flex:1">${esc(r.name)}</span><b>${r.done ? '+' + pts(r.gain) : 'pas fini'}</b></li>`).join('');
      $('hEndScene').innerHTML = sceneFor(S.round + 1);
      $('hNext').textContent = S.round < S.rounds - 1 ? (({ text: 'Phrase suivante', calc: 'Calcul suivant', recipe: (th.unit || 'Recette') + ' suivante' })[th.kind] || 'Objet suivant') : (({ text: 'Voir le carnet complet', calc: 'Voir le tableau complet', recipe: 'Voir le résultat final' })[th.kind] || 'Voir l’image finale');
      return;
    }
    if (S.state === 'final') {
      sub('host', 'hFinal');
      $('hFinalScene').innerHTML = sceneFor(5);
      $('hQ').textContent = S.quiz.q;
      $('hOpts').innerHTML = S.quiz.options.map((o, i) => `<div class="opt">${String.fromCharCode(65 + i)}. ${esc(o)}</div>`).join('');
      $('hAns').textContent = `${S.answers} sur ${online.length}`;
      return;
    }
    if (S.state === 'podium') {
      sub('host', 'hPodium');
      if (prev?.state !== 'podium') sWin();
      $('hGood').textContent = `Bonne réponse : ${S.quiz.options[S.quiz.answer]} (+1 point)`;
      $('hRank').innerHTML = ranking().map((p, i) => `<li>${medal(i)}<span style="flex:1">${esc(p.name)}</span><b>${pts(p.pts)}</b></li>`).join('');
    }
  }

  // =================== JOUEUR ===================
  $('pStart').addEventListener('click', () => { audio(); hostEmit('host:start'); });
  $('pInvite').addEventListener('click', () => S && invite(S.code));
  $('pNext').addEventListener('click', () => hostEmit('host:next'));
  $('pReveal').addEventListener('click', () => hostEmit('host:next'));
  $('pAgain').addEventListener('click', () => hostEmit('host:start'));
  const backToSettings = () => {
    const h = myHost(); if (!h) return;
    socket.emit('player:leave'); store.del('pap_player');
    socket.emit('host:resume', h, r => { if (r?.ok) { role = 'host'; hostSetup(r.code); socket.emit('host:lobby'); } });
  };
  $('pSettings').addEventListener('click', backToSettings);
  // bouton « Quitter » disponible pendant le jeu et sur les écrans de résultats (deux touches pour confirmer)
  const quitPlayer = () => { socket.emit('player:leave'); store.del('pap_player'); role = null; S = null; view('home'); history.replaceState(null, '', location.pathname); };
  document.querySelectorAll('.pExit').forEach(b => {
    const label = b.textContent; let armed = null;
    b.addEventListener('click', () => {
      if (!armed) {
        b.textContent = b.classList.contains('barExit') ? 'Confirmer ✕' : myHost() ? 'Toucher encore : arrêter pour tous' : 'Toucher encore pour quitter';
        armed = setTimeout(() => { armed = null; b.textContent = label; }, 3500);
        return;
      }
      clearTimeout(armed); armed = null; b.textContent = label;
      if (myHost()) backToSettings(); else quitPlayer();
    });
  });
  $('pBack').addEventListener('click', backToSettings);
  $('pQuit').addEventListener('click', () => quitPlayer());
  $('pOpts').addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b || $('pOpts').dataset.done) return;
    $('pOpts').dataset.done = '1'; b.classList.add('chosen');
    socket.emit('player:answer', { i: +b.dataset.i }); $('pAnsDone').classList.remove('hidden'); tone(660, .15);
  });

  function renderPlayer(prev) {
    const mine = S.players.find(p => p.pid === me);
    if (!mine) return;
    const th = THEMES[S.theme], lv = LEVELS[S.level];
    if (S.state !== 'playing' && puzzle) { puzzle.destroy(); puzzle = null; puzzleKey = ''; }

    if (S.state === 'lobby') {
      sub('pl', 'pWait');
      $('pHello').textContent = `Bienvenue ${mine.name} !`;
      $('pWaitL').innerHTML = myHost() ? `Vous organisez la partie <b>${esc(S.code)}</b>. Invitez les autres joueurs, puis lancez la partie quand tout le monde est là.` : `Vous êtes dans la partie <b>${esc(S.code)}</b>. La partie va bientôt commencer.`;
      $('pCtlWait').classList.toggle('hidden', !myHost());
      $('pOthers').innerHTML = S.players.map(p => `<span class="chip">${esc(p.name)}</span>`).join('');
      return;
    }
    if (S.state === 'playing') {
      const text = isTextS(), calc = isCalcS(), rec = isRecS();
      if (mine.done) {
        if (puzzle) { puzzle.destroy(); puzzle = null; }
        sub('pl', 'pDone');
        const rank = S.players.filter(p => p.done).length;
        $('pDoneObj').innerHTML = objFor();
        $('pDoneT').textContent = 'Terminé !';
        const left = S.players.filter(p => !p.done && p.connected).length;
        $('pDoneP').innerHTML = left ? `On attend les autres (${left})… <b><span data-count>45</span> s</b>` : 'Tout le monde a terminé !';
        $('pDoneProg').innerHTML = S.players.length > 1 ? progRows() : '';
        return;
      }
      sub('pl', 'pPlay');
      const key = S.round + ':' + S.seed;
      if (key !== puzzleKey) {
        puzzle?.destroy(); puzzleKey = key;
        const placed = joinInfo && joinInfo.seed === S.seed ? joinInfo.placed : [];
        const onPlace = (list, done) => {
          sPlace(); $('pCount').textContent = `${list.length} / ${puzzle.total}`;
          socket.emit('player:progress', { seed: S.seed, placed: list });
          if (done) sWin();
        };
        $('pPlay').classList.toggle('text', text || calc || rec);
        $('pHint').textContent = rec ? (THEMES[S.theme].bank === 'fromages' ? 'Trouvez 3 choses : le lait, la région, et la famille du fromage (pâte molle, pâte pressée, pâte persillée…).' : 'Mettez dans le panier les 5 bons éléments de la recette.') : calc ? 'Touchez les nombres et les signes pour faire un calcul juste.' : 'Touchez les morceaux dans le bon ordre.';
        if (rec) {
          const rd = curRecipe();
          $('pObj').textContent = rd.name;
          puzzle = Puzzle.mountRecipe($('pLine'), $('pFrags'), { round: rd, onPlace, onWrong(msg) { sNo(); if (msg) toast(msg); } });
        } else if (calc) {
          const rd = curRound();
          $('pObj').textContent = 'Calcul malin';
          puzzle = Puzzle.mountCalc($('pLine'), $('pFrags'), { round: rd, check: vals => calcCheck(rd.slots, vals), onPlace, onWrong(msg) { sNo(); if (msg) toast(msg); } });
        } else if (text) {
          const it = curItem();
          $('pObj').textContent = it.a ? `Citation de ${it.a}` : 'Un proverbe';
          puzzle = Puzzle.mountText($('pLine'), $('pFrags'), { frags: frags(it, S.level), seed: S.seed, placed: placed.length, onPlace, onWrong() { sNo(); } });
        } else {
          const obj = th.objects[S.round];
          $('pObj').textContent = obj.name;
          puzzle = Puzzle.mount($('pBoard'), $('pTray'), {
            obj, lv, seed: S.seed, placed, onPlace,
            onWrong(msg) { sNo(); if (msg) toast(msg); },
            onRotate() { tone(520, .08, 'sine', 0, .08); }
          });
          if (lv.rot) toast('Touchez une pièce pour la tourner, puis glissez-la');
        }
        $('pCount').textContent = `${puzzle.count()} / ${puzzle.total}`; lastTot = puzzle.total;
      }
      return;
    }
    if (S.state === 'roundEnd') {
      sub('pl', 'pEnd');
      const r = S.results?.find(x => x.pid === me), idx = S.results?.filter(x => x.done).findIndex(x => x.pid === me);
      $('pEndL').textContent = !r?.done ? 'Pas fini cette fois-ci…' : idx === 0 ? 'Vous êtes le plus rapide !' : `Vous êtes ${idx + 1}e`;
      $('pGain').textContent = r?.gain ? `+${r.gain}` : 'Pas de point';
      $('pGain').classList.toggle('zero', !r?.gain);
      $('pTotal').textContent = pts(mine.pts);
      const pos = ranking().findIndex(p => p.pid === me) + 1;
      $('pRankNow').textContent = pos === 1 ? 'en tête du classement' : `${pos}e au classement`;
      $('pEndRes').innerHTML = S.players.length > 1 ? resRows() : '';
      const h = myHost(), last = S.round >= S.rounds - 1;
      $('pNext').classList.toggle('hidden', !h); $('pEndNote').classList.toggle('hidden', !!h);
      $('pNext').textContent = last ? 'Voir la fin de la partie' : 'Manche suivante';
      return;
    }
    if (S.state === 'final') {
      sub('pl', 'pFinal');
      if (prev?.state !== 'final') {
        $('pQ').textContent = S.quiz.q;
        const answered = joinInfo?.answer ?? null;
        $('pOpts').dataset.done = answered !== null && prev ? '1' : '';
        $('pOpts').innerHTML = S.quiz.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('');
        $('pAnsDone').classList.add('hidden');
      }
      const h = myHost();
      $('pReveal').classList.toggle('hidden', !h);
      $('pAnsCount').classList.toggle('hidden', !h);
      $('pAnsCount').textContent = `${S.answers} réponse(s) sur ${S.players.filter(p => p.connected).length}`;
      return;
    }
    if (S.state === 'podium') {
      sub('pl', 'pPodium');
      const pos = ranking().findIndex(p => p.pid === me) + 1;
      const good = mine.answer === S.quiz.answer;
      $('pPodT').textContent = pos === 1 ? 'Vous avez gagné !' : `Vous êtes ${pos}e`;
      $('pPodP').innerHTML = `${pts(mine.pts)} au total.<br>Question bonus : ${good ? 'bonne réponse, +1 point !' : `la réponse était « ${esc(S.quiz.options[S.quiz.answer])} ».`}`;
      $('pRank').innerHTML = S.players.length > 1 ? ranking().map((p, i) => `<li>${medal(i)}<span style="flex:1">${esc(p.name)}</span><b>${pts(p.pts)}</b></li>`).join('') : '';
      $('pCtlPod').classList.toggle('hidden', !myHost()); $('pPodNote').classList.toggle('hidden', !!myHost());
    }
  }
})();
