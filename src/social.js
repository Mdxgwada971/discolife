// Chambres perso, meubles, cadeaux, animaux, succès, fête du mois, statut/coucou/bousculade, chat vers Discord, partage d'image.
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

export const FURN = {
  bed: { n: 'Lit douillet', e: '🛏️', p: 60 }, sofa: { n: 'Canapé néon', e: '🛋️', p: 80 }, tv: { n: 'Écran géant', e: '📺', p: 120 },
  plant: { n: 'Plante verte', e: '🪴', p: 25 }, lamp: { n: 'Lampe à lave', e: '💡', p: 35 }, rug: { n: 'Tapis rond', e: '⭕', p: 30 },
  desk: { n: 'Bureau gaming', e: '🖥️', p: 150 }, arcade: { n: 'Borne d\'arcade', e: '🕹️', p: 200 }, aqua: { n: 'Aquarium', e: '🐠', p: 180 },
  shelf: { n: 'Bibliothèque', e: '📚', p: 70 }, fridge: { n: 'Frigo à sodas', e: '🧊', p: 90 }, speaker: { n: 'Enceinte', e: '🔊', p: 65 },
  bean: { n: 'Pouf', e: '🟣', p: 40 }, trophy: { n: 'Vitrine à trophées', e: '🏆', p: 140 }, neon: { n: 'Enseigne néon', e: '✨', p: 110 },
};
// éditions limitées : une par mois, achetables seulement ce mois-là
export const MONTHLY = [
  { k: 'ltd_snowglobe', n: 'Boule à neige géante', e: '🔮', p: 150, fete: 'Hiver féerique', col: '#bfe6ff' },
  { k: 'ltd_heart', n: 'Canapé cœur', e: '💗', p: 150, fete: 'Fête de l\'amour', col: '#ff5fa2' },
  { k: 'ltd_clover', n: 'Trèfle doré', e: '🍀', p: 150, fete: 'Mars porte-bonheur', col: '#3bd16f' },
  { k: 'ltd_egg', n: 'Œuf arc-en-ciel', e: '🥚', p: 150, fete: 'Chasse aux œufs', col: '#ffd84a' },
  { k: 'ltd_flower', n: 'Arche fleurie', e: '🌸', p: 150, fete: 'Printemps en fleurs', col: '#ff9cc8' },
  { k: 'ltd_sun', n: 'Transat soleil', e: '🌞', p: 150, fete: 'Plage néon', col: '#ffb84f' },
  { k: 'ltd_fire', n: 'Feu d\'artifice', e: '🎆', p: 150, fete: 'Fête des étoiles', col: '#4fe3ff' },
  { k: 'ltd_palm', n: 'Palmier lumineux', e: '🌴', p: 150, fete: 'Été tropical', col: '#3bd1a0' },
  { k: 'ltd_book', n: 'Pupitre de la rentrée', e: '🎒', p: 150, fete: 'Rentrée stylée', col: '#a66bff' },
  { k: 'ltd_pumpkin', n: 'Citrouille géante', e: '🎃', p: 150, fete: 'Halloween', col: '#ff8a3d' },
  { k: 'ltd_disco', n: 'Boule disco', e: '🪩', p: 150, fete: 'Nuit néon', col: '#c86bff' },
  { k: 'ltd_tree', n: 'Sapin illuminé', e: '🎄', p: 150, fete: 'Noël à la maison', col: '#3bd16f' },
];
for (const m of MONTHLY) FURN[m.k] = { n: m.n, e: m.e, p: m.p, ltd: true };
export const PETS = { cat: { n: 'Chat', e: '🐱', p: 150 }, dog: { n: 'Chien', e: '🐶', p: 150 }, bunny: { n: 'Lapin', e: '🐰', p: 180 }, fox: { n: 'Renard', e: '🦊', p: 250 }, panda: { n: 'Panda', e: '🐼', p: 300 }, dragon: { n: 'Dragon', e: '🐉', p: 600 } };
// succès en 4 niveaux : bronze, argent, or, diamant
export const ACH = {
  talk: ['💬', 'Bavard', p => p.stats.msgs || 0, [10, 50, 200, 1000], 'messages'],
  voice: ['🎙️', 'Pilier du vocal', p => Math.floor((p.voiceSec || 0) / 3600), [1, 5, 20, 100], 'h sur Discolife'],
  racer: ['🏁', 'Pilote', p => p.stats.races || 0, [1, 5, 20, 50], 'courses gagnées'],
  fighter: ['⚔️', 'Duelliste', p => p.stats.duels || 0, [1, 5, 20, 50], 'duels gagnés'],
  level: ['⭐', 'Expérience', p => p.lvl || 1, [3, 5, 10, 20], 'niveau'],
  streak: ['🔥', 'Fidèle', p => p.streak || 0, [3, 7, 14, 30], 'jours d\'affilée'],
  daily: ['🎯', 'Chasseur de défis', p => p.stats.daily || 0, [3, 15, 50, 150], 'défis réussis'],
  decor: ['🛋️', 'Décorateur', p => (p.home && p.home.items.length) || 0, [3, 8, 15, 25], 'meubles placés'],
  gifts: ['🎁', 'Généreux', p => p.stats.gifts || 0, [1, 5, 15, 40], 'cadeaux offerts'],
  dj: ['🎧', 'DJ', p => p.stats.songs || 0, [3, 10, 30, 100], 'sons ajoutés'],
};
const TIER = ['', '🥉', '🥈', '🥇', '💎'];
const parisMonth = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })).getMonth();
const GRID = 9;

