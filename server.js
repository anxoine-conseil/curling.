// Curling : serveur de jeu (Express + Socket.IO)
const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const QRCode = require('qrcode');
const { Server } = require('socket.io');
const { THEMES, LEVELS, TEXTS, frags, pickTexts, textQuiz, calcRound, calcQuiz, pickRecipes, recipeQuiz, recipeRound } = require('./public/themes.js');

const ROUNDS = 5;               // objets par partie
const GRACE_MS = 45000;         // temps laissé aux autres après le premier qui termine
const MAX_PLAYERS = 60;
const ROOM_TTL_MS = 3 * 3600e3; // une salle inactive disparaît après 3 h

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 8000 });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_q, r) => r.send('ok'));
// adresses de l'ordinateur sur le Wi-Fi (pour le QR code quand l'animateur ouvre « localhost »)
const lanAddresses = () => Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
app.get('/info', (_q, r) => r.json({ lan: lanAddresses(), port: Number(process.env.PORT || 3000) }));
app.get('/qr.svg', async (req, res) => {
  try {
    const svg = await QRCode.toString(String(req.query.t || '').slice(0, 300), { type: 'svg', margin: 1, color: { dark: '#1f2433', light: '#ffffff' } });
    res.type('image/svg+xml').send(svg);
  } catch { res.status(400).end(); }
});

const rooms = new Map();
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => LETTERS[crypto.randomInt(LETTERS.length)]).join(''); } while (rooms.has(c));
  return c;
}
const isText = room => THEMES[room.theme].kind === 'text';
const isCalc = room => THEMES[room.theme].kind === 'calc';
const isRecipe = room => THEMES[room.theme].kind === 'recipe';
const total = room => isText(room) ? frags(TEXTS[room.items[room.round]], room.level).length : isCalc(room) ? calcRound(room.level, room.seed).slots.length : isRecipe(room) ? recipeRound(THEMES[room.theme].bank, room.items[room.round], room.level, room.seed).need : LEVELS[room.level].n ** 2;
const touch = room => { room.seen = Date.now(); };

function publicState(room) {
  const now = Date.now();
  return {
    code: room.code, state: room.state, theme: room.theme, level: room.level,
    round: room.round, rounds: ROUNDS, seed: room.seed,
    remain: room.deadline ? Math.max(0, room.deadline - now) : null,
    items: isText(room) || isRecipe(room) ? room.items : null,
    seeds: isCalc(room) || isRecipe(room) ? room.seeds : null,
    quiz: ['final', 'podium'].includes(room.state) && room.quiz ? { q: room.quiz.q, options: room.quiz.options, answer: room.state === 'podium' ? room.quiz.answer : null } : null,
    results: room.results, answers: [...room.players.values()].filter(p => p.answer !== null).length,
    players: [...room.players.values()].map(p => ({
      pid: p.pid, name: p.name, pts: p.pts, connected: p.connected,
      progress: p.placed.size, done: p.doneAt !== null, answer: room.state === 'podium' ? p.answer : null
    }))
  };
}
function broadcast(room) { touch(room); io.to(room.code).emit('state', publicState(room)); }

function startRound(room) {
  clearTimeout(room.timer);
  room.state = 'playing';
  room.seed = crypto.randomInt(1, 2 ** 31);
  room.seeds[room.round] = room.seed;
  room.deadline = null; room.results = null;
  for (const p of room.players.values()) { p.placed = new Set(); p.doneAt = null; }
  broadcast(room);
}

function endRound(room) {
  if (room.state !== 'playing') return;
  clearTimeout(room.timer);
  const finishers = [...room.players.values()].filter(p => p.doneAt !== null).sort((a, b) => a.doneAt - b.doneAt);
  const others = [...room.players.values()].filter(p => p.doneAt === null).sort((a, b) => b.placed.size - a.placed.size);
  room.results = [
    ...finishers.map((p, i) => { const gain = i === 0 ? 3 : 1; p.pts += gain; return { pid: p.pid, name: p.name, gain, done: true }; }),
    ...others.map(p => ({ pid: p.pid, name: p.name, gain: 0, done: false, progress: p.placed.size }))
  ];
  room.state = 'roundEnd'; room.deadline = null;
  broadcast(room);
}

function checkAllDone(room) {
  const active = [...room.players.values()].filter(p => p.connected);
  if (active.length && active.every(p => p.doneAt !== null)) endRound(room);
}

