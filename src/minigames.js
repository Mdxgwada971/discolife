// Jeux de la maison Discolife : mélodie, dessin, casino, loup-garou, combats de pets, ville commune, jeu du soir.
// Tout passe par un seul message { t: 'mg', g: <jeu>, a: <action>, ... } et une seule vue { t: 'mg', g, s }.

const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; }
const close = (g, answers) => { const x = norm(g); if (!x) return false; return answers.some(a => { const y = norm(a); return x === y || (y.length >= 6 && lev(x, y) <= 1) || (y.length >= 10 && lev(x, y) <= 2); }); };

// ------------------------------------------------------------------ mélodies (œuvres du domaine public et comptines traditionnelles)
// notes « C4:durée » (durée en temps, 1 par défaut), « - » = silence
export const TUNES = [
  ['Frère Jacques', ['frere jacques', 'frere jacque', 'dormez vous'], 'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2'],
  ['Au clair de la lune', ['au clair de la lune', 'clair de la lune'], 'C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:3'],
  ['Ode à la joie', ['ode a la joie', 'hymne a la joie', 'beethoven', 'hymne europeen', '9e symphonie', 'neuvieme symphonie'], 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2'],
  ['Lettre à Élise', ['lettre a elise', 'fur elise', 'pour elise', 'beethoven'], 'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 - C4:.5 E4:.5 A4:.5 B4:1.5'],
  ['Joyeux anniversaire', ['joyeux anniversaire', 'happy birthday', 'bon anniversaire'], 'G4:.75 G4:.25 A4 G4 C5 B4:2 G4:.75 G4:.25 A4 G4 D5 C5:2'],
  ['Vive le vent (Jingle Bells)', ['vive le vent', 'jingle bells', 'jingle bell'], 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4'],
  ['Ah ! vous dirai-je, maman', ['ah vous dirai je maman', 'vous dirai je maman', 'twinkle twinkle little star', 'twinkle twinkle', 'brille brille petite etoile'], 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2'],
  ['Korobeiniki (musique de Tetris)', ['tetris', 'korobeiniki', 'korobeyniki'], 'E5:2 B4 C5 D5:2 C5 B4 A4:2 A4 C5 E5:2 D5 C5 B4:3 C5 D5:2 E5:2 C5:2 A4:2 A4:2'],
  ['La Marseillaise', ['la marseillaise', 'marseillaise', 'hymne national', 'hymne francais'], 'D4:.5 D4:.5 G4 G4 A4 A4 D5:1.5 B4:.5 G4:.75 G4:.25 B4:.75 G4:.25 E4 C5:2 A4:.75 F#4:.25 G4:2'],
  ['Marche turque (Mozart)', ['marche turque', 'rondo alla turca', 'alla turca', 'mozart'], 'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:2'],
  ['Dans l\'antre du roi de la montagne', ['dans l antre du roi de la montagne', 'antre du roi de la montagne', 'roi de la montagne', 'peer gynt', 'grieg'], 'A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4 D#4:.5 B3:.5 D#4 D4:.5 A#3:.5 D4 A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4:.5 A4:.5 G4:.5 E4:.5 C4:.5 E4:.5 G4:2'],
  ['Canon de Pachelbel', ['canon de pachelbel', 'pachelbel', 'canon en re'], 'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2'],
  ['Marche nuptiale (Wagner)', ['marche nuptiale', 'here comes the bride', 'chœur des fiances', 'choeur des fiances', 'lohengrin', 'mariage'], 'C4 F4:.75 F4:.25 F4:2 C4 G4:.75 E4:.25 F4:2 C4 F4:.75 A#4:.25 A#4 A4:.75 G4:.25 F4:.75 E4:.25 F4 G4:2'],
  ['La Cucaracha', ['la cucaracha', 'cucaracha'], 'C4:.5 C4:.5 C4:.5 F4:1.5 A4 C4:.5 C4:.5 C4:.5 F4:1.5 A4:2 F4:.5 F4:.5 E4:.5 E4:.5 D4:.5 D4:.5 C4:2'],
  ['Berceuse de Brahms', ['berceuse de brahms', 'brahms', 'lullaby', 'wiegenlied', 'berceuse'], 'E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5 B4:1.5 A4:.5 A4 G4:2'],
  ['Greensleeves', ['greensleeves'], 'A4 C5:2 D5 E5:1.5 F5:.5 E5 D5:2 B4 G4:1.5 A4:.5 B4 C5:2 A4 A4:1.5 G#4:.5 A4 B4:2 G#4 E4:2'],
  ['We Wish You a Merry Christmas', ['we wish you a merry christmas', 'merry christmas', 'joyeux noel'], 'D4 G4 G4:.5 A4:.5 G4:.5 F#4:.5 E4 E4 E4 A4 A4:.5 B4:.5 A4:.5 G4:.5 F#4 D4 D4 B4 B4:.5 C5:.5 B4:.5 A4:.5 G4 E4 D4:.5 D4:.5 E4 A4 F#4 G4:2'],
  ['Le Lac des cygnes', ['le lac des cygnes', 'lac des cygnes', 'tchaikovski', 'tchaikovsky'], 'F#4:2 B3:.5 C#4:.5 D4:.5 E4:.5 F#4:1.5 D4:.5 F#4:1.5 D4:.5 F#4:1.5 B3:.5 D4:.5 B3:.5 G3:.5 D4:.5 B3:3'],
];

export const DRAW_WORDS = ['voiture', 'maison', 'chat', 'chien', 'soleil', 'pizza', 'arbre', 'fusee', 'guitare', 'poisson', 'avion', 'bateau', 'velo', 'lune', 'etoile', 'coeur', 'banane',
  'glace', 'parapluie', 'lunettes', 'chapeau', 'telephone', 'manette', 'casque', 'robot', 'fantome', 'dragon', 'serpent', 'escargot', 'papillon', 'araignee', 'fleur', 'champignon', 'nuage',
  'eclair', 'volcan', 'montagne', 'plage', 'requin', 'baleine', 'pingouin', 'girafe', 'elephant', 'lapin', 'tortue', 'burger', 'frites', 'gateau', 'cle', 'cadeau', 'couronne', 'epee', 'bouclier',
  'trophee', 'ballon', 'basket', 'skateboard', 'camion', 'train', 'pont', 'chateau', 'tente', 'feu', 'bougie', 'horloge', 'lampe', 'ordinateur', 'souris', 'cactus', 'ananas', 'cerise', 'pomme',
  'oeuf', 'dinosaure', 'licorne', 'sirene', 'pirate', 'ninja', 'zombie', 'vampire', 'alien', 'ovni', 'arc en ciel', 'bonhomme de neige', 'sapin', 'citrouille', 'micro', 'piano', 'tambour'];

// ------------------------------------------------------------------ combats de pets
const PET_STATS = { cat: [32, 7, 3], dog: [36, 6, 4], bunny: [30, 6, 5], fox: [33, 8, 4], panda: [42, 6, 5], dragon: [38, 9, 4] };
const petLvl = xp => Math.floor(Math.sqrt((xp || 0) / 25)) + 1;

// ------------------------------------------------------------------ ville commune
export const CITY = [['🏠', 'Premières maisons'], ['🌳', 'Parc'], ['☕', 'Café'], ['🏪', 'Supérette'], ['⛲', 'Fontaine'], ['🏫', 'École'], ['🎡', 'Grande roue'], ['🏟️', 'Stade'],
  ['🎢', 'Montagnes russes'], ['🏰', 'Château'], ['🗼', 'Tour'], ['🛸', 'Base spatiale']];
const cityNeed = l => Math.round(400 * Math.pow(l, 1.5)); // points pour passer du niveau l à l+1

// ------------------------------------------------------------------ casino (pièces Discolife seulement)
const SLOT = [['🍒', 30, 4], ['🍋', 25, 8], ['🔔', 18, 15], ['⭐', 12, 25], ['💎', 8, 50], ['7️⃣', 7, 100]]; // symbole, poids, gain pour 3 identiques
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const CARD = () => { const v = 1 + rnd(13); return v; };
const handVal = h => { let s = 0, a = 0; for (const c of h) { if (c === 1) { a++; s += 11; } else s += Math.min(10, c); } while (s > 21 && a) { s -= 10; a--; } return s; };

export const EVENING = [['melodie', '🎵 Devine la mélodie', 'arcade'], ['dessin', '🎨 Dessine et devine', 'arcade'], ['course', '🏁 Grand Prix du garage', 'garage'], ['lg', '🐺 Loup-garou', 'chill'], ['pets', '🐾 Combats de pets', 'chill']];

export function installMinigames(House) {
  const origXP = House.prototype.addXP;
  House.prototype.addXP = function (p, n) { const r = origXP.call(this, p, n); try { this.cityAdd(Math.max(1, Math.round(n / 4)), true); } catch (e) {} return r; };

  Object.assign(House.prototype, {
    MG() { if (!this._mg) this._mg = { melodie: null, dessin: null, lg: null, bj: {} }; return this._mg; },
    dayKeyMG() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date()); },
    eveningGame() { const d = this.dayKeyMG(); let h = 0; for (const c of d) h = (h * 31 + c.charCodeAt(0)) >>> 0; return EVENING[h % EVENING.length]; },
    mgMult(g) { return this.eveningGame()[0] === g ? 2 : 1; },
    mgPay(p, n, g, why) { const k = n * this.mgMult(g); p.coins += k; this.addXP(p, Math.round(k / 2)); this.pushProf(p); return k; },
    mgView(g) {
      const M = this.MG();
      if (g === 'melodie') { const s = M.melodie; if (!s) return null; return { id: s.id, st: s.st, round: s.round, rounds: s.rounds, t: s.t, notes: s.st === 'play' ? s.tune[2] : null, ans: s.st === 'reveal' || s.st === 'end' ? s.tune[0] : null, found: s.found, sc: s.sc, names: s.names, players: Object.keys(s.sc) }; }
      if (g === 'dessin') { const s = M.dessin; if (!s) return null; return { id: s.id, st: s.st, round: s.round, rounds: s.rounds, t: s.t, drawer: s.drawer, hint: s.word ? s.word.replace(/[a-z]/g, '_') : null, ans: s.st !== 'draw' ? s.word : null, found: s.found, sc: s.sc, names: s.names, players: s.order }; }
      if (g === 'city') { const c = this.city(); return { lvl: c.lvl, pts: c.pts, need: cityNeed(c.lvl + 1), built: CITY.slice(0, c.lvl), next: CITY[c.lvl] || null, top: Object.entries(c.top || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => [(this.profiles[id] || {}).name || '?', n]) }; }
      if (g === 'soir') { const e = this.eveningGame(); return { k: e[0], n: e[1], room: e[2] }; }
      if (g === 'podium') { const P = Object.values(this.profiles), R = this.world.records || {};
        const top = (f) => P.filter(p => p.stats && p.stats[f]).sort((a, b) => a.stats[f] - b.stats[f]).slice(0, 3).map(p => ({ id: p.id, n: p.name, v: p.stats[f] }));
        return { click: top('clickBest'), race: top('raceBest'), rec: { click: R.click || null, race: R.race || null } }; }
      return null;
    },
    mgB(g) { this.bcast({ t: 'mg', g, s: this.mgView(g) }); },
    mgSync(ws) { for (const g of ['melodie', 'dessin', 'city', 'soir', 'podium']) this.send(ws, { t: 'mg', g, s: this.mgView(g) }); const a = this.att(ws); if (a && a.id) { this.lgSendTo(a.id); const s = this.MG().dessin; if (s && s.strokes) this.send(ws, { t: 'mgDraw', id: s.id, all: s.strokes }); } },

    async mgMsg(ws, a, p, m) {
      const g = m.g; if (typeof g !== 'string') return;
      if (g === 'sync') return this.mgSync(ws);
      if (g === 'melodie') return this.melodieMsg(p, m);
      if (g === 'dessin') return this.dessinMsg(p, m);
      if (g === 'casino') return this.casinoMsg(a, p, m);
      if (g === 'lg') return this.lgMsg(p, m);
      if (g === 'pets') return this.petsMsg(a, p, m);
      if (g === 'city') { if (m.a === 'give') { const n = Math.floor(+m.n || 0); if (n < 10 || n > 1000 || n > p.coins) return this.toast(a.id, 'Don entre 10 et 1000 🪙 (et dans la limite de tes pièces)'); p.coins -= n; this.pushProf(p); this.cityAdd(n * 2, false, p); this.log('info', p.name, `offre ${n} 🪙 pour la ville 🏙️`, 'chill'); } return; }
      if (g === 'bet') return this.raceBet(a, p, m);
    },

    // ================================================================ 🎵 Devine la mélodie
    melodieMsg(p, m) {
      const M = this.MG(); let s = M.melodie;
      if (m.a === 'join') {
        if (!s || s.st === 'end') {
          const order = shuffle(TUNES.map((_, i) => i)).slice(0, 5);
          s = M.melodie = { id: Date.now(), st: 'lobby', t: Date.now() + 15000, round: 0, rounds: order.length, order, sc: {}, names: {}, found: null };
          this.log('info', p.name, 'lance 🎵 Devine la mélodie à l\'arcade : 15 s pour rejoindre !', 'arcade');
          setTimeout(() => this.melodieNext(s.id), 15000);
        }
        if (!(p.id in s.sc)) { s.sc[p.id] = 0; s.names[p.id] = p.name; } return this.mgB('melodie');
      }
      if (m.a === 'guess') {
        if (!s || s.st !== 'play' || !(p.id in s.sc) || s.found) return; if (this.limited(p.id, 'mel', 600)) return;
        if (close(clean(m.v, 60), s.tune[1].concat([s.tune[0]]))) { s.found = p.id; const pts = Math.max(1, Math.ceil((s.t - Date.now()) / 5000)); s.sc[p.id] += pts; this.melodieReveal(s); }
        else this.toUser(p.id, { t: 'toast', text: '❌ Pas ça…' });
      }
    },
    melodieNext(id) {
      const s = this.MG().melodie; if (!s || s.id !== id) return;
      if (s.round >= s.rounds) return this.melodieEnd(s);
      s.tune = TUNES[s.order[s.round]]; s.round++; s.found = null; s.st = 'play'; s.t = Date.now() + 25000; this.mgB('melodie');
      const r = s.round; setTimeout(() => { if (s.st === 'play' && s.round === r) this.melodieReveal(s); }, 25000);
    },
    melodieReveal(s) { s.st = 'reveal'; s.t = Date.now() + 5000; this.mgB('melodie'); setTimeout(() => this.melodieNext(s.id), 5000); },
    melodieEnd(s) {
      s.st = 'end'; const best = Object.entries(s.sc).sort((a, b) => b[1] - a[1]);
      if (best.length && best[0][1] > 0) { const w = this.profiles[best[0][0]]; if (w) { const k = this.mgPay(w, 30, 'melodie'); this.log('info', w.name, `gagne 🎵 Devine la mélodie ! +${k} 🪙`, 'arcade'); this.announce(`🎵 **${w.name}** gagne « Devine la mélodie » dans Discolife !`); } }
      for (const [id, sc] of best.slice(1)) if (sc > 0) { const q = this.profiles[id]; if (q) this.mgPay(q, 8, 'melodie'); }
      this.mgB('melodie');
    },

    // ================================================================ 🎨 Dessine et devine
    dessinMsg(p, m) {
      const M = this.MG(); let s = M.dessin;
      if (m.a === 'join') {
        if (!s || s.st === 'end') {
          s = M.dessin = { id: Date.now(), st: 'lobby', t: Date.now() + 20000, round: 0, rounds: 0, order: [], sc: {}, names: {}, found: [], strokes: [] };
          this.log('info', p.name, 'lance 🎨 Dessine et devine à l\'arcade : 20 s pour rejoindre !', 'arcade');
          setTimeout(() => this.dessinNext(s.id), 20000);
        }
        if (!(p.id in s.sc)) { s.sc[p.id] = 0; s.names[p.id] = p.name; if (s.st === 'lobby') s.order.push(p.id); } return this.mgB('dessin');
      }
      if (!s) return;
      if (m.a === 'draw') { // lots de traits envoyés par le dessinateur
        if (s.st !== 'draw' || s.drawer !== p.id) return; const pts = Array.isArray(m.pts) ? m.pts.slice(0, 80) : [];
        const st = { c: /^#[0-9a-f]{6}$/i.test(m.c) ? m.c : '#ffffff', w: Math.max(2, Math.min(18, +m.w || 4)), n: !!m.n, pts: pts.map(v => Math.max(0, Math.min(1000, Math.round(+v || 0)))) };
        if (s.strokes.length > 4000) return; s.strokes.push(st); this.bcast({ t: 'mgDraw', id: s.id, s: st }); return;
      }
      if (m.a === 'clear') { if (s.st !== 'draw' || s.drawer !== p.id) return; s.strokes = []; this.bcast({ t: 'mgDraw', id: s.id, clear: true }); return; }
      if (m.a === 'guess') {
        if (s.st !== 'draw' || p.id === s.drawer || !(p.id in s.sc) || s.found.includes(p.id)) return; if (this.limited(p.id, 'dsg', 500)) return;
        const v = clean(m.v, 40);
        if (close(v, [s.word])) { s.found.push(p.id); const pts = Math.max(2, Math.ceil((s.t - Date.now()) / 10000)) + (s.found.length === 1 ? 2 : 0); s.sc[p.id] += pts; s.sc[s.drawer] = (s.sc[s.drawer] || 0) + 2;
          this.mgB('dessin'); if (s.found.length >= s.order.length - 1) this.dessinReveal(s); }
        else this.bcast({ t: 'mgGuess', id: s.id, n: p.name, v: norm(v) === norm(s.word) ? '•••' : v });
      }
    },
    dessinNext(id) {
      const s = this.MG().dessin; if (!s || s.id !== id) return;
      if (s.st === 'lobby') { if (s.order.length < 2) { s.st = 'end'; s.cancel = 'Il faut au moins 2 joueurs'; this.bcast({ t: 'mg', g: 'dessin', s: { ...this.mgView('dessin'), cancel: s.cancel } }); return; } s.rounds = Math.min(8, s.order.length * (s.order.length <= 3 ? 2 : 1)); }
      if (s.round >= s.rounds) return this.dessinEnd(s);
      s.drawer = s.order[s.round % s.order.length]; s.round++; s.word = DRAW_WORDS[rnd(DRAW_WORDS.length)]; s.found = []; s.strokes = []; s.st = 'draw'; s.t = Date.now() + 70000;
      this.bcast({ t: 'mgDraw', id: s.id, clear: true }); this.mgB('dessin'); this.toUser(s.drawer, { t: 'mgWord', id: s.id, w: s.word });
      const r = s.round; setTimeout(() => { if (s.st === 'draw' && s.round === r) this.dessinReveal(s); }, 70000);
    },
    dessinReveal(s) { s.st = 'reveal'; s.t = Date.now() + 5000; this.mgB('dessin'); setTimeout(() => this.dessinNext(s.id), 5000); },
    dessinEnd(s) {
      s.st = 'end'; const best = Object.entries(s.sc).sort((a, b) => b[1] - a[1]);
      if (best.length && best[0][1] > 0) { const w = this.profiles[best[0][0]]; if (w) { const k = this.mgPay(w, 35, 'dessin'); this.log('info', w.name, `gagne 🎨 Dessine et devine ! +${k} 🪙`, 'arcade'); this.announce(`🎨 **${w.name}** gagne « Dessine et devine » dans Discolife !`); } }
      for (const [id, sc] of best.slice(1)) if (sc > 0) { const q = this.profiles[id]; if (q) this.mgPay(q, 10, 'dessin'); }
      this.mgB('dessin');
    },

    // ================================================================ 🏁 paris sur le Grand Prix
    raceBet(a, p, m) {
      const r = this.games.race; if (!r || r.state !== 'lobby') return this.toast(a.id, 'Les paris sont fermés'); if (r.players[p.id]) return this.toast(a.id, 'Tu cours : tu ne peux pas parier');
      r.bets = r.bets || {}; if (r.bets[p.id]) return this.toast(a.id, 'Tu as déjà parié sur cette course');
      const n = Math.floor(+m.n || 0); if (!r.players[m.on]) return; if (n < 10 || n > 200 || n > p.coins) return this.toast(a.id, 'Mise entre 10 et 200 🪙');
      p.coins -= n; r.bets[p.id] = { on: m.on, n }; this.pushProf(p); this.toast(a.id, `🎟️ Pari de ${n} 🪙 sur ${r.players[m.on].n} !`); this.bcast({ t: 'race', r: this.raceView() });
    },
    raceSettle(r) {
      const win = r.order[0]; if (!r.bets || r.settled) return; r.settled = true;
      for (const [uid, b] of Object.entries(r.bets)) { const q = this.profiles[uid]; if (!q) continue; if (b.on === win) { q.coins += b.n * 2; this.toUser(uid, { t: 'toast', text: `🎉 Pari gagné ! +${b.n * 2} 🪙` }); } else this.toUser(uid, { t: 'toast', text: '😬 Pari perdu…' }); this.pushProf(q); }
    },

    // ================================================================ 🎰 casino
    casinoMsg(a, p, m) {
      const d = this.dayKeyMG(); if (!p.cas || p.cas.d !== d) p.cas = { d, n: 0 };
      if (p.cas.n >= 150 && m.a !== 'hit' && m.a !== 'stand') return this.toast(a.id, '🎰 Le casino ferme pour toi aujourd\'hui (150 parties). Reviens demain !');
      const bet = Math.floor(+m.bet || 0); const okBet = () => { if (bet < 10 || bet > 200) { this.toast(a.id, 'Mise entre 10 et 200 🪙'); return false; } if (bet > p.coins) { this.toast(a.id, 'Pas assez de pièces'); return false; } return true; };
      const res = o => { this.pushProf(p); this.toUser(a.id, { t: 'mgCasino', ...o, coins: p.coins }); };
      if (m.a === 'slots') { if (!okBet()) return; p.cas.n++; p.coins -= bet;
        const tot = SLOT.reduce((s, x) => s + x[1], 0); const pick = () => { let r = Math.random() * tot; for (const x of SLOT) { if ((r -= x[1]) < 0) return x; } return SLOT[0]; };
        const reels = [pick(), pick(), pick()]; let win = 0;
        if (reels[0][0] === reels[1][0] && reels[1][0] === reels[2][0]) win = bet * reels[0][2]; else if (reels.filter(x => x[0] === '🍒').length === 2) win = bet * 3;
        p.coins += win; if (win >= bet * 25) { this.log('info', p.name, `fait sauter la machine à sous : +${win} 🪙 🎰`, 'arcade'); }
        return res({ k: 'slots', reels: reels.map(x => x[0]), win, bet }); }
      if (m.a === 'roulette') { if (!okBet()) return; const on = String(m.on || ''); const num = /^\d+$/.test(on) ? +on : null; if (!['rouge', 'noir', 'pair', 'impair'].includes(on) && !(num !== null && num >= 0 && num <= 36)) return;
        p.cas.n++; p.coins -= bet; const n = rnd(37); let win = 0;
        if (num !== null) { if (n === num) win = bet * 36; } else if (n !== 0) { if ((on === 'rouge' && RED.has(n)) || (on === 'noir' && !RED.has(n)) || (on === 'pair' && n % 2 === 0) || (on === 'impair' && n % 2 === 1)) win = bet * 2; }
        p.coins += win; if (win >= bet * 36) this.log('info', p.name, `touche le ${n} à la roulette : +${win} 🪙 🎡`, 'arcade');
        return res({ k: 'roulette', n, red: RED.has(n), win, bet }); }
      const M = this.MG(); let h = M.bj[p.id];
      if (m.a === 'deal') { if (h && !h.done) return res({ k: 'bj', ...this.bjView(h) }); if (!okBet()) return; p.cas.n++; p.coins -= bet;
        h = M.bj[p.id] = { bet, me: [CARD(), CARD()], dl: [CARD(), CARD()], done: false };
        if (handVal(h.me) === 21) return this.bjEnd(p, h, res); return res({ k: 'bj', ...this.bjView(h) }); }
      if (!h || h.done) return;
      if (m.a === 'hit') { h.me.push(CARD()); if (handVal(h.me) >= 21) return this.bjEnd(p, h, res); return res({ k: 'bj', ...this.bjView(h) }); }
      if (m.a === 'stand') return this.bjEnd(p, h, res);
    },
    bjView(h) { return { me: h.me, dl: h.done ? h.dl : [h.dl[0]], meV: handVal(h.me), dlV: h.done ? handVal(h.dl) : null, done: h.done, win: h.win, bet: h.bet, msg: h.msg }; },
    bjEnd(p, h, res) {
      const mv = handVal(h.me), bj = mv === 21 && h.me.length === 2; if (mv <= 21 && !bj) while (handVal(h.dl) < 17) h.dl.push(CARD());
      const dv = handVal(h.dl); h.done = true; let win = 0, msg;
      if (mv > 21) msg = '💥 Tu as sauté !'; else if (bj) { win = Math.floor(h.bet * 2.5); msg = '🃏 BLACKJACK !'; } else if (dv > 21 || mv > dv) { win = h.bet * 2; msg = '🎉 Gagné !'; } else if (mv === dv) { win = h.bet; msg = '🤝 Égalité, mise rendue'; } else msg = '😬 Le croupier gagne';
      h.win = win; h.msg = msg; p.coins += win; return res({ k: 'bj', ...this.bjView(h) });
    },

    // ================================================================ 🐺 loup-garou
    lgView(forId) {
      const s = this.MG().lg; if (!s) return null; const me = s.pl[forId]; const reveal = s.st === 'end';
      const wolf = me && me.role === 'loup';
      return { id: s.id, st: s.st, t: s.t, day: s.day, log: s.log.slice(-8), winner: s.winner || null, host: s.host,
        players: s.order.map(id => { const x = s.pl[id]; return { id, n: x.n, alive: x.alive, role: (!x.alive || reveal || (wolf && x.role === 'loup') || id === forId) ? x.role : null }; }),
        votes: s.st === 'vote' ? s.votes : (s.st === 'night' && wolf ? s.wv : {}), me: me ? { role: me.role, alive: me.alive, seen: me.seen || {} } : null };
    },
    lgSendTo(id) { const s = this.MG().lg; if (s) this.toUser(id, { t: 'mg', g: 'lg', s: this.lgView(id) }); },
    lgB() { const s = this.MG().lg; for (const ws of this.sockets()) { const a = this.att(ws); if (a && a.id) this.send(ws, { t: 'mg', g: 'lg', s: s ? this.lgView(a.id) : null }); } },
    lgMsg(p, m) {
      const M = this.MG(); let s = M.lg;
      if (m.a === 'join') {
        if (!s || s.st === 'end') { s = M.lg = { id: Date.now(), st: 'lobby', t: 0, host: p.id, pl: {}, order: [], log: ['🌙 Une partie de Loup-garou se prépare au salon…'], day: 0, votes: {}, wv: {} }; this.log('info', p.name, 'ouvre une table de 🐺 Loup-garou au salon (4 joueurs minimum)', 'chill'); }
        if (s.st !== 'lobby' || s.pl[p.id] || s.order.length >= 12) return; s.pl[p.id] = { n: p.name, alive: true, role: null }; s.order.push(p.id); return this.lgB();
      }
      if (!s) return;
      if (m.a === 'leave' && s.st === 'lobby') { delete s.pl[p.id]; s.order = s.order.filter(x => x !== p.id); if (!s.order.length) M.lg = null; else if (s.host === p.id) s.host = s.order[0]; return this.lgB(); }
      if (m.a === 'start') { if (s.st !== 'lobby' || s.host !== p.id) return; if (s.order.length < 4) return this.toast(p.id, 'Il faut au moins 4 joueurs'); return this.lgStart(s); }
      const me = s.pl[p.id]; if (!me || !me.alive) return; const to = s.pl[m.to]; if (!to || !to.alive) return;
      if (m.a === 'kill' && s.st === 'night' && me.role === 'loup' && to.role !== 'loup') { s.wv[p.id] = m.to; this.lgB(); return this.lgCheckNight(s); }
      if (m.a === 'see' && s.st === 'night' && me.role === 'voyante' && !s.seerDone && m.to !== p.id) { s.seerDone = true; me.seen = me.seen || {}; me.seen[m.to] = to.role; this.lgSendTo(p.id); return this.lgCheckNight(s); }
      if (m.a === 'vote' && s.st === 'vote') { s.votes[p.id] = m.to; this.lgB(); if (s.order.filter(id => s.pl[id].alive).every(id => s.votes[id])) this.lgEndVote(s); }
    },
    lgStart(s) {
      const n = s.order.length, roles = []; const wolves = n >= 8 ? 2 : 1; for (let i = 0; i < wolves; i++) roles.push('loup'); roles.push('voyante'); while (roles.length < n) roles.push('villageois');
      shuffle(roles).forEach((r, i) => { s.pl[s.order[i]].role = r; });
      s.log.push(`🎭 Les rôles sont distribués : ${wolves} loup${wolves > 1 ? 's' : ''}, 1 voyante, ${n - wolves - 1} villageois.`); this.lgNight(s);
    },
    lgNight(s) { s.st = 'night'; s.day++; s.wv = {}; s.seerDone = false; s.t = Date.now() + 35000; s.log.push(`🌙 Nuit ${s.day} : le village s'endort… Les loups choisissent une victime.`); this.lgB(); const d = s.day; setTimeout(() => { if (s.st === 'night' && s.day === d) this.lgDawn(s); }, 35000); },
    lgCheckNight(s) { const wolves = s.order.filter(id => s.pl[id].alive && s.pl[id].role === 'loup'); const seer = s.order.find(id => s.pl[id].alive && s.pl[id].role === 'voyante');
      if (wolves.every(id => s.wv[id]) && (!seer || s.seerDone)) setTimeout(() => { if (s.st === 'night') this.lgDawn(s); }, 1500); },
    lgDawn(s) {
      const tally = {}; for (const v of Object.values(s.wv)) tally[v] = (tally[v] || 0) + 1; let victim = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      victim = victim ? victim[0] : shuffle(s.order.filter(id => s.pl[id].alive && s.pl[id].role !== 'loup'))[0];
      if (victim) { s.pl[victim].alive = false; s.log.push(`☀️ Au réveil, ${s.pl[victim].n} a été dévoré(e)… C'était ${this.lgRole(s.pl[victim].role)}.`); }
      if (this.lgWin(s)) return; s.st = 'day'; s.t = Date.now() + 60000; s.log.push('💬 Débat : discutez dans le tchat, qui est le loup ?'); this.lgB();
      const d = s.day; setTimeout(() => { if (s.st === 'day' && s.day === d) { s.st = 'vote'; s.votes = {}; s.t = Date.now() + 40000; s.log.push('🗳️ Vote : cliquez sur la personne à éliminer.'); this.lgB(); setTimeout(() => { if (s.st === 'vote' && s.day === d) this.lgEndVote(s); }, 40000); } }, 60000);
    },
    lgEndVote(s) {
      const tally = {}; for (const v of Object.values(s.votes)) tally[v] = (tally[v] || 0) + 1; const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      if (!top.length || (top[1] && top[1][1] === top[0][1])) s.log.push('🤷 Égalité : personne n\'est éliminé.');
      else { const x = s.pl[top[0][0]]; x.alive = false; s.log.push(`⚖️ Le village élimine ${x.n}… C'était ${this.lgRole(x.role)} !`); }
      if (this.lgWin(s)) return; this.lgNight(s);
    },
    lgRole(r) { return r === 'loup' ? 'un 🐺 loup-garou' : r === 'voyante' ? 'la 🔮 voyante' : 'un 🧑‍🌾 villageois'; },
    lgWin(s) {
      const alive = s.order.filter(id => s.pl[id].alive), w = alive.filter(id => s.pl[id].role === 'loup').length; let winner = null;
      if (!w) winner = 'village'; else if (w >= alive.length - w) winner = 'loups'; if (!winner) return false;
      s.st = 'end'; s.winner = winner; s.log.push(winner === 'village' ? '🎉 Le village a gagné : tous les loups sont éliminés !' : '🐺 Les loups-garous ont gagné !');
      const names = []; for (const id of s.order) { const x = s.pl[id]; if ((winner === 'loups') === (x.role === 'loup')) { const q = this.profiles[id]; if (q) { this.mgPay(q, 50, 'lg'); names.push(q.name); } } }
      this.log('info', names.join(', ') || '?', `gagne${names.length > 1 ? 'nt' : ''} au 🐺 Loup-garou (${winner === 'village' ? 'village' : 'loups'})`, 'chill');
      this.announce(`🐺 Partie de Loup-garou terminée dans Discolife : **${winner === 'village' ? 'le village' : 'les loups'}** gagne${names.length ? ` (${names.join(', ')})` : ''} !`); this.lgB(); return true;
    },

    // ================================================================ 🐾 combats de pets
    petsMsg(a, p, m) {
      if (!p.pet) return this.toast(a.id, 'Adopte d\'abord un animal dans ta chambre 🐾');
      const pet = p.pet; pet.xp = pet.xp || 0; pet.w = pet.w || 0; pet.l = pet.l || 0;
      if (m.a === 'train') { if (Date.now() - (pet.tr || 0) < 30 * 60e3) return this.toast(a.id, `${pet.name} se repose (entraînement toutes les 30 min)`); if (p.coins < 15) return this.toast(a.id, 'Il faut 15 🪙');
        p.coins -= 15; pet.tr = Date.now(); const l0 = petLvl(pet.xp); pet.xp += 30; const l1 = petLvl(pet.xp); this.pushProf(p); this.toUser(a.id, { t: 'mgPet', k: 'train', lvl: l1, xp: pet.xp, up: l1 > l0 });
        if (l1 > l0) this.log('info', p.name, `${PETS_E(pet)} ${pet.name} passe niveau ${l1} !`); return; }
      if (m.a === 'fight') {
        const q = this.profiles[m.to]; if (!q || q.id === p.id || !q.pet) return this.toast(a.id, 'Choisis un adversaire qui a un animal'); if (this.limited(p.id, 'petfight', 90e3)) return this.toast(a.id, 'Ton animal reprend son souffle (1 combat toutes les 90 s)');
        const mk = (o) => { const b = PET_STATS[o.pet.k] || [34, 7, 4], l = petLvl(o.pet.xp); return { n: o.pet.name, e: PETS_E(o.pet), hp: b[0] + l * 6, atk: b[1] + l * 2, def: b[2] + l, l }; };
        const A = mk(p), B = mk(q); const log = []; let turn = Math.random() < .5 ? 0 : 1; const F = [A, B];
        for (let i = 0; i < 30 && A.hp > 0 && B.hp > 0; i++) { const x = F[turn], y = F[1 - turn]; const crit = Math.random() < .12, miss = Math.random() < .08;
          const dmg = miss ? 0 : Math.max(1, Math.round((x.atk * (0.8 + Math.random() * 0.4) - y.def / 2) * (crit ? 1.8 : 1))); y.hp = Math.max(0, y.hp - dmg);
          log.push(miss ? `${x.e} ${x.n} rate son attaque` : `${x.e} ${x.n} ${crit ? 'fait un COUP CRITIQUE' : 'attaque'} : −${dmg} ❤️ (${y.n} : ${y.hp})`); turn = 1 - turn; }
        const win = A.hp > 0 ? p : q, lose = win === p ? q : p; win.pet.w = (win.pet.w || 0) + 1; lose.pet.l = (lose.pet.l || 0) + 1; win.pet.xp = (win.pet.xp || 0) + 20; lose.pet.xp = (lose.pet.xp || 0) + 8;
        const gain = win === p ? this.mgPay(p, 15, 'pets') : 0; this.pushProf(q); if (win !== p) this.pushProf(p);
        const out = { t: 'mgPet', k: 'fight', A: { n: A.n, e: A.e, l: A.l, o: p.name }, B: { n: B.n, e: B.e, l: B.l, o: q.name }, log: log.slice(-14), win: win.id, gain };
        this.toUser(p.id, out); this.toUser(q.id, out); this.log('info', win.name, `${PETS_E(win.pet)} ${win.pet.name} gagne un combat contre ${PETS_E(lose.pet)} ${lose.pet.name} !`, 'chill'); return;
      }
    },

    // ================================================================ 🏙️ ville commune
    city() { const w = this.world; w.city = w.city || { lvl: 0, pts: 0, top: {} }; return w.city; },
    cityAdd(n, quiet, by) {
      const c = this.city(); c.pts += n; if (by) c.top[by.id] = (c.top[by.id] || 0) + n; let up = false;
      while (c.lvl < CITY.length && c.pts >= cityNeed(c.lvl + 1)) { c.pts -= cityNeed(c.lvl + 1); c.lvl++; up = true; }
      if (up) { const b = CITY[c.lvl - 1]; this.log('info', 'La ville', `construit ${b[0]} ${b[1]} ! (niveau ${c.lvl})`);
        this.announce(`🏙️ La ville de La Maison grandit : **${b[0]} ${b[1]}** construit (niveau ${c.lvl}) ! Tout le monde connecté reçoit 20 🪙.`);
        for (const ws of this.sockets()) { const a = this.att(ws); const q = a && this.profiles[a.id]; if (q && !q._cityPaid) { q._cityPaid = true; q.coins += 20; this.pushProf(q); } }
        for (const q of Object.values(this.profiles)) delete q._cityPaid; }
      this.save(); if (!quiet || up || !this._cityT || Date.now() - this._cityT > 10e3) { this._cityT = Date.now(); this.mgB('city'); }
    },

    // ================================================================ 🌟 jeu du soir (annonce à 20 h)
    async eveningPost() {
      const e = this.eveningGame(); this.mgB('soir');
      const ch = await this.chanId(/g[ée]n[ée]ral/i, 0); if (!ch) return;
      await this.discord('POST', `/channels/${ch}/messages`, { embeds: [{ color: 0xff4fa8, title: `🌟 Jeu du soir : ${e[1]}`, description: `Ce soir, **${e[1]}** rapporte **double pièces** dans Discolife !\nRendez-vous dans la pièce **${e[2]}** de la maison 🏠`, footer: { text: 'Un jeu différent chaque jour' } }],
        components: [{ type: 1, components: [{ type: 2, style: 1, label: 'Ouvrir Discolife', emoji: { name: '🏠' }, custom_id: 'launch:soir' }] }] });
    },
  });
}
const PETS_E = pet => ({ cat: '🐱', dog: '🐶', bunny: '🐰', fox: '🦊', panda: '🐼', dragon: '🐉' })[pet.k] || '🐾';