export function installSocial(House) {
  Object.assign(House.prototype, {
    fete() { const m = MONTHLY[parisMonth()]; return { ...m, month: parisMonth() }; },
    achTiers(p) { const out = {}; for (const [k, a] of Object.entries(ACH)) { const v = a[2](p); let t = 0; a[3].forEach((th, i) => { if (v >= th) t = i + 1; }); out[k] = t; } return out; },
    checkAch(p) {
      p.ach = p.ach || {}; const now = this.achTiers(p);
      for (const [k, t] of Object.entries(now)) if (t > (p.ach[k] || 0)) {
        const a = ACH[k]; p.ach[k] = t; const gain = 25 * t; p.coins += gain;
        this.log('badge', p.name, `succès ${a[0]} ${a[1]} ${TIER[t]} · +${gain} 🪙`); this.toast(p.id, `🏅 Succès ${a[1]} ${TIER[t]} débloqué · +${gain} 🪙`);
        if (t === 4) this.announce(`💎 **${p.name}** décroche le succès **${a[1]}** niveau diamant dans Discolife !`);
      }
    },
    petState(p) {
      if (!p.pet) return null; const hungry = Math.floor((Date.now() - p.pet.fed) / 864e5 * 34); // ~3 jours pour être affamé
      const food = Math.max(0, 100 - hungry); return { k: p.pet.k, name: p.pet.name, food, sulk: food <= 0 };
    },
    homeOf(p) { if (!p.home) p.home = { items: [], gifts: [], theme: 0 }; p.home.gifts = p.home.gifts || []; return p.home; },
    pubSocial(p) {
      const h = p.home || { items: [], gifts: [] };
      return { home: { items: h.items, theme: h.theme || 0, gifts: (h.gifts || []).map(g => ({ id: g.id, from: g.fromName })) }, furn: p.furn || {}, pet: this.petState(p), status: p.status || null, ach: p.ach || {} };
    },
    async postToDiscordChat(p, text) {
      const ch = await this.channelByName(/g[ée]n[ée]ral/i, 0); if (!ch) return false;
      return !!(await this.discord('POST', `/channels/${ch}/messages`, { content: `🏠 **${p.name}** : ${text}`, allowed_mentions: { parse: [] } }));
    },
    async shareImage(p, blob, caption) {
      const ch = this.gameChannel(); const fd = new FormData();
      fd.append('payload_json', JSON.stringify({ content: `📸 **${p.name}** partage un moment de Discolife${caption ? ` : ${caption}` : ''}`, allowed_mentions: { parse: [] }, attachments: [{ id: 0, filename: 'discolife.jpg' }] }));
      fd.append('files[0]', blob, 'discolife.jpg');
      const r = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, { method: 'POST', headers: { authorization: `Bot ${this.env.BOT_TOKEN}` }, body: fd });
      if (!r.ok) console.log('share', r.status, await r.text()); return r.ok;
    },
    async socialMsg(ws, a, p, m) {
      const S = p.stats;
      switch (m.t) {
        case 'furnBuy': {
          const it = FURN[m.k]; if (!it) return true;
          if (it.ltd && this.fete().k !== m.k) { this.toast(a.id, '⌛ Cette édition limitée n\'est plus en vente'); return true; }
          if (p.coins < it.p) { this.toast(a.id, `Pas assez de 🪙 (il en faut ${it.p})`); return true; }
          p.coins -= it.p; p.furn = p.furn || {}; p.furn[m.k] = (p.furn[m.k] || 0) + 1;
          this.log('info', p.name, `achète ${it.e} ${it.n}${it.ltd ? ' (édition limitée)' : ''} pour sa chambre`); this.pushProf(p); return true;
        }
        case 'place': { // poser un meuble de son inventaire dans sa chambre
          if (this.limited(a.id, 'pl', 250)) return true;
          const it = FURN[m.k], h = this.homeOf(p); p.furn = p.furn || {};
          const x = Math.floor(+m.x), y = Math.floor(+m.y); if (!it || !(x >= 1 && y >= 1 && x < GRID && y < GRID)) return true;
          const used = h.items.filter(i => i.k === m.k).length; if ((p.furn[m.k] || 0) <= used) { this.toast(a.id, 'Achète d\'abord ce meuble'); return true; }
          if (h.items.some(i => i.x === x && i.y === y)) { this.toast(a.id, 'Il y a déjà un meuble ici'); return true; }
          if (h.items.length >= 40) { this.toast(a.id, 'Ta chambre est pleine (40 meubles)'); return true; }
          h.items.push({ k: m.k, x, y, r: (+m.r || 0) % 2 }); this.checkAch(p); this.pushProf(p); return true;
        }
        case 'unplace': { if (this.limited(a.id, 'unpl', 250)) return true; const h = this.homeOf(p); h.items = h.items.filter(i => !(i.x === +m.x && i.y === +m.y)); this.pushProf(p); return true; }
        case 'homeTheme': { const h = this.homeOf(p); h.theme = Math.max(0, Math.min(5, Math.floor(+m.v || 0))); this.pushProf(p); return true; }
        case 'gift': {
          const q = this.profiles[m.to]; if (!q || q.id === p.id || this.limited(a.id, 'gift', 3000)) return true;
          const coins = Math.max(0, Math.min(1000, Math.floor(+m.coins || 0))), fk = m.k && FURN[m.k] ? m.k : null, note = clean(m.note, 120);
          if (!coins && !fk) return true;
          if (coins > p.coins) { this.toast(a.id, 'Pas assez de 🪙'); return true; }
          p.furn = p.furn || {}; if (fk) { const used = this.homeOf(p).items.filter(i => i.k === fk).length; if ((p.furn[fk] || 0) - used < 1) { this.toast(a.id, 'Tu n\'as pas ce meuble en réserve'); return true; } p.furn[fk]--; }
          p.coins -= coins; const h = this.homeOf(q); const id = (this.world.seq = (this.world.seq || 0) + 1).toString(36);
          h.gifts.push({ id, from: p.id, fromName: p.name, coins, k: fk, note, t: Date.now() }); if (h.gifts.length > 20) h.gifts.shift();
          S.gifts = (S.gifts || 0) + 1; this.checkAch(p);
          this.log('info', p.name, `laisse un cadeau 🎁 dans la chambre de ${q.name}`); this.toUser(q.id, { t: 'toast', text: `🎁 ${p.name} t'a laissé un cadeau dans ta chambre !` });
          this.pushProf(p); this.pushProf(q); return true;
        }
        case 'openGift': {
          const h = this.homeOf(p), g = h.gifts.find(x => x.id === m.id); if (!g) return true; h.gifts = h.gifts.filter(x => x.id !== m.id);
          p.coins += g.coins || 0; if (g.k) { p.furn = p.furn || {}; p.furn[g.k] = (p.furn[g.k] || 0) + 1; }
          this.send(ws, { t: 'giftOpened', g: { fromName: g.fromName, coins: g.coins, k: g.k, note: g.note } }); this.pushProf(p); return true;
        }
        case 'petBuy': {
          const it = PETS[m.k]; if (!it) return true; if (p.coins < it.p) { this.toast(a.id, `Pas assez de 🪙 (il en faut ${it.p})`); return true; }
          p.coins -= it.p; p.pet = { k: m.k, name: clean(m.name, 16) || it.n, fed: Date.now() }; this.log('info', p.name, `adopte ${it.e} ${p.pet.name} !`); this.pushProf(p); return true;
        }
        case 'petFeed': {
          if (!p.pet) return true; if (p.coins < 5) { this.toast(a.id, 'Il faut 5 🪙 pour nourrir ton animal'); return true; }
          if (Date.now() - p.pet.fed < 3600e3) { this.toast(a.id, `${p.pet.name} n'a plus faim 😋`); return true; }
          p.coins -= 5; p.pet.fed = Date.now(); this.bcast({ t: 'fx', id: a.id, k: '💖' }); this.pushProf(p); return true;
        }
        case 'petName': { if (!p.pet) return true; p.pet.name = clean(m.name, 16) || p.pet.name; this.pushProf(p); return true; }
        case 'status': {
          const e = clean(m.e, 4), txt = clean(m.txt, 40); p.status = (e || txt) ? { e, txt, t: Date.now() } : null; this.pushProf(p); return true;
        }
        case 'wave': case 'shove': {
          const q = this.profiles[m.to]; if (!q || q.id === p.id || this.limited(a.id, m.t, 2500)) return true;
          this.bcast({ t: 'poke', k: m.t, from: a.id, to: q.id });
          if (m.t === 'wave') this.toUser(q.id, { t: 'toast', text: `👋 ${p.name} te fait coucou !` }); return true;
        }
        case 'speakFor': { const id = String(m.id || ''); if (!/^\d{5,25}$/.test(id) || !(this.srv().voice[id] || this.online()[id]) || this.limited(a.id + id, 'spk', 700)) return true; this.bcast({ t: 'speak', id }); return true; }
        case 'chatDiscord': {
          const text = clean(m.text, 300).replace(/@(everyone|here)/gi, '@\u200b$1'); if (!text) return true;
          if (/(discord\.gg|discord(app)?\.com\/invite|dsc\.gg)\//i.test(text)) { this.toast(a.id, 'Les invitations ne passent pas'); return true; }
          if (this.limited(a.id, 'cd', 4000)) { this.toast(a.id, 'Doucement, un message toutes les 4 secondes'); return true; }
          const ok = await this.postToDiscordChat(p, text); if (!ok) this.toast(a.id, 'Impossible d\'envoyer sur Discord');
          return true;
        }
      }
      return false;
    },
  });
}