io.on('connection', socket => {
  const room = () => rooms.get(socket.data.code);
  // l'animateur : l'écran « télé », ou un joueur qui connaît la clé de la partie (partie à distance)
  const isHost = d => { const r = room(); return r && (socket.data.role === 'host' || (d && d.hostKey && d.hostKey === r.hostKey)) ? r : null; };

  socket.on('host:create', (_d, ack) => {
    const code = newCode();
    const r = { code, hostKey: crypto.randomBytes(12).toString('hex'), players: new Map(), state: 'lobby', theme: 'maison', level: 4, items: [], seeds: [], textSeen: new Set(), recipeSeen: {}, quiz: null, round: 0, seed: 0, results: null, deadline: null, timer: null, seen: Date.now() };
    rooms.set(code, r);
    socket.data = { code, role: 'host' }; socket.join(code);
    ack?.({ ok: true, code, hostKey: r.hostKey });
    broadcast(r);
  });

  socket.on('host:resume', (d, ack) => {
    const r = rooms.get(String(d?.code || '').toUpperCase());
    if (!r || r.hostKey !== d?.hostKey) return ack?.({ ok: false });
    socket.data = { code: r.code, role: 'host' }; socket.join(r.code);
    ack?.({ ok: true, code: r.code, hostKey: r.hostKey });
    socket.emit('state', publicState(r));
  });

  socket.on('host:settings', d => {
    const r = isHost(d); if (!r || r.state !== 'lobby') return;
    if (THEMES[d?.theme]) r.theme = d.theme;
    if (LEVELS[d?.level]) r.level = +d.level;
    broadcast(r);
  });

  socket.on('host:start', d => {
    const r = isHost(d); if (!r || !['lobby', 'podium'].includes(r.state)) return;
    for (const p of r.players.values()) { p.pts = 0; p.answer = null; }
    r.items = isText(r) ? pickTexts(r.level, r.textSeen, Math.random) : isRecipe(r) ? pickRecipes(THEMES[r.theme].bank, (r.recipeSeen[THEMES[r.theme].bank] ||= new Set()), Math.random) : [];
    r.quiz = null; r.seeds = []; r.round = 0; startRound(r);
  });

  socket.on('host:next', d => {
    const r = isHost(d); if (!r) return;
    if (r.state === 'playing') return endRound(r);          // l'animateur peut clore la manche
    if (r.state === 'roundEnd') {
      if (r.round < ROUNDS - 1) { r.round++; return startRound(r); }
      r.quiz = isText(r) ? textQuiz(r.items, Math.random) : isCalc(r) ? calcQuiz(r.level, r.seeds, Math.random) : isRecipe(r) ? recipeQuiz(THEMES[r.theme].bank, r.items, Math.random) : THEMES[r.theme].quiz;
      r.state = 'final'; for (const p of r.players.values()) p.answer = null;
      return broadcast(r);
    }
    if (r.state === 'final') {
      const good = r.quiz.answer;
      for (const p of r.players.values()) if (p.answer === good) p.pts += 1;
      r.state = 'podium'; return broadcast(r);
    }
  });

  socket.on('host:lobby', d => { const r = isHost(d); if (!r) return; clearTimeout(r.timer); r.state = 'lobby'; r.deadline = null; broadcast(r); });

  socket.on('host:kick', d => {
    const r = isHost(d); if (!r) return;
    const p = r.players.get(String(d?.pid)); if (!p) return;
    r.players.delete(p.pid); if (p.sid) io.to(p.sid).emit('kicked');
    broadcast(r); if (r.state === 'playing') checkAllDone(r);
  });

  socket.on('player:join', (d, ack) => {
    const r = rooms.get(String(d?.code || '').trim().toUpperCase());
    if (!r) return ack?.({ ok: false, error: 'Cette partie n’existe pas. Vérifiez le code.' });
    const pid = String(d?.pid || '').slice(0, 40) || crypto.randomUUID();
    const name = String(d?.name || '').trim().replace(/\s+/g, ' ').slice(0, 16) || 'Joueur';
    let p = r.players.get(pid);
    if (!p) {
      if (r.players.size >= MAX_PLAYERS) return ack?.({ ok: false, error: 'La partie est complète.' });
      p = { pid, name, pts: 0, placed: new Set(), doneAt: null, answer: null };
      r.players.set(pid, p);
    }
    p.name = name; p.sid = socket.id; p.connected = true;
    socket.data = { code: r.code, role: 'player', pid }; socket.join(r.code);
    ack?.({ ok: true, code: r.code, pid, seed: r.seed, placed: [...p.placed], answer: p.answer });
    broadcast(r);
  });

  socket.on('player:progress', d => {
    const r = room(); if (!r || socket.data.role !== 'player' || r.state !== 'playing') return;
    const p = r.players.get(socket.data.pid); if (!p || p.doneAt !== null) return;
    if (d?.seed !== r.seed) return;                      // ancien puzzle : on ignore
    const max = total(r);
    for (const i of Array.isArray(d?.placed) ? d.placed : []) if (Number.isInteger(i) && i >= 0 && i < max) p.placed.add(i);
    if (p.placed.size === max) {
      p.doneAt = Date.now();
      if (!r.deadline) { r.deadline = p.doneAt + GRACE_MS; r.timer = setTimeout(() => endRound(r), GRACE_MS); }
    }
    broadcast(r); checkAllDone(r);
  });

  socket.on('player:answer', d => {
    const r = room(); if (!r || socket.data.role !== 'player' || r.state !== 'final') return;
    const p = r.players.get(socket.data.pid);
    const i = Number(d?.i);
    if (p && p.answer === null && Number.isInteger(i) && i >= 0 && i < r.quiz.options.length) { p.answer = i; broadcast(r); }
  });

  socket.on('player:leave', () => {
    const r = room(); if (!r || socket.data.role !== 'player') return;
    r.players.delete(socket.data.pid); socket.leave(r.code); socket.data = {};
    broadcast(r); if (r.state === 'playing') checkAllDone(r);
  });

  socket.on('disconnect', () => {
    const r = room(); if (!r || socket.data.role !== 'player') return;
    const p = r.players.get(socket.data.pid);
    if (p && p.sid === socket.id) { p.connected = false; broadcast(r); if (r.state === 'playing') checkAllDone(r); }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [c, r] of rooms) if (now - r.seen > ROOM_TTL_MS) { clearTimeout(r.timer); rooms.delete(c); }
}, 10 * 60e3).unref();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('');
  console.log('  Curling est prêt. Laissez cette fenêtre ouverte pendant le jeu.');
  console.log(`  Sur cet ordinateur : http://localhost:${PORT}`);
  for (const ip of lanAddresses()) console.log(`  Sur le Wi-Fi (téléphones) : http://${ip}:${PORT}`);
  console.log('');
});
