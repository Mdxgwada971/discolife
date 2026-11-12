// La Maison — état partagé du jeu (un seul Durable Object pour tout le serveur)
import { DurableObject } from 'cloudflare:workers';

export const ROOMS = ['garage', 'gaming', 'chill', 'studio', 'arcade', 'afk'];
const ROOM_NAME = { garage: 'garage', gaming: 'salle-gaming', chill: 'salon-chill', studio: 'studio', arcade: 'arcade', afk: 'afk' };
export const SHOP = {
  glasses: { p: 40, n: 'Lunettes noires', e: '🕶️', kind: 'acc' }, cap: { p: 50, n: 'Casquette néon', e: '🧢', kind: 'acc' },
  phones: { p: 70, n: 'Casque DJ', e: '🎧', kind: 'acc' }, crown: { p: 150, n: 'Couronne', e: '👑', kind: 'acc' },
  neon: { p: 60, n: 'Néons de caisse', e: '✨', kind: 'up' }, spoiler: { p: 80, n: 'Aileron', e: '🏎️', kind: 'up' },
  gold: { p: 60, n: 'Jantes dorées', e: '🟡', kind: 'up' }, chrome: { p: 120, n: 'Peinture chrome', e: '🪞', kind: 'up' },
  rainbow: { p: 200, n: 'Peinture arc-en-ciel', e: '🌈', kind: 'up' }, smoke: { p: 50, n: 'Échappement fumée', e: '💨', kind: 'up' },
  plate: { p: 40, n: 'Plaque perso', e: '🔤', kind: 'up' },
  tint: { p: 50, n: 'Vitres teintées', e: '🕶️', kind: 'up' }, hlneon: { p: 60, n: 'Phares néon', e: '💡', kind: 'up' }, rims: { p: 80, n: 'Jantes custom', e: '⚙️', kind: 'up' },
};
const CARS = { citadine: ['citadine', 0], berline: ['berline', 0], van: ['van utilitaire', 120], suv: ['SUV', 150], pickup: ['pick-up', 250], offroad: ['4x4 tout-terrain', 300],
  classique: ['classique des années 60', 350], muscle: ['muscle car', 450], sportive: ['sportive GT', 500], jdm: ['drift JDM', 550], supercar: ['supercar', 1000] };
for (const [k, [n, p]] of Object.entries(CARS)) if (p) SHOP['car_' + k] = { p, n: n.charAt(0).toUpperCase() + n.slice(1), e: '🚗', kind: 'car' };
const MODELS = Object.keys(CARS);
const MODEL_LABEL = Object.fromEntries(Object.entries(CARS).map(([k, v]) => [k, v[0]]));
const SPOTS = 6;
const BADGES = {
  first_park: '🅿️ Première caisse', race_win: '🏁 Pilote victorieux', duel_win: '⚔️ Duelliste', click_fast: '⚡ Réflexes de chat',
  voice_1h: '⏱️ 1 h en vocal', voice_10h: '🕰️ 10 h en vocal', crown: '👑 Couronné', dj: '🎧 DJ du serveur',
  chatty: '💬 Bavard', lvl5: '⭐ Niveau 5', streak7: '🔥 7 jours d\'affilée', star: '🌟 Starboard',
  champion: '🏆 Champion de saison', daily: '🎯 Défis bouclés', carweek: '🚗 Caisse de la semaine',
};
const ROLES = [[1, '🌱 Nouveau'], [2, '🌱 Membre'], [3, '🏎️ Pilote'], [4, '🎧 DJ'], [5, '🗣️ Crieur officiel'], [7, '🕹️ Champion arcade'], [10, '👑 Légende']];
const roleOf = l => ROLES.filter(r => r[0] <= l).pop()[1];
const CHALLENGES = {
  park: ['🅿️', 'Gare ta caisse au garage', 1], order: ['🍹', 'Commande une boisson à Lola', 1], chat: ['💬', 'Envoie 3 messages dans le tchat', 3],
  duel: ['⚔️', 'Gagne un duel', 1], race: ['🏁', 'Termine une course', 1], click: ['⚡', 'Fais un test de clic', 1], song: ['🎵', 'Ajoute un son au studio', 1],
  vote: ['📊', 'Vote dans un sondage', 1], play: ['🎮', 'Mets « je joue à » en salle gaming', 1], react: ['😂', 'Envoie 5 réactions', 5],
  time: ['⏱️', 'Reste 20 min sur Discolife (hors AFK)', 40], visit: ['🚪', 'Visite 5 salons différents', 5], carvote: ['❤️', 'Vote pour la caisse de la semaine', 1],
};
const paris = () => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })); return d; };
function parisToUTC(y, mo, d, h, mi) { const g = Date.UTC(y, mo, d, h, mi); const loc = new Date(new Date(g).toLocaleString('en-US', { timeZone: 'Europe/Paris' })); const utc = new Date(new Date(g).toLocaleString('en-US', { timeZone: 'UTC' })); return g - (loc - utc); }
const weekKey = () => { const d = paris(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const monthKey = () => { const d = paris(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const parisDay = (d = 0) => new Date(Date.now() + 3600e3 - d * 864e5).toISOString().slice(0, 10);
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const rnd = (a, b) => a + Math.random() * (b - a);

export class House extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.games = { duels: {}, race: null, click: null };
    this.rate = {};
    ctx.blockConcurrencyWhile(async () => {
      this.profiles = (await ctx.storage.get('profiles')) || {};
      this.world = (await ctx.storage.get('world')) || { queue: [], np: null, poll: null, feed: [], starboard: [], records: {}, dayFirst: null, seq: 1 };
      this.world.teams = this.world.teams || {}; this.world.admins = this.world.admins || []; this.world.invites = this.world.invites || {};
    });
  }

  // ------------------------------------------------------------ persistence
  save() { if (this._saveT) return; this._saveT = setTimeout(async () => { this._saveT = null; await this.ctx.storage.put({ profiles: this.profiles, world: this.world }); }, 400); }

  // ------------------------------------------------------------ sockets
  sockets() { return this.ctx.getWebSockets(); }
  att(ws) { try { return ws.deserializeAttachment() || {}; } catch { return {}; } }
  online() {
    const o = {};
    for (const ws of this.sockets()) { const a = this.att(ws); if (a.id) o[a.id] = { room: a.room || 'garage', since: a.since }; }
    return o;
  }
  send(ws, m) { try { ws.send(JSON.stringify(m)); } catch { } }
  bcast(m, except) { const s = JSON.stringify(m); for (const ws of this.sockets()) if (ws !== except) { try { ws.send(s); } catch { } } }
  toUser(id, m) { for (const ws of this.sockets()) if (this.att(ws).id === id) this.send(ws, m); }
  roomOf(id) { return (this.online()[id] || {}).room; }

  pub(p) { // profil visible par tout le monde
    return { id: p.id, name: p.name, avatar: p.avatar, coins: p.coins, xp: p.xp, lvl: p.lvl, acc: p.acc, car: p.car, upOn: p.upOn, plate: p.plate, owned: p.owned, badges: p.badges, voiceSec: p.voiceSec, stats: p.stats, streak: p.streak, team: p.team, daily: this.dailyOf(p), hl: p.hl || null, rim: p.rim || null, playing: p.playing && Date.now() - p.playing.t < 4 * 3600e3 ? p.playing : null, admin: this.world.admins.includes(p.id), vip: !!this.world.teams[p.id] };
  }
  pushProf(p, extra) { this.bcast({ t: 'prof', p: this.pub(p), ...(extra || {}) }); this.save(); }

  log(k, n, text, ch) {
    const f = { id: this.world.seq++, k, n, t: text, ch: ch || null, ts: Date.now(), stars: [] };
    this.world.feed.push(f); if (this.world.feed.length > 80) this.world.feed.shift();
    this.bcast({ t: 'feed', f }); this.save(); return f;
  }
  toast(id, text) { this.toUser(id, { t: 'toast', text }); }
  pushWorld() { const w = this.world; this.bcast({ t: 'world', queue: w.queue, np: w.np, poll: w.poll, starboard: w.starboard, records: w.records, teams: w.teams, boost: this.boosted() ? w.boost : null, season: w.season || monthKey(), cv: this.carVotes(), champs: w.champs || [] }); this.save(); }

  ensureProfile(u, fromServer) {
    let p = this.profiles[u.id];
    if (!p) {
      p = this.profiles[u.id] = { id: u.id, name: u.name, avatar: u.avatar, coins: 50, xp: 0, lvl: 1, owned: [], upOn: {}, acc: '', plate: '', car: null,
        voiceSec: 0, badges: [], stats: { races: 0, duels: 0, clickBest: null, songs: 0, msgs: 0, parks: 0 }, lastDay: null, streak: 0, joined: Date.now() };
      this._new = !fromServer;
      if (!fromServer && !this.world.admins.length) this.world.admins.push(u.id); // le premier joueur (le créateur du serveur) devient admin
    }
    if (p.team === undefined) p.team = null;
    p.name = u.name; p.avatar = u.avatar;
    return p;
  }
  boosted() { const b = this.world.boost; return b && Date.now() < b.until; }
  addXP(p, n) {
    if (this.boosted()) n *= 2;
    const wk = weekKey(); if (!p.wk || p.wk.k !== wk) p.wk = { k: wk, xp: 0 }; p.wk.xp += n;
    const lv0 = p.lvl;
    p.xp += n;
    const tm = p.team && this.world.teams[p.team]; if (tm) { tm.score += n; this._teamDirty = true; }
    while (p.xp >= 100 * p.lvl) { p.xp -= 100 * p.lvl; p.lvl++; p.coins += 25; this.log('level', p.name, `passe niveau ${p.lvl} · ${roleOf(p.lvl)} · +25 🪙`); if (p.lvl % 5 === 0) this.announce(`🎉 **${p.name}** passe niveau ${p.lvl} dans Discolife !`); this.toUser(p.id, { t: 'boom' }); if (p.lvl >= 5) this.badge(p, 'lvl5'); }
    if (p.lvl !== lv0 && roleOf(p.lvl) !== roleOf(lv0)) this.syncLevelRole(p);
  }
  badge(p, b) { if (p.badges.includes(b)) return; p.badges.push(b); p.coins += 20; this.log('badge', p.name, `débloque le badge ${BADGES[b]} · +20 🪙`); this.toast(p.id, `🏅 Nouveau badge : ${BADGES[b]}`); }
  todayChallenges() {
    const day = parisDay(), keys = Object.keys(CHALLENGES); let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const out = []; while (out.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const k = keys[h % keys.length]; if (!out.includes(k)) out.push(k); } return { day, keys: out };
  }
  dailyOf(p) { const t = this.todayChallenges(); if (!p.daily || p.daily.day !== t.day) p.daily = { day: t.day, prog: {}, done: [], bonus: false, v: [] };
    return { day: t.day, list: t.keys.map(k => ({ k, e: CHALLENGES[k][0], n: CHALLENGES[k][1], goal: CHALLENGES[k][2], prog: Math.min(CHALLENGES[k][2], p.daily.prog[k] || 0), done: p.daily.done.includes(k) })), bonus: p.daily.bonus }; }
  progress(p, k, inc = 1) {
    if (!p) return; const t = this.todayChallenges(); this.dailyOf(p); if (!t.keys.includes(k) || p.daily.done.includes(k)) return;
    p.daily.prog[k] = (p.daily.prog[k] || 0) + inc; if (p.daily.prog[k] < CHALLENGES[k][2]) return;
    p.daily.done.push(k); p.coins += 30; this.toast(p.id, `🎯 Défi réussi : ${CHALLENGES[k][1]} · +30 🪙`); this.toUser(p.id, { t: 'boom' });
    if (p.daily.done.length === 3 && !p.daily.bonus) { p.daily.bonus = true; p.coins += 50; this.badge(p, 'daily'); this.log('daily', p.name, 'boucle les 3 défis du jour · +50 🪙 bonus'); }
    this.pushProf(p);
  }
  // rôles Discord selon le niveau
  async ensureLevelRoles() {
    const w = this.world; if (w.lvlRoles && Object.keys(w.lvlRoles).length === ROLES.length) return w.lvlRoles;
    const roles = await this.discord('GET', `/guilds/${this.env.GUILD_ID}/roles`); if (!roles) return null;
    const cols = [0x8fd18a, 0x6bc4ff, 0xff8a3d, 0xb36bff, 0xffd84a, 0xff4fa8, 0xffc93c]; w.lvlRoles = w.lvlRoles || {};
    for (let i = 0; i < ROLES.length; i++) { const name = ROLES[i][1], bare = name.replace(/^\S+\s/, '').toLowerCase();
      const ex = roles.find(r => r.name === name || r.name.toLowerCase().replace(/^\S+\s/, '') === bare || r.name.toLowerCase() === bare);
      if (ex) w.lvlRoles[name] = ex.id; else { const r = await this.discord('POST', `/guilds/${this.env.GUILD_ID}/roles`, { name, color: cols[i], hoist: false }); if (r) w.lvlRoles[name] = r.id; } }
    this.save(); return w.lvlRoles;
  }
  async syncLevelRole(p) {
    const map = await this.ensureLevelRoles(); if (!map) return; const want = map[roleOf(p.lvl)];
    if (p._lr && p._lr !== want) await this.discord('DELETE', `/guilds/${this.env.GUILD_ID}/members/${p.id}/roles/${p._lr}`);
    if (want && p._lr !== want) { const ok = await this.discord('PUT', `/guilds/${this.env.GUILD_ID}/members/${p.id}/roles/${want}`); if (ok) p._lr = want; }
    this.save();
  }
  // salons utiles trouvés par leur nom
  async channelByName(re, type = 0) {
    const w = this.world; w.chByName = w.chByName || {}; const key = re.source + type; if (w.chByName[key]) return w.chByName[key];
    const chs = await this.discord('GET', `/guilds/${this.env.GUILD_ID}/channels`); const c = (chs || []).find(x => x.type === type && re.test(x.name));
    if (c) { w.chByName[key] = c.id; this.save(); } return c ? c.id : null;
  }
  // saison mensuelle des équipes
  async seasonCheck() {
    const w = this.world, mk = monthKey(); if (!w.season) { w.season = mk; return; } if (w.season === mk) return;
    const old = w.season; w.season = mk; const [y, m] = old.split('-').map(Number);
    const tms = Object.values(w.teams).sort((a, b) => b.score - a.score); const win = tms[0] && tms[0].score > 0 ? tms[0] : null;
    w.seasons = w.seasons || []; w.seasons.push({ m: old, team: win ? win.name : null, score: win ? win.score : 0 });
    if (win) {
      for (const id of win.members) { const q = this.profiles[id]; if (q) { q.coins += 100; this.badge(q, 'champion'); this.pushProf(q); } }
      if (!w.champRole) { const r = await this.discord('POST', `/guilds/${this.env.GUILD_ID}/roles`, { name: '🏆 Champions', color: 0xffc93c, hoist: true }); if (r) w.champRole = r.id; }
      if (w.champRole) { for (const id of w.champs || []) await this.discord('DELETE', `/guilds/${this.env.GUILD_ID}/members/${id}/roles/${w.champRole}`);
        for (const id of win.members) await this.discord('PUT', `/guilds/${this.env.GUILD_ID}/members/${id}/roles/${w.champRole}`); w.champs = [...win.members]; }
      this.log('team', win.name, `remporte la saison de ${MONTHS[m - 1]} avec ${win.score} pts 🏆`);
      await this.discord('POST', `/channels/${this.gameChannel()}/messages`, { content: '@everyone', allowed_mentions: { parse: ['everyone'] }, embeds: [{ color: 0xffc93c, title: `🏆 Fin de la saison de ${MONTHS[m - 1]}`,
        description: `L'équipe **${win.name}** (⭐ ${win.vipName}) remporte la saison avec **${win.score} pts** !\nChaque membre gagne **100 🪙**, le badge 🏆 et le rôle **Champions**.\n\n${tms.slice(1, 3).map((t, i) => `${['🥈', '🥉'][i]} **${t.name}** · ${t.score} pts`).join('\n')}\n\nNouvelle saison : tous les compteurs repartent à zéro. À vous de jouer !` }] });
    }
    for (const t of tms) t.score = 0; this.pushWorld();
  }
  // récap du dimanche soir
  async recapCheck() {
    const w = this.world, d = paris(), wk = weekKey(); if (d.getDay() !== 0 || d.getHours() < 20 || w.recapWeek === wk) return; w.recapWeek = wk;
    const P_ = Object.values(this.profiles); const best = P_.filter(p => p.wk && p.wk.k === wk).sort((a, b) => b.wk.xp - a.wk.xp)[0];
    const tms = Object.values(w.teams).sort((a, b) => b.score - a.score); const car = this.carOfWeek(); const rec = w.records.click;
    if (car) { const q = this.profiles[car.id]; if (q) { q.coins += 50; this.badge(q, 'carweek'); this.pushProf(q); } }
    const f = [];
    if (tms[0]) f.push({ name: '👥 Équipe en tête', value: `**${tms[0].name}** · ${tms[0].score} pts`, inline: true });
    if (best) f.push({ name: '⭐ Joueur de la semaine', value: `**${best.name}** · ${best.wk.xp} XP`, inline: true });
    if (car) f.push({ name: '🚗 Caisse de la semaine', value: `**${car.name}** · ${car.n} ❤️ (+50 🪙)`, inline: true });
    if (rec) f.push({ name: '⚡ Record de clic', value: `**${rec.n}** · ${rec.ms} ms`, inline: true });
    f.push({ name: '🏠 Discolife', value: `${P_.length} joueurs · ${P_.filter(p => p.car).length} caisses au garage`, inline: true });
    await this.discord('POST', `/channels/${this.gameChannel()}/messages`, { embeds: [{ color: 0xa66bff, title: '📰 Le récap de la semaine', description: 'Ce qui s\'est passé cette semaine dans La Maison :', fields: f, footer: { text: 'Rendez-vous dimanche prochain · Discolife' } }] });
    w.cv = { k: weekKey(), v: {} };
  }
  carOfWeek() { const cv = this.world.cv; if (!cv || cv.k !== weekKey()) return null; const n = {}; for (const o of Object.values(cv.v)) n[o] = (n[o] || 0) + 1;
    const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0]; if (!top) return null; const q = this.profiles[top[0]]; return q ? { id: q.id, name: q.name, n: top[1] } : null; }
  carVotes() { const cv = this.world.cv; const n = {}; if (cv && cv.k === weekKey()) for (const o of Object.values(cv.v)) n[o] = (n[o] || 0) + 1; return n; }
  // soirées jeu
  eventMsg(e) {
    const list = a => a.length ? a.slice(0, 20).map(id => `<@${id}>`).join(' ') : '—'; const ts = Math.floor(e.ts / 1000);
    return { embeds: [{ color: 0xff4fa8, title: `📅 Soirée ${e.jeu}`, description: `**${e.byName}** organise une soirée **${e.jeu}** <t:${ts}:F> (<t:${ts}:R>)` + (e.extra ? `\n> ${e.extra}` : '') + `\n\nRappel automatique 15 min avant 🔔`,
      fields: [{ name: `✅ Viennent (${e.yes.length})`, value: list(e.yes), inline: true }, { name: `🤔 Peut-être (${e.maybe.length})`, value: list(e.maybe), inline: true }],
      footer: { text: 'Discolife · réponds avec les boutons' } }],
      components: [{ type: 1, components: [{ type: 2, style: 3, label: 'Je viens', emoji: { name: '✅' }, custom_id: `ev:${e.id}:yes` }, { type: 2, style: 2, label: 'Peut-être', emoji: { name: '🤔' }, custom_id: `ev:${e.id}:maybe` }, { type: 2, style: 4, label: 'Je peux pas', custom_id: `ev:${e.id}:no` }] }] };
  }
  async eventsCheck() {
    const ev = this.world.events || {}, now = Date.now();
    for (const e of Object.values(ev)) {
      if (!e.reminded && now >= e.ts - 15 * 60e3) { e.reminded = true;
        const who = e.yes.concat(e.maybe); await this.discord('POST', `/channels/${this.gameChannel()}/messages`, { content: `${e.ping ? '@everyone ' : ''}🔔 **Soirée ${e.jeu} dans 15 min !** ${who.map(id => `<@${id}>`).join(' ')}\nRamenez-vous en vocal${e.voice ? ` <#${e.voice}>` : ''} 🎮`, allowed_mentions: { parse: e.ping ? ['everyone'] : [], users: who } });
        this.log('info', e.byName, `: la soirée 🎮 ${e.jeu} commence dans 15 min !`); }
      if (now > e.ts + 6 * 3600e3) delete ev[e.id];
    }
  }
  // accueil des nouveaux membres (liste des membres, nécessite l'intent « membres du serveur »)
  async welcomeCheck() {
    const w = this.world; if (w.memT && Date.now() - w.memT < 110e3) return; w.memT = Date.now();
    const mem = await this.discord('GET', `/guilds/${this.env.GUILD_ID}/members?limit=1000`); if (!mem) return;
    const ids = mem.filter(x => !x.user.bot).map(x => x.user.id);
    if (!w.known) { w.known = ids; this.save(); return; }
    const known = new Set(w.known), fresh = mem.filter(x => !x.user.bot && !known.has(x.user.id)); w.known = ids;
    const ch = this.env.ANNOUNCE_CHANNEL_ID;
    for (const x of fresh.slice(0, 5)) { const u = x.user, nm = x.nick || u.global_name || u.username;
      await this.discord('POST', `/channels/${ch}/messages`, { content: `<@${u.id}>`, allowed_mentions: { users: [u.id] }, embeds: [{ color: 0x3bd16f, title: `🏠 Bienvenue dans la maison, ${nm} !`,
        description: `Un nouveau voisin débarque 🎉\nTa place t'attend dans **Discolife** : gare ta caisse, commande à Lola, défie les autres à l'arcade et gagne tes premières 🪙.`,
        thumbnail: { url: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256` : 'https://cdn.discordapp.com/embed/avatars/0.png' } }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Entrer dans Discolife', emoji: { name: '🏠' }, url: this.env.SITE_URL || 'https://discolife.warren-molongo.workers.dev' }] }] });
      this.log('welcome', nm, 'vient d\'arriver sur le serveur 🏠'); }
    this.save();
  }
  // anti-spam : règles AutoMod de Discord + salon staff
  async ensureAutomod() {
    const g = this.env.GUILD_ID, w = this.world;
    if (!w.staffCh) { const VIEW = 1 << 10; const ch = await this.discord('POST', `/guilds/${g}/channels`, { name: '🛡️・staff', type: 0, topic: 'Alertes anti-spam du bot (visible par les admins)', permission_overwrites: [{ id: g, type: 0, deny: String(VIEW) }, { id: this.env.CLIENT_ID, type: 1, allow: String(VIEW + (1 << 11)) }] }); if (ch) w.staffCh = ch.id; }
    const ex = await this.discord('GET', `/guilds/${g}/auto-moderation/rules`); if (!ex) return false;
    const have = new Set(ex.map(r => r.name)); const alert = w.staffCh ? [{ type: 2, metadata: { channel_id: w.staffCh } }] : [];
    const rules = [
      { name: 'Discolife · spam', event_type: 1, trigger_type: 3, actions: [{ type: 1, metadata: { custom_message: 'Message bloqué : ça ressemble à du spam.' } }, ...alert], enabled: true },
      { name: 'Discolife · mentions en masse', event_type: 1, trigger_type: 5, trigger_metadata: { mention_total_limit: 5, mention_raid_protection_enabled: true }, actions: [{ type: 1, metadata: { custom_message: 'Trop de mentions d\'un coup.' } }, { type: 3, metadata: { duration_seconds: 600 } }, ...alert], enabled: true },
      { name: 'Discolife · pubs d\'autres serveurs', event_type: 1, trigger_type: 1, trigger_metadata: { keyword_filter: ['*discord.gg/*', '*discord.com/invite/*', '*dsc.gg/*'] }, actions: [{ type: 1, metadata: { custom_message: 'Les invitations vers d\'autres serveurs ne sont pas autorisées.' } }, ...alert], enabled: true },
    ];
    let ok = true; for (const r of rules) if (!have.has(r.name)) { const res = await this.discord('POST', `/guilds/${g}/auto-moderation/rules`, r); if (!res) ok = false; }
    w.automod = ok; this.save(); return ok;
  }
  limited(id, key, ms) { const k = id + key, t = Date.now(); if (this.rate[k] && t - this.rate[k] < ms) return true; this.rate[k] = t; return false; }

  // ------------------------------------------------------------ connexion
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === '/ix') { await this.interaction(await req.json()); return new Response('ok'); }
    if (path === '/setup') return Response.json({ ok: !!(await this.registerCommands()) });
    const u = JSON.parse(req.headers.get('x-user'));
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    const already = !!this.online()[u.id];
    const p = this.ensureProfile(u);
    const room = (Object.values(this.online()).length, 'garage');
    pair[1].serializeAttachment({ id: u.id, room, since: Date.now(), active: false });

    // bonus du jour + série
    const today = parisDay();
    if (p.lastDay !== today) {
      p.streak = p.lastDay === parisDay(1) ? p.streak + 1 : 1; p.lastDay = today;
      const bonus = 20 + Math.min(p.streak, 7) * 5; p.coins += bonus;
      setTimeout(() => { this.log('daily', p.name, `bonus du jour : +${bonus} 🪙 (série de ${p.streak} jour${p.streak > 1 ? 's' : ''})`); if (p.streak >= 7) this.badge(p, 'streak7'); }, 300);
      if (!this.world.dayFirst || this.world.dayFirst.day !== today) { this.world.dayFirst = { day: today, id: p.id }; p.coins += 10; setTimeout(() => this.log('daily', p.name, '☀️ premier connecté du jour · +10 🪙'), 400); }
    }
    this.send(pair[1], { t: 'init', me: p.id, profiles: Object.fromEntries(Object.values(this.profiles).map(x => [x.id, this.pub(x)])), online: this.online(), queue: this.world.queue, np: this.world.np, poll: this.world.poll, feed: this.world.feed.slice(-40), starboard: this.world.starboard, records: this.world.records, teams: this.world.teams, boost: this.boosted() ? this.world.boost : null, season: this.world.season || monthKey(), cv: this.carVotes(), champs: this.world.champs || [], invite: this.world.invites[p.id] || null, shop: SHOP, badges: BADGES, games: this.gamesState(), now: Date.now() });
    this.pushProf(p);
    this.bcast({ t: 'pres', online: this.online() });
    if (this._new) { this._new = false; setTimeout(() => this.log('welcome', p.name, `arrive pour la première fois dans Discolife ! Bienvenue 🏠`), 200); }
    else if (!already) this.log('join', p.name, 'a rejoint', ROOM_NAME[room]);
    this.ensureAlarm();
    this.save();
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketClose(ws) { this.leave(ws); }
  async webSocketError(ws) { this.leave(ws); }
  leave(ws) {
    const a = this.att(ws); if (!a.id) return;
    ws.serializeAttachment({});
    try { ws.close(1000); } catch { }
    if (!this.online()[a.id]) { const p = this.profiles[a.id]; if (p) this.log('leave', p.name, 'a quitté Discolife'); }
    this.bcast({ t: 'pres', online: this.online() });
  }

  // ------------------------------------------------------------ gains passifs (toutes les 30 s)
  async ensureAlarm() { if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + 30000); }
  async alarm() {
    const seen = new Set();
    for (const ws of this.sockets()) {
      const a = this.att(ws); if (!a.id || seen.has(a.id)) continue; seen.add(a.id);
      if (a.room === 'afk') continue;
      const p = this.profiles[a.id]; if (!p) continue;
      const before = p.voiceSec; p.voiceSec += 30;
      const gain = (2 + (a.active ? 1 : 0)) * (this.boosted() ? 2 : 1); p.coins += gain; this.addXP(p, 3); this.progress(p, 'time');
      for (const w of this.sockets()) if (this.att(w).id === a.id) { const b = this.att(w); b.active = false; w.serializeAttachment(b); }
      this.toUser(p.id, { t: 'earn', n: gain });
      if (Math.floor(before / 600) !== Math.floor(p.voiceSec / 600)) { p.coins += 15; this.log('voice', p.name, `est sur Discolife depuis ${Math.round((Date.now() - a.since) / 60000)} min · +15 🪙 bonus`); }
      if (p.voiceSec >= 3600) this.badge(p, 'voice_1h'); if (p.voiceSec >= 36000) this.badge(p, 'voice_10h');
      this.pushProf(p);
    }
    if (this._teamDirty) { this._teamDirty = false; this.pushWorld(); }
    // musique : morceau suivant toutes les 60 s
    const w = this.world;
    if (w.np && Date.now() - w.np.t0 > 60000) { w.np = w.queue.shift() || null; if (w.np) w.np.t0 = Date.now(); this.pushWorld(); }
    if (w.boost && Date.now() > w.boost.until) { w.boost = null; this.log('info', 'Discolife', 'fin de l\'événement double XP'); this.pushWorld(); }
    if (this.env.BOT_TOKEN) { try { await this.seasonCheck(); await this.recapCheck(); await this.eventsCheck(); await this.welcomeCheck(); } catch (e) { console.log('checks', e); } }
    await this.ctx.storage.setAlarm(Date.now() + (this.sockets().length ? 30000 : 60000));
    this.save();
  }

  // ------------------------------------------------------------ messages
  async webSocketMessage(ws, raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const a = this.att(ws); if (!a.id) return;
    const p = this.profiles[a.id]; if (!p) return;
    const mark = () => { for (const w of this.sockets()) if (this.att(w).id === a.id) { const b = this.att(w); b.active = true; w.serializeAttachment(b); } };
    const setRoom = r => { for (const w of this.sockets()) if (this.att(w).id === a.id) { const b = this.att(w); b.room = r; w.serializeAttachment(b); } };
    switch (m.t) {
      case 'vc': { // Activité lancée depuis un salon vocal → on démarre dans le salon du jeu correspondant
        if (this.limited(a.id, 'vc', 2000)) return; const r = await this.roomForVoice(m.id, p);
        if (r && r !== a.room) { this.vcSeen[a.id] = m.id; await this.webSocketMessage(ws, JSON.stringify({ t: 'move', room: r, srv: 1 })); this.send(ws, { t: 'goto', room: r }); }
        return;
      }
      case 'vpoll': { // version web : on suit le salon vocal Discord
        if (this.limited(a.id, 'vp', 4000) || !this.env.BOT_TOKEN) return;
        const vs = await this.discord('GET', `/guilds/${this.env.GUILD_ID}/voice-states/${a.id}`); const ch = vs && vs.channel_id;
        if (!ch) { delete this.vcSeen[a.id]; return; }
        if (this.vcSeen[a.id] === ch) return; this.vcSeen[a.id] = ch;
        const r = await this.roomForVoice(ch, p); if (!r || r === this.att(ws).room) return;
        await this.webSocketMessage(ws, JSON.stringify({ t: 'move', room: r, srv: 1 })); for (const w of this.sockets()) if (this.att(w).id === a.id) this.send(w, { t: 'goto', room: r, voice: true });
        return;
      }
      case 'move': {
        if (!(ROOMS.includes(m.room) || (m.room === 'team' && p.team)) || m.room === a.room) return;
        const from = a.room; setRoom(m.room);
        { this.dailyOf(p); const v = p.daily.v || (p.daily.v = []); if (!v.includes(m.room)) { v.push(m.room); this.progress(p, 'visit'); } }
        if (m.follow && !m.srv && this.vcSeen[a.id]) { // le jeu déplace aussi le vocal Discord
          const vch = await this.voiceForRoom(m.room, p);
          if (vch && vch !== this.vcSeen[a.id]) { const ok = await this.discord('PATCH', `/guilds/${this.env.GUILD_ID}/members/${a.id}`, { channel_id: vch }); if (ok) this.vcSeen[a.id] = vch; }
        }
        const rn = r => r === 'team' ? (this.world.teams[p.team]?.name || 'salon privé') : ROOM_NAME[r];
        if (m.room !== 'team' && from !== 'team') { this.log('leave', p.name, 'a quitté', rn(from)); this.log('join', p.name, 'a rejoint', rn(m.room)); }
        else if (m.room === 'team') this.log('team', p.name, `entre dans 🔒 ${rn('team')}`);
        this.bcast({ t: 'pres', online: this.online() }); return;
      }
      case 'speak': if (this.limited(a.id, 'sp', 800)) return; mark(); this.bcast({ t: 'speak', id: a.id }); return;
      case 'react': if (this.limited(a.id, 're', 400)) return; mark(); this.bcast({ t: 'fx', id: a.id, k: clean(m.k, 6) }); this.progress(p, 'react'); return;
      case 'sfx': if (this.limited(a.id, 'sx', 1500)) return; mark(); if (['horn', 'drum', 'air'].includes(m.k)) this.bcast({ t: 'fx', id: a.id, k: m.k, sfx: true }); return;
      case 'playing': {
        const g = clean(m.g, 30); if (this.limited(a.id, 'pl', 1500)) return; mark();
        if (!g) { p.playing = null; this.pushProf(p); return; }
        p.playing = { g, t: Date.now() }; this.log('info', p.name, `joue à 🎮 ${g}`, 'salle-gaming'); this.progress(p, 'play'); this.pushProf(p); return;
      }
      case 'order': {
        const D = { mojito: '🍹 un mojito', soda: '🥤 un soda', cafe: '☕ un café', the: '🍵 un thé glacé', jus: '🧃 un jus', milk: '🥛 un milkshake' };
        if (!D[m.d] || this.limited('all', 'order', 6000)) return this.toast(a.id, 'La serveuse arrive, patience 😉'); mark();
        this.log('info', p.name, `commande ${D[m.d]}`, 'salon-chill'); this.bcast({ t: 'serve', by: p.name, id: a.id, d: m.d }); this.addXP(p, 1); this.progress(p, 'order'); return;
      }
      case 'chat': {
        const text = clean(m.text, 120); if (!text || this.limited(a.id, 'ch', 700)) return; mark();
        const f = this.log('chat', p.name, text); f.uid = a.id;
        this.bcast({ t: 'chat', id: a.id, text, fid: f.id });
        p.stats.msgs++; this.addXP(p, 2); this.progress(p, 'chat'); if (p.stats.msgs >= 100) this.badge(p, 'chatty'); this.pushProf(p); return;
      }
      case 'star': {
        const f = this.world.feed.find(x => x.id === m.fid && x.k === 'chat'); if (!f || f.stars.includes(a.id) || f.uid === a.id) return;
        f.stars.push(a.id); this.bcast({ t: 'star', fid: f.id, n: f.stars.length });
        if (f.stars.length === 3) { this.world.starboard.unshift({ n: f.n, t: f.t, ts: f.ts }); this.world.starboard = this.world.starboard.slice(0, 20); const au = this.profiles[f.uid]; if (au) { au.coins += 15; this.badge(au, 'star'); this.pushProf(au); } this.log('star', f.n, `entre au #starboard : « ${f.t} »`); this.pushWorld(); }
        this.save(); return;
      }
      case 'park': {
        if (!MODELS.includes(m.model) || !/^#[0-9a-f]{6}$/i.test(m.col || '')) return;
        if (CARS[m.model][1] && !p.owned.includes('car_' + m.model)) return this.toast(a.id, `🔒 Achète d'abord la ${MODEL_LABEL[m.model]} à la concession`);
        let spot = p.car ? p.car.spot : null;
        if (spot === null) {
          const used = Object.values(this.profiles).filter(x => x.car).map(x => x.car.spot);
          spot = [...Array(SPOTS).keys()].find(i => !used.includes(i));
          if (spot === undefined) { // garage plein : la plus vieille caisse laisse sa place
            const oldest = Object.values(this.profiles).filter(x => x.car && x.id !== p.id).sort((x, y) => x.car.t - y.car.t)[0];
            spot = oldest.car.spot; oldest.car = null; this.log('info', oldest.name, 'a dû sortir sa caisse du garage (garage plein)'); this.pushProf(oldest);
          }
        }
        p.car = { model: m.model, col: m.col, spot, t: Date.now() };
        p.stats.parks++; this.addXP(p, 10); this.badge(p, 'first_park'); this.progress(p, 'park');
        this.log('car', p.name, `a garé sa ${MODEL_LABEL[m.model]}`, 'garage'); this.pushProf(p, { drop: p.id }); return;
      }
      case 'unpark': if (!p.car) return; p.car = null; this.log('car', p.name, 'a sorti sa caisse du garage'); this.pushProf(p); return;
      case 'buy': {
        const it = SHOP[m.item]; if (!it || p.owned.includes(m.item)) return;
        if (p.coins < it.p) return this.toast(a.id, `Pas assez de 🪙 (il en faut ${it.p})`);
        p.coins -= it.p; p.owned.push(m.item);
        if (it.kind === 'car') { this.log('car', p.name, `s'offre une ${MODEL_LABEL[m.item.slice(4)]} à la concession 🔑`); if (it.p >= 500) this.announce(`🔑 **${p.name}** s'offre une **${MODEL_LABEL[m.item.slice(4)]}** dans Discolife !`); this.toUser(a.id, { t: 'boom' }); this.pushProf(p); return; }
        if (it.kind === 'acc') p.acc = m.item; else { p.upOn[m.item] = true; if (m.item === 'plate' && !p.plate) p.plate = p.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'MAISON'; if (m.item === 'chrome') p.upOn.rainbow = false; if (m.item === 'rainbow') p.upOn.chrome = false; }
        if (m.item === 'crown') this.badge(p, 'crown');
        this.log('shop', p.name, `achète ${it.e} ${it.n}`); this.toUser(a.id, { t: 'boom' }); this.pushProf(p); return;
      }
      case 'equip': { if (m.acc && !(p.owned.includes(m.acc) && SHOP[m.acc]?.kind === 'acc')) return; p.acc = m.acc || ''; this.pushProf(p); return; }
      case 'up': { if (!p.owned.includes(m.id) || SHOP[m.id]?.kind !== 'up') return; p.upOn[m.id] = !!m.on; if (m.on && m.id === 'chrome') p.upOn.rainbow = false; if (m.on && m.id === 'rainbow') p.upOn.chrome = false; this.pushProf(p); return; }
      case 'tune': {
        if (m.k === 'hl' && p.owned.includes('hlneon') && /^#[0-9a-f]{6}$/i.test(m.v || '')) p.hl = m.v;
        else if (m.k === 'rim' && p.owned.includes('rims') && ['sport', 'multi', 'deep', 'turbine'].includes(m.v)) p.rim = m.v; else return;
        this.pushProf(p); return;
      }
      case 'carvote': {
        const o = this.profiles[m.id]; if (!o || !o.car || o.id === a.id || this.limited(a.id, 'cv', 1500)) return;
        const w = this.world; if (!w.cv || w.cv.k !== weekKey()) w.cv = { k: weekKey(), v: {} };
        if (w.cv.v[a.id] === o.id) delete w.cv.v[a.id]; else { w.cv.v[a.id] = o.id; this.progress(p, 'carvote'); this.toUser(o.id, { t: 'toast', text: `❤️ ${p.name} vote pour ta caisse !` }); }
        this.pushWorld(); return;
      }
      case 'admin': {
        if (!this.isAdmin(p)) return; const w = this.world;
        if (m.op === 'coins') { const q = this.profiles[m.to], n = Math.max(-5000, Math.min(5000, Math.round(+m.n || 0))); if (!q || !n) return;
          q.coins = Math.max(0, q.coins + n); this.log('info', q.name, `${n > 0 ? 'reçoit' : 'perd'} ${Math.abs(n)} 🪙 de la part du boss`); this.toUser(q.id, { t: 'toast', text: `🎁 Le boss t'envoie ${n} 🪙 !` }); this.pushProf(q); return; }
        if (m.op === 'boost') { const h = Math.max(0, Math.min(12, +m.h || 0)); if (!h) { w.boost = null; this.pushWorld(); return; }
          w.boost = { until: Date.now() + h * 3600e3, by: p.name }; this.log('info', p.name, `lance un événement ⚡ DOUBLE XP & 🪙 pendant ${h} h !`); this.pushWorld();
          if (m.ping) this.discord('POST', `/channels/${this.gameChannel()}/messages`, { content: `@everyone ⚡ **DOUBLE XP & DOUBLE PIÈCES** sur Discolife pendant **${h} h** ! Ramenez-vous 🏠`, allowed_mentions: { parse: ['everyone'] } });
          return; }
        if (m.op === 'say') { const text = clean(m.text, 200); if (!text) return; this.bcast({ t: 'banner', text, by: p.name }); this.log('info', '📢 ' + p.name, text);
          if (m.discord) this.discord('POST', `/channels/${this.gameChannel()}/messages`, { content: `${m.ping ? '@everyone ' : ''}📢 **Annonce du boss** : ${text}`, allowed_mentions: { parse: m.ping ? ['everyone'] : [] } }); return; }
        return;
      }
      case 'plate': { if (!p.owned.includes('plate')) return; p.plate = clean(m.text, 8).toUpperCase(); this.pushProf(p); return; }
      case 'song': {
        const s = clean(m.s, 50); if (!s || this.limited(a.id, 'so', 3000)) return; mark();
        const w = this.world; const item = { s, by: p.name, id: a.id };
        if (!w.np) { w.np = { ...item, t0: Date.now() }; } else { w.queue.push(item); w.queue = w.queue.slice(0, 30); }
        p.stats.songs++; this.addXP(p, 5); this.progress(p, 'song'); if (p.stats.songs >= 10) this.badge(p, 'dj');
        this.log('music', p.name, `ajoute « ${s} » à la file`); this.pushWorld(); this.pushProf(p); return;
      }
      case 'skip': { const w = this.world; if (this.limited('all', 'skip', 3000)) return; w.np = w.queue.shift() || null; if (w.np) w.np.t0 = Date.now(); this.log('music', p.name, w.np ? `passe au morceau suivant : « ${w.np.s} »` : 'a vidé la musique'); this.pushWorld(); return; }
      case 'shuffle': { const q = this.world.queue; for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; } this.log('music', p.name, 'a mélangé la file'); this.pushWorld(); return; }
      case 'poll': {
        const q = clean(m.q, 80), opts = (m.opts || []).map(o => clean(o, 40)).filter(Boolean).slice(0, 4);
        if (!q || opts.length < 2 || this.limited(a.id, 'po', 20000)) return;
        this.world.poll = { q, by: p.name, opts: opts.map(l => ({ l, v: [] })), ts: Date.now() };
        this.log('poll', p.name, `lance un sondage : « ${q} »`, 'salon-chill'); this.pushWorld(); return;
      }
      case 'vote': {
        const po = this.world.poll; if (!po || !po.opts[m.i]) return;
        po.opts.forEach(o => { o.v = o.v.filter(x => x !== a.id); }); po.opts[m.i].v.push(a.id); this.progress(p, 'vote');
        this.pushWorld(); return;
      }
      // ---------------- VIP & équipes
      case 'vip': return this.setVip(p, m.to, !!m.on);
      case 'teamName': return this.teamName(p, m.name);
      case 'recruit': return this.recruit(p, m.to);
      case 'recruitAns': return this.recruitAns(p, !!m.ok);
      case 'kick': return this.kick(p, m.to);
      case 'leaveTeam': return this.leaveTeam(p);
      // ---------------- mini-jeux
      case 'duel': return this.duelChallenge(p, m.to);
      case 'duelAns': return this.duelAnswer(p, m.gid, m.ok);
      case 'duelAct': return this.duelAct(p, m.gid, m.k);
      case 'race': return this.raceJoin(p);
      case 'press': return this.racePress(p);
      case 'click': return this.clickJoin(p);
      case 'clickHit': return this.clickHit(p, m.ms, m.early);
      case 'ping': this.send(ws, { t: 'pong' }); return;
    }
  }

  gamesState() { return { race: this.raceView(), click: this.clickView(), duels: Object.values(this.games.duels) }; }

  // ------------------------------------------------------------ VIP & équipes
  isAdmin(p) { return this.world.admins.includes(p.id); }
  async setVip(p, to, on, force) {
    if (!force && !this.isAdmin(p)) return this.toast(p.id, 'Seul l\'admin peut nommer des VIP');
    const q = this.profiles[to]; if (!q) return;
    const T = this.world.teams;
    if (on) {
      if (T[to]) return;
      if (q.team && T[q.team]) this.removeMember(T[q.team], q);
      const cols = ['#ff4fa8', '#4fe3ff', '#ffd84a', '#7cff6b', '#a66bff', '#ff8a3d'];
      const t = T[to] = { id: to, vip: to, vipName: q.name, name: `${q.name} place`, col: cols[Object.keys(T).length % cols.length], members: [to], score: 0, roleId: null, channelId: null, ts: Date.now() };
      q.team = to;
      this.log('vip', q.name, `devient ⭐ VIP et ouvre son salon privé 🔒 ${t.name}`);
      this.announce(`⭐ **${q.name}** devient VIP et ouvre son salon privé **${t.name}** ! Les VIP peuvent recruter leur équipe dans Discolife.`);
      await this.syncTeamCreate(t); this.vipRole(to, true);
    } else {
      const t = T[to]; if (!t) return;
      for (const id of t.members) { const x = this.profiles[id]; if (x) { x.team = null; this.pushProf(x); } this.discordRole(id, t, false); }
      this.log('vip', q.name, 'n\'est plus VIP'); await this.syncTeamDelete(t); this.vipRole(to, false); delete T[to];
    }
    this.pushProf(q); this.pushWorld(); this.bcast({ t: 'pres', online: this.online() });
  }
  async teamName(p, name) {
    const t = this.world.teams[p.id]; if (!t) return; const n = clean(name, 24); if (!n) return;
    t.name = n; this.log('vip', p.name, `renomme son salon privé en 🔒 ${n}`); this.pushWorld();
    if (this.env.BOT_TOKEN && t.channelId) { await this.discord('PATCH', `/channels/${t.channelId}`, { name: `🔒・${n}` }); if (t.roleId) await this.discord('PATCH', `/guilds/${this.env.GUILD_ID}/roles/${t.roleId}`, { name: `Équipe ${n}` }); }
  }
  recruit(p, to) {
    const t = this.world.teams[p.id]; if (!t) return this.toast(p.id, 'Seuls les VIP peuvent recruter');
    const q = this.profiles[to]; if (!q || q.id === p.id) return;
    if (q.team) return this.toast(p.id, `${q.name} est déjà dans une équipe`);
    this.world.invites[to] = { tid: t.id, from: p.name, name: t.name, ts: Date.now() };
    this.toUser(to, { t: 'invite', invite: this.world.invites[to] });
    this.toast(p.id, `Invitation envoyée à ${q.name}`); this.save();
  }
  async recruitAns(p, ok) {
    const inv = this.world.invites[p.id]; if (!inv) return; delete this.world.invites[p.id];
    const t = this.world.teams[inv.tid]; if (!t) return;
    if (!ok) { this.toast(t.vip, `${p.name} a refusé ton invitation`); this.save(); return; }
    if (p.team) return;
    t.members.push(p.id); p.team = t.id;
    this.log('team', p.name, `rejoint l'équipe de ${t.vipName} · accès à 🔒 ${t.name}`);
    this.announce(`👥 **${p.name}** rejoint l'équipe de **${t.vipName}** et a maintenant accès à **${t.name}** !`);
    this.pushProf(p); this.pushWorld(); this.discordRole(p.id, t, true);
  }
  removeMember(t, q) { t.members = t.members.filter(x => x !== q.id); q.team = null; this.discordRole(q.id, t, false); }
  kick(p, to) {
    const t = this.world.teams[p.id]; if (!t || to === p.id || !t.members.includes(to)) return;
    const q = this.profiles[to]; this.removeMember(t, q); this.log('team', q.name, `quitte l'équipe de ${t.vipName}`);
    if (this.roomOf(to) === 'team') this.forceRoom(to, 'garage');
    this.pushProf(q); this.pushWorld();
  }
  leaveTeam(p) {
    const t = p.team && this.world.teams[p.team]; if (!t || t.vip === p.id) return;
    this.removeMember(t, p); this.log('team', p.name, `quitte l'équipe de ${t.vipName}`);
    if (this.roomOf(p.id) === 'team') this.forceRoom(p.id, 'garage');
    this.pushProf(p); this.pushWorld();
  }
  forceRoom(id, r) { for (const w of this.sockets()) if (this.att(w).id === id) { const b = this.att(w); b.room = r; w.serializeAttachment(b); } this.toUser(id, { t: 'room', room: r }); this.bcast({ t: 'pres', online: this.online() }); }

  // ------------------------------------------------------------ commandes sur le serveur Discord (/vip, /recruter…)
  async registerCommands() {
    const mem = { type: 6, name: 'membre', description: 'Le membre du serveur', required: true };
    const cmds = [
      { name: 'vip', description: 'Nommer ou retirer un VIP (réservé au boss du serveur)', default_member_permissions: '8', dm_permission: false,
        options: [{ type: 1, name: 'ajouter', description: 'Nommer un membre VIP : il reçoit son équipe et son salon privé', options: [mem] },
                  { type: 1, name: 'retirer', description: 'Retirer le statut VIP (son salon privé est supprimé)', options: [mem] }] },
      { name: 'recruter', description: 'VIP : inviter un membre dans ton équipe', dm_permission: false, options: [mem] },
      { name: 'retirer', description: 'VIP : retirer un membre de ton équipe', dm_permission: false, options: [mem] },
      { name: 'equipe', description: 'VIP : renommer ton salon privé', dm_permission: false, options: [{ type: 3, name: 'nom', description: 'Nouveau nom du salon', required: true, max_length: 24 }] },
      { name: 'quitter', description: 'Quitter ton équipe', dm_permission: false },
      { name: 'proposer-jeu', description: 'Propose un jeu au serveur : « téléchargez-le, on va bientôt y jouer »', dm_permission: false,
        options: [{ type: 3, name: 'jeu', description: 'Le jeu à proposer', required: true, max_length: 40 },
                  { type: 3, name: 'lien', description: 'Lien de téléchargement (facultatif, sinon lien de recherche auto)', required: false, max_length: 200 },
                  { type: 3, name: 'message', description: 'Pourquoi ce jeu ? (facultatif)', required: false, max_length: 150 }] },
      { name: 'soiree', description: 'Planifie une soirée jeu avec rappel automatique 15 min avant', dm_permission: false,
        options: [{ type: 3, name: 'jeu', description: 'Le jeu de la soirée', required: true, max_length: 40 },
                  { type: 3, name: 'heure', description: 'Heure (ex : 21h, 21:30)', required: true, max_length: 5 },
                  { type: 3, name: 'date', description: 'Date JJ/MM (par défaut : aujourd\'hui, ou demain si l\'heure est passée)', required: false, max_length: 5 },
                  { type: 3, name: 'message', description: 'Un petit mot (facultatif)', required: false, max_length: 150 },
                  { type: 7, name: 'salon', description: 'Salon vocal (par défaut : salle-gaming)', required: false, channel_types: [2] }] },
      { name: 'defis', description: 'Voir tes défis du jour Discolife', dm_permission: false },
      { name: 'annonce-jeu', description: 'Annonce une partie à tout le serveur (notif pour tout le monde)', dm_permission: false,
        options: [{ type: 3, name: 'jeu', description: 'Le jeu (ex : Valorant, GTA, Fortnite…)', required: true, max_length: 40 },
                  { type: 3, name: 'message', description: 'Un petit mot en plus (facultatif)', required: false, max_length: 150 },
                  { type: 7, name: 'salon', description: 'Le salon vocal où vous jouez (par défaut : salle-gaming)', required: false, channel_types: [2] }] },
      { name: 'classement', description: 'Classement des équipes et des joueurs Discolife', dm_permission: false },
      { name: 'profil', description: 'Voir un profil Discolife', dm_permission: false, options: [{ ...mem, required: false }] },
    ];
    const r = await this.discord('PUT', `/applications/${this.env.CLIENT_ID}/guilds/${this.env.GUILD_ID}/commands`, cmds);
    await this.ensureVipHub();
    await this.ensureAnnounceRights();
    try { await this.ensureAutomod(); } catch (e) { console.log('automod', e); }
    try { if (await this.ensureLevelRoles()) for (const q of Object.values(this.profiles)) await this.syncLevelRole(q); } catch (e) { console.log('roles', e); }
    this.ensureAlarm();
    return r;
  }
  // rôle « ⭐ VIP » + salon texte privé où les VIP commandent le bot
  async ensureVipHub() {
    if (!this.env.BOT_TOKEN) return; const g = this.env.GUILD_ID, w = this.world;
    if (!w.vipRoleId) { const r = await this.discord('POST', `/guilds/${g}/roles`, { name: '⭐ VIP', color: 0xffd84a, hoist: true, mentionable: true }); if (r) w.vipRoleId = r.id; }
    if (!w.vipCategory) { const cat = await this.discord('POST', `/guilds/${g}/channels`, { name: '🔒 SALONS VIP', type: 4 }); if (cat) w.vipCategory = cat.id; }
    if (!w.vipChannelId) {
      const VIEW = 1 << 10, SEND = 1 << 11, HIST = 1 << 16, CMDS = 2 ** 31;
      const ow = [{ id: g, type: 0, deny: String(VIEW) }];
      if (w.vipRoleId) ow.push({ id: w.vipRoleId, type: 0, allow: String(VIEW + SEND + HIST + CMDS) });
      ow.push({ id: this.env.CLIENT_ID, type: 1, allow: String(VIEW + SEND + HIST) });
      const ch = await this.discord('POST', `/guilds/${g}/channels`, { name: '🤖・bot-vip', type: 0, parent_id: w.vipCategory || undefined, topic: 'Salon privé des VIP : commande le bot Discolife ici', permission_overwrites: ow });
      if (ch) {
        w.vipChannelId = ch.id;
        await this.discord('POST', `/channels/${ch.id}/messages`, { embeds: [{ title: '🤖 Bot Discolife · salon des VIP', color: 0xffd84a,
          description: 'Ce salon est visible seulement par les ⭐ VIP. Tape `/` pour voir les commandes :',
          fields: [{ name: '👥 Ton équipe', value: '`/recruter @membre` inviter quelqu\'un (il reçoit Accepter / Refuser)\n`/retirer @membre` retirer quelqu\'un\n`/equipe nom` renommer ton salon privé 🔒' },
                   { name: '🏆 Infos', value: '`/classement` équipes et joueurs\n`/profil @membre` voir un profil' },
                   { name: 'ℹ️', value: 'Les points de l\'équipe = l\'XP gagnée par ses membres dans Discolife. Les pièces 🪙 restent perso (garage, accessoires).' }] }] });
      }
    }
    for (const t of Object.values(w.teams)) this.vipRole(t.vip, true);
    this.save();
  }
  get vcSeen() { return this._vc || (this._vc = {}); }
  async voiceMap() {
    const w = this.world; if (w.vmap && Date.now() - (w.vmapT || 0) < 600e3) return w.vmap;
    const chs = await this.discord('GET', `/guilds/${this.env.GUILD_ID}/channels`); if (!chs) return w.vmap || {};
    const m = {}; for (const c of chs) if (c.type === 2) { const n = c.name.toLowerCase(); for (const r of ROOMS) if (n.includes(r)) { m[c.id] = r; break; } }
    w.vmap = m; w.vmapT = Date.now(); this.save(); return m;
  }
  async roomForVoice(ch, p) {
    if (!ch) return null; const tm = p.team && this.world.teams[p.team]; if (tm && tm.channelId === ch) return 'team';
    return (await this.voiceMap())[ch] || null;
  }
  async voiceForRoom(r, p) {
    if (r === 'team') { const tm = p.team && this.world.teams[p.team]; return tm ? tm.channelId : null; }
    const m = await this.voiceMap(); return Object.keys(m).find(k => m[k] === r) || null;
  }
  gameChannel() { return this.env.GAME_CHANNEL_ID || this.env.ANNOUNCE_CHANNEL_ID; }
  async ensureAnnounceRights() { // le bot doit pouvoir écrire et mentionner @everyone dans le salon d'annonces
    const VIEW = 1 << 10, SEND = 1 << 11, EMBED = 1 << 14, HIST = 1 << 16, EVERY = 1 << 17;
    const ok = await this.discord('PUT', `/channels/${this.gameChannel()}/permissions/${this.env.CLIENT_ID}`, { type: 1, allow: String(VIEW + SEND + EMBED + HIST + EVERY), deny: '0' });
    this.world.annOk = ok !== null; this.save(); return this.world.annOk;
  }
  async gamingVoice() {
    if (this.world.gamingVoice) return this.world.gamingVoice;
    const chs = await this.discord('GET', `/guilds/${this.env.GUILD_ID}/channels`);
    const v = (chs || []).find(c => c.type === 2 && /gaming/i.test(c.name)); if (v) { this.world.gamingVoice = v.id; this.save(); }
    return v ? v.id : null;
  }
  gameCallMsg(c) {
    const who = c.who.length ? c.who.map(id => `<@${id}>`).join(' ') : '*personne pour l\'instant*';
    return { embeds: [{ color: 0x4fe3ff, title: `🎮 ${c.jeu} · on lance une partie !`, description: c.text + (c.extra ? `\n> ${c.extra}` : ''),
      thumbnail: c.av ? { url: c.av } : undefined,
      fields: [{ name: '🔊 Où', value: c.voice ? `<#${c.voice}>` : 'en vocal', inline: true }, { name: `✋ Partants (${c.who.length})`, value: who, inline: true }],
      footer: { text: 'Clique sur « Je viens » pour rejoindre · Discolife' } }],
      components: [{ type: 1, components: [{ type: 2, style: 3, label: 'Je viens', emoji: { name: '✋' }, custom_id: `join:${c.id}` }] }] };
  }
  propMsg(c) {
    const list = a => a.length ? a.slice(0, 15).map(id => `<@${id}>`).join(' ') + (a.length > 15 ? ` +${a.length - 15}` : '') : '—';
    return { embeds: [{ color: 0xffd84a, title: `💡 Proposition de jeu : ${c.jeu}`, url: c.link,
      description: `${c.text}\n\n📥 **[Télécharger ${c.jeu}](${c.link})** · on va bientôt y jouer ensemble !` + (c.extra ? `\n> ${c.extra}` : ''),
      thumbnail: c.av ? { url: c.av } : undefined,
      fields: [{ name: `🔥 Chauds (${c.hot.length})`, value: list(c.hot), inline: true }, { name: `📥 Téléchargé (${c.dl.length})`, value: list(c.dl), inline: true }],
      footer: { text: `Proposé par ${c.byName} · vote avec les boutons · Discolife` } }],
      components: [{ type: 1, components: [
        { type: 2, style: 1, label: 'Chaud', emoji: { name: '🔥' }, custom_id: `prop:${c.id}:hot` },
        { type: 2, style: 3, label: 'Je l\'ai téléchargé', emoji: { name: '📥' }, custom_id: `prop:${c.id}:dl` },
        { type: 2, style: 5, label: 'Télécharger', url: c.link }] }] };
  }
  vipRole(uid, add) { if (this.world.vipRoleId) this.discord(add ? 'PUT' : 'DELETE', `/guilds/${this.env.GUILD_ID}/members/${uid}/roles/${this.world.vipRoleId}`); }
  ixProfile(x) {
    const u = x.user || x, had = !!this.profiles[u.id];
    const p = this.ensureProfile({ id: u.id, name: u.global_name || u.username, avatar: u.avatar || null }, true);
    if (!had) this.bcast({ t: 'prof', p: this.pub(p) });
    return p;
  }
  async interaction(ix) {
    const W = `https://discord.com/api/v10/webhooks/${ix.application_id}/${ix.token}`;
    const call = async (method, url, body) => { for (let i = 0; i < 4; i++) { const r = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ allowed_mentions: { parse: [] }, ...body }) }); if (r.status !== 404) return r; await new Promise(z => setTimeout(z, 400)); } };
    const reply = body => call('PATCH', W + '/messages/@original', typeof body === 'string' ? { content: body } : body);
    const follow = body => call('POST', W, body);
    const m = ix.member; if (!m) return reply('Utilise les commandes Discolife sur le serveur La Maison.');
    const me = this.ixProfile(m);
    const perms = BigInt(m.permissions || '0'), isAdm = (perms & 8n) === 8n, canVip = isAdm || (perms & 268435456n) === 268435456n;
    if (isAdm && !this.world.admins.includes(me.id)) { this.world.admins.push(me.id); this.pushProf(me); }
    const T = this.world.teams;
    try {
      if (ix.type === 2) {
        const d = ix.data, sub = (d.options || [])[0];
        const opt = (o, n) => ((o && o.options) || []).find(x => x.name === n)?.value;
        const target = id => { const u = id && d.resolved?.users?.[id]; if (!u) return null; if (u.bot) return 'bot'; return this.ixProfile(u); };
        const who = (o) => { const t = target(opt(o, 'membre')); return t; };
        const hub = this.world.vipChannelId;
        if (['recruter', 'retirer', 'equipe'].includes(d.name) && hub && ix.channel_id !== hub && !isAdm) return reply(`Les commandes d'équipe se font dans le salon privé des VIP <#${hub}>.`);
        switch (d.name) {
          case 'vip': {
            if (!isAdm) return reply('🔒 Seul le boss du serveur peut nommer des VIP.');
            const t = who(sub); if (!t) return reply('Membre introuvable.'); if (t === 'bot') return reply('Pas de bots dans Discolife 🙂');
            const on = sub.name === 'ajouter';
            if (on && T[t.id]) return reply(`⭐ **${t.name}** est déjà VIP.`);
            if (!on && !T[t.id]) return reply(`**${t.name}** n'est pas VIP.`);
            await this.setVip(me, t.id, on, true);
            if (on) return reply({ content: `⭐ <@${t.id}> est maintenant **VIP** ! Son salon privé 🔒 **${T[t.id].name}** est ouvert.\nIl a accès au salon des VIP${this.world.vipChannelId ? ` <#${this.world.vipChannelId}>` : ''} pour recruter son équipe (\`/recruter\`) et renommer son salon (\`/equipe\`).`, allowed_mentions: { users: [t.id] } });
            return reply(`**${t.name}** n'est plus VIP : son équipe et son salon privé ont été supprimés.`);
          }
          case 'recruter': {
            const tm = T[me.id]; if (!tm) return reply('⭐ Seuls les VIP peuvent recruter. Demande à un admin : `/vip ajouter`.');
            const t = who(d); if (!t) return reply('Membre introuvable.'); if (t === 'bot') return reply('Pas de bots dans Discolife 🙂');
            if (t.id === me.id) return reply('Tu es déjà dans ton équipe 😄');
            if (t.team) return reply(`**${t.name}** est déjà dans une équipe.`);
            this.recruit(me, t.id);
            const inviteMsg = { content: `👥 <@${t.id}>, ⭐ **${me.name}** t'invite dans son équipe **${tm.name}** !\nSi tu acceptes, tu auras accès au salon privé 🔒 **${tm.name}** et tes points compteront pour l'équipe.`, allowed_mentions: { users: [t.id] },
              components: [{ type: 1, components: [{ type: 2, style: 3, label: 'Accepter', emoji: { name: '✅' }, custom_id: `inv:${t.id}:1` }, { type: 2, style: 4, label: 'Refuser', custom_id: `inv:${t.id}:0` }] }] };
            const ch = this.env.ANNOUNCE_CHANNEL_ID;
            if (ch && ch !== ix.channel_id && await this.discord('POST', `/channels/${ch}/messages`, inviteMsg)) return reply(`📨 Invitation envoyée à **${t.name}** dans <#${ch}> (il peut aussi accepter dans Discolife).`);
            return reply(inviteMsg);
          }
          case 'retirer': {
            const tm = T[me.id]; if (!tm) return reply('⭐ Seuls les VIP ont une équipe à gérer.');
            const t = who(d); if (!t || t === 'bot' || !tm.members.includes(t.id) || t.id === me.id) return reply('Ce membre n\'est pas dans ton équipe.');
            this.kick(me, t.id); return reply(`**${t.name}** a été retiré de ton équipe.`);
          }
          case 'equipe': {
            if (!T[me.id]) return reply('⭐ Seuls les VIP peuvent renommer leur salon privé.');
            await this.teamName(me, opt(d, 'nom')); return reply(`✏️ Ton salon privé s'appelle maintenant 🔒 **${T[me.id].name}**.`);
          }
          case 'quitter': {
            const tm = me.team && T[me.team]; if (!tm) return reply('Tu n\'es dans aucune équipe.');
            if (tm.vip === me.id) return reply('Tu es le VIP de cette équipe : un admin peut te retirer le statut avec `/vip retirer`.');
            this.leaveTeam(me); return reply(`Tu as quitté l'équipe **${tm.name}**.`);
          }
          case 'proposer-jeu': {
            const jeu = clean(opt(d, 'jeu'), 40), extra = clean(opt(d, 'message') || '', 150); let link = (opt(d, 'lien') || '').trim();
            if (!jeu) return reply('Donne le nom du jeu 🎮');
            if (link && !/^https?:\/\/\S+$/i.test(link)) return reply('Le lien doit commencer par https://');
            if (!link) link = `https://www.google.com/search?q=${encodeURIComponent(jeu + ' télécharger')}`;
            if (!isAdm && this.limited(me.id, 'prop', 60 * 60e3)) return reply('⏳ Tu as déjà proposé un jeu il y a moins d\'une heure.');
            const T_ = [`**${me.name}** propose **${jeu}** ! Téléchargez-le, on va bientôt y jouer 🎮`, `Nouveau jeu en vue 👀 **${me.name}** veut qu'on se lance sur **${jeu}**. Préparez vos PC !`,
                        `📣 **${me.name}** a trouvé notre prochain jeu : **${jeu}**. Téléchargez-le dès maintenant, la partie arrive bientôt 🔥`];
            const c = { id: (this.world.seq = (this.world.seq || 0) + 1).toString(36), by: me.id, byName: me.name, jeu, extra, link, text: T_[Math.floor(Math.random() * T_.length)],
              av: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128` : null, hot: [me.id], dl: [], t: Date.now() };
            const ping = isAdm || !!T[me.id];
            const body = { content: ping ? '@everyone' : '', allowed_mentions: { parse: ping ? ['everyone'] : [], users: [] }, ...this.propMsg(c) };
            let sent = await this.discord('POST', `/channels/${this.gameChannel()}/messages`, body);
            if (!sent && await this.ensureAnnounceRights()) sent = await this.discord('POST', `/channels/${this.gameChannel()}/messages`, body);
            if (!sent) return reply('❌ Le bot n\'a pas pu poster dans le salon d\'annonces.');
            this.world.props = this.world.props || {}; this.world.props[c.id] = c; const ids = Object.keys(this.world.props); if (ids.length > 30) delete this.world.props[ids[0]];
            this.log('info', me.name, `propose le jeu 💡 ${jeu}`, 'salle-gaming');
            return reply(`💡 Ta proposition est postée dans <#${this.gameChannel()}>${ping ? ' avec une notif pour tout le monde' : ''} !`);
          }
          case 'soiree': {
            const jeu = clean(opt(d, 'jeu'), 40), extra = clean(opt(d, 'message') || '', 150);
            const hm = (opt(d, 'heure') || '').toLowerCase().match(/^(\d{1,2})\s*[h:]\s*(\d{0,2})$/); if (!hm) return reply('Heure invalide : écris par exemple **21h** ou **21:30**.');
            const H = +hm[1], Mi = +(hm[2] || 0); if (H > 23 || Mi > 59) return reply('Heure invalide.');
            const now = paris(); let y = now.getFullYear(), mo = now.getMonth(), dd = now.getDate();
            const dm = opt(d, 'date'); if (dm) { const x = dm.match(/^(\d{1,2})\/(\d{1,2})$/); if (!x) return reply('Date invalide : écris par exemple **15/11**.'); dd = +x[1]; mo = +x[2] - 1; }
            let ts = parisToUTC(y, mo, dd, H, Mi); if (ts < Date.now() - 60e3) { if (dm) ts = parisToUTC(y + 1, mo, dd, H, Mi); else ts += 864e5; }
            if (ts - Date.now() > 60 * 864e5) return reply('La soirée doit être dans les 60 prochains jours.');
            if (!isAdm && this.limited(me.id, 'soiree', 30 * 60e3)) return reply('⏳ Tu as déjà planifié une soirée il y a moins de 30 min.');
            const ping = isAdm || !!T[me.id];
            const e = { id: (this.world.seq = (this.world.seq || 0) + 1).toString(36), by: me.id, byName: me.name, jeu, extra, ts, yes: [me.id], maybe: [], ping, voice: opt(d, 'salon') || await this.gamingVoice(), reminded: ts - Date.now() < 15 * 60e3 };
            const sent = await this.discord('POST', `/channels/${this.gameChannel()}/messages`, { content: ping ? '@everyone' : '', allowed_mentions: { parse: ping ? ['everyone'] : [] }, ...this.eventMsg(e) });
            if (!sent) return reply('❌ Le bot n\'a pas pu poster la soirée.');
            this.world.events = this.world.events || {}; this.world.events[e.id] = e; this.ensureAlarm();
            this.log('info', me.name, `organise une soirée 🎮 ${jeu}`, 'salle-gaming');
            return reply(`📅 Soirée **${jeu}** planifiée <t:${Math.floor(ts / 1000)}:F> dans <#${this.gameChannel()}>. Rappel automatique 15 min avant !`);
          }
          case 'defis': {
            const dl = this.dailyOf(me);
            return reply({ embeds: [{ color: 0x3bd16f, title: '🎯 Tes défis du jour', description: dl.list.map(c => `${c.done ? '✅' : c.e} **${c.n}** · ${c.prog}/${c.goal}${c.done ? '' : ' · +30 🪙'}`).join('\n') + `\n\n${dl.bonus ? '🏅 Bonus des 3 défis récupéré !' : 'Boucle les 3 pour **+50 🪙** bonus.'}`, footer: { text: 'Nouveaux défis chaque jour à minuit · Discolife' } }] });
          }
          case 'annonce-jeu': {
            const jeu = clean(opt(d, 'jeu'), 40), extra = clean(opt(d, 'message') || '', 150);
            if (!jeu) return reply('Donne le nom du jeu 🎮');
            if (!isAdm && this.limited(me.id, 'annjeu', 30 * 60e3)) return reply('⏳ Tu as déjà fait une annonce il y a moins de 30 min.');
            if (!isAdm && this.limited('all', 'annjeu', 5 * 60e3)) return reply('⏳ Une partie vient d\'être annoncée, attends quelques minutes.');
            const T_ = [`**${me.name}** lance une partie de **${jeu}** et cherche des joueurs ! 🔥`, `Qui est chaud pour du **${jeu}** ? **${me.name}** vous attend 😎`,
                        `🚨 Partie de **${jeu}** en approche ! **${me.name}** monte une équipe, ramenez-vous`, `**${me.name}** a envie de jouer à **${jeu}**. Qui le suit ? 🎯`];
            const c = { id: (this.world.seq = (this.world.seq || 0) + 1).toString(36), by: me.id, jeu, extra, text: T_[Math.floor(Math.random() * T_.length)],
              voice: opt(d, 'salon') || await this.gamingVoice(), av: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128` : null, who: [me.id], t: Date.now() };
            const body = { content: '@everyone', allowed_mentions: { parse: ['everyone'], users: [] }, ...this.gameCallMsg(c) };
            let sent = await this.discord('POST', `/channels/${this.gameChannel()}/messages`, body);
            if (!sent && await this.ensureAnnounceRights()) sent = await this.discord('POST', `/channels/${this.gameChannel()}/messages`, body);
            if (!sent) return reply('❌ Le bot n\'a pas le droit de mentionner @everyone dans le salon d\'annonces. Le boss doit lui donner la permission « Mentionner @everyone ».');
            this.world.gameCalls = this.world.gameCalls || {}; this.world.gameCalls[c.id] = c;
            const ids = Object.keys(this.world.gameCalls); if (ids.length > 30) delete this.world.gameCalls[ids[0]];
            me.playing = { g: jeu, t: Date.now() }; this.pushProf(me); this.log('info', me.name, `annonce une partie de 🎮 ${jeu}`, 'salle-gaming');
            return reply(`📢 C'est annoncé dans <#${this.gameChannel()}> avec une notif pour tout le monde !`);
          }
          case 'classement': {
            const tms = Object.values(T).sort((a, b) => b.score - a.score);
            const top = Object.values(this.profiles).sort((a, b) => b.lvl - a.lvl || b.xp - a.xp).slice(0, 5);
            const md = ['🥇', '🥈', '🥉'];
            return reply({ embeds: [{ title: '🏆 Classement Discolife', color: 0xa66bff,
              fields: [{ name: '👥 Équipes', value: tms.length ? tms.slice(0, 8).map((t, i) => `${md[i] || `**${i + 1}.**`} **${t.name}** · ⭐ ${t.vipName} · ${t.members.length} membre${t.members.length > 1 ? 's' : ''} — **${t.score} pts**`).join('\n') : 'Aucune équipe pour l\'instant (`/vip ajouter`).' },
                       { name: '⭐ Joueurs', value: top.length ? top.map((p, i) => `${md[i] || `**${i + 1}.**`} **${p.name}** — niveau ${p.lvl} · ${roleOf(p.lvl)}`).join('\n') : '—' }] }] });
          }
          case 'profil': {
            const t = opt(d, 'membre') ? who(d) : me; if (!t || t === 'bot') return reply('Membre introuvable.');
            const tm = t.team && T[t.team];
            return reply({ embeds: [{ title: `${T[t.id] ? '⭐ ' : ''}${t.name}`, color: tm ? parseInt(tm.col.slice(1), 16) : 0x5865f2,
              thumbnail: t.avatar ? { url: `https://cdn.discordapp.com/avatars/${t.id}/${t.avatar}.png?size=128` } : undefined,
              description: `Niveau **${t.lvl}** · ${roleOf(t.lvl)}\n${tm ? `Équipe **${tm.name}**` : 'Pas d\'équipe'}`,
              fields: [{ name: '🪙 Pièces', value: String(t.coins), inline: true }, { name: '🎙️ Vocal', value: `${Math.floor((t.voiceSec || 0) / 60)} min`, inline: true }, { name: '🔥 Série', value: `${t.streak || 0} j`, inline: true },
                       { name: '🏁 Courses', value: String(t.stats.races || 0), inline: true }, { name: '⚔️ Duels', value: String(t.stats.duels || 0), inline: true }, { name: '🏅 Badges', value: String(t.badges.length), inline: true }] }] });
          }
        }
        return reply('Commande inconnue.');
      }
      if (ix.type === 3) {
        const [k, to, ok] = (ix.data.custom_id || '').split(':');
        if (k === 'ev') {
          const e = (this.world.events || {})[to]; if (!e) return follow({ content: '⌛ Cette soirée est terminée.', flags: 64 });
          e.yes = e.yes.filter(x => x !== me.id); e.maybe = e.maybe.filter(x => x !== me.id);
          if (ok === 'yes') e.yes.push(me.id); else if (ok === 'maybe') e.maybe.push(me.id);
          await reply({ allowed_mentions: { parse: [] }, ...this.eventMsg(e) });
          if (ok === 'yes') this.log('info', me.name, `vient à la soirée 🎮 ${e.jeu}`, 'salle-gaming');
          return;
        }
        if (k === 'prop') {
          const c = (this.world.props || {})[to]; if (!c) return follow({ content: '⌛ Cette proposition est trop ancienne.', flags: 64 });
          const arr = ok === 'dl' ? c.dl : c.hot, i = arr.indexOf(me.id); if (i >= 0) arr.splice(i, 1); else arr.push(me.id);
          if (ok === 'dl' && i < 0 && !c.hot.includes(me.id)) c.hot.push(me.id);
          await reply({ allowed_mentions: { parse: [] }, ...this.propMsg(c) });
          if (i < 0) this.log('info', me.name, ok === 'dl' ? `a téléchargé 📥 ${c.jeu}` : `est chaud pour 🔥 ${c.jeu}`, 'salle-gaming');
          return;
        }
        if (k === 'join') {
          const c = (this.world.gameCalls || {})[to]; if (!c) return follow({ content: '⌛ Cette partie est terminée.', flags: 64 });
          const i = c.who.indexOf(me.id); if (i >= 0) { if (me.id !== c.by) c.who.splice(i, 1); } else c.who.push(me.id);
          await reply({ allowed_mentions: { parse: [] }, ...this.gameCallMsg(c) });
          if (i < 0) { this.log('info', me.name, `rejoint la partie de 🎮 ${c.jeu}`, 'salle-gaming'); if (c.by !== me.id) this.toUser(c.by, { t: 'toast', text: `✋ ${me.name} vient jouer à ${c.jeu} !` }); }
          return;
        }
        if (k !== 'inv') return;
        if (me.id !== to) return follow({ content: 'Cette invitation n\'est pas pour toi 😉', flags: 64 });
        const inv = this.world.invites[to]; const tm = inv && T[inv.tid];
        if (!inv || !tm) return reply({ content: '⌛ Cette invitation n\'est plus valable.', components: [] });
        if (ok === '1' && me.team) { delete this.world.invites[to]; return reply({ content: `**${me.name}** est déjà dans une équipe.`, components: [] }); }
        await this.recruitAns(me, ok === '1');
        this.toUser(me.id, { t: 'inviteDone' });
        return reply(ok === '1' ? { content: `✅ <@${me.id}> rejoint l'équipe **${tm.name}** et a maintenant accès au salon privé 🔒 !`, components: [], allowed_mentions: { users: [] } } : { content: `❌ **${me.name}** a refusé l'invitation de **${tm.vipName}**.`, components: [] });
      }
    } finally { this.save(); }
  }

  // ------------------------------------------------------------ lien avec le vrai serveur Discord (optionnel : BOT_TOKEN)
  async discord(method, path, body) {
    if (!this.env.BOT_TOKEN) return null;
    try {
      const r = await fetch(`https://discord.com/api/v10${path}`, { method, headers: { authorization: `Bot ${this.env.BOT_TOKEN}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (r.status === 204) return {}; const d = await r.json().catch(() => ({})); if (!r.ok) { console.log('discord', path, r.status, JSON.stringify(d)); return null; } return d;
    } catch (e) { console.log('discord err', e); return null; }
  }
  announce(text) { if (this.env.ANNOUNCE_CHANNEL_ID) this.discord('POST', `/channels/${this.env.ANNOUNCE_CHANNEL_ID}/messages`, { content: text, allowed_mentions: { parse: [] } }); }
  async syncTeamCreate(t) {
    if (!this.env.BOT_TOKEN) return; const g = this.env.GUILD_ID;
    const role = await this.discord('POST', `/guilds/${g}/roles`, { name: `Équipe ${t.name}`, color: parseInt(t.col.slice(1), 16), mentionable: true });
    if (role) t.roleId = role.id;
    if (!this.world.vipCategory) { const cat = await this.discord('POST', `/guilds/${g}/channels`, { name: '🔒 SALONS VIP', type: 4 }); if (cat) this.world.vipCategory = cat.id; }
    const VIEW = 1 << 10, CONNECT = 1 << 20, SPEAK = 1 << 21;
    const ow = [{ id: g, type: 0, deny: String(VIEW) }];
    if (t.roleId) ow.push({ id: t.roleId, type: 0, allow: String(VIEW | CONNECT | SPEAK) });
    const ch = await this.discord('POST', `/guilds/${g}/channels`, { name: `🔒・${t.name}`, type: 2, parent_id: this.world.vipCategory || undefined, permission_overwrites: ow });
    if (ch) t.channelId = ch.id;
    this.discordRole(t.vip, t, true); this.save();
  }
  async syncTeamDelete(t) { if (t.channelId) await this.discord('DELETE', `/channels/${t.channelId}`); if (t.roleId) await this.discord('DELETE', `/guilds/${this.env.GUILD_ID}/roles/${t.roleId}`); }
  discordRole(uid, t, add) { if (t.roleId) this.discord(add ? 'PUT' : 'DELETE', `/guilds/${this.env.GUILD_ID}/members/${uid}/roles/${t.roleId}`); }

  // ------------------------------------------------------------ duel 1v1 (entre deux vrais joueurs)
  duelChallenge(p, to) {
    const q = this.profiles[to]; if (!q || to === p.id || !this.online()[to]) return this.toast(p.id, 'Ce joueur n\'est pas en ligne');
    if (Object.values(this.games.duels).some(d => d.state !== 'done' && [d.a, d.b].some(x => x === p.id || x === to))) return this.toast(p.id, 'Un de vous deux est déjà en duel');
    const gid = 'd' + Date.now().toString(36);
    const d = this.games.duels[gid] = { id: gid, a: p.id, b: to, an: p.name, bn: q.name, hp: { [p.id]: 100, [to]: 100 }, turn: p.id, state: 'pending', log: `${p.name} défie ${q.name} !` };
    this.log('fight', p.name, `défie ${q.name} en duel 1v1`, 'arcade');
    this.bcast({ t: 'duel', d });
    setTimeout(() => { if (d.state === 'pending') { d.state = 'done'; d.log = `${q.name} n'a pas répondu`; this.bcast({ t: 'duel', d }); delete this.games.duels[gid]; } }, 30000);
  }
  duelAnswer(p, gid, ok) {
    const d = this.games.duels[gid]; if (!d || d.state !== 'pending' || d.b !== p.id) return;
    if (!ok) { d.state = 'done'; d.log = `${d.bn} refuse le duel`; this.bcast({ t: 'duel', d }); delete this.games.duels[gid]; return; }
    d.state = 'live'; d.log = `Le duel commence ! À ${d.an} de jouer.`; this.bcast({ t: 'duel', d });
  }
  duelAct(p, gid, k) {
    const d = this.games.duels[gid]; if (!d || d.state !== 'live' || d.turn !== p.id) return;
    const other = d.a === p.id ? d.b : d.a, on = d.a === p.id ? d.bn : d.an;
    if (k === 1) { const x = Math.floor(rnd(10, 25)); d.hp[other] -= x; d.log = `${p.name} attaque ${on} ! -${x}`; }
    else if (k === 2) { if (Math.random() < .4) d.log = `${p.name} rate son coup spécial…`; else { const x = Math.floor(rnd(30, 46)); d.hp[other] -= x; d.log = `${p.name} place un coup spécial ! -${x}`; } }
    else { const x = Math.floor(rnd(15, 26)); d.hp[p.id] = Math.min(100, d.hp[p.id] + x); d.log = `${p.name} se soigne +${x}`; }
    if (d.hp[other] <= 0) {
      d.state = 'done'; d.winner = p.id; d.log += ` — ${p.name} gagne le duel !`;
      p.coins += 30; p.stats.duels++; this.addXP(p, 40); this.badge(p, 'duel_win'); this.progress(p, 'duel');
      const o = this.profiles[other]; if (o) { this.addXP(o, 10); this.pushProf(o); }
      this.log('fight', p.name, `gagne le duel contre ${on} · +30 🪙`, 'arcade'); this.announce(`⚔️ **${p.name}** bat **${on}** en duel dans Discolife !`); this.pushProf(p);
      this.bcast({ t: 'duel', d }); setTimeout(() => delete this.games.duels[gid], 15000); return;
    }
    d.turn = other; this.bcast({ t: 'duel', d });
  }

  // ------------------------------------------------------------ course (2 joueurs minimum)
  raceView() { const r = this.games.race; if (!r) return null; return { id: r.id, state: r.state, t: r.t, players: Object.values(r.players).map(x => ({ id: x.id, n: x.n, p: x.p })), order: r.order }; }
  raceJoin(p) {
    let r = this.games.race;
    if (!r || r.state === 'done') {
      r = this.games.race = { id: Date.now(), state: 'lobby', t: Date.now() + 12000, players: {}, order: [] };
      this.log('race', p.name, 'ouvre une course : 12 s pour rejoindre !', 'arcade');
      setTimeout(() => this.raceStart(r.id), 12000);
    }
    if (r.state !== 'lobby' || r.players[p.id]) return;
    r.players[p.id] = { id: p.id, n: p.name, p: 0, last: 0 };
    this.bcast({ t: 'race', r: this.raceView() });
  }
  raceStart(id) {
    const r = this.games.race; if (!r || r.id !== id) return;
    if (Object.keys(r.players).length < 2) { r.state = 'done'; r.cancel = true; this.bcast({ t: 'race', r: { ...this.raceView(), cancel: 'Pas assez de pilotes (2 minimum)' } }); return; }
    r.state = 'count'; r.t = Date.now() + 3000; this.bcast({ t: 'race', r: this.raceView() });
    setTimeout(() => { r.state = 'live'; this.bcast({ t: 'race', r: this.raceView() }); r.iv = setInterval(() => this.bcast({ t: 'race', r: this.raceView() }), 200); setTimeout(() => this.raceEnd(r, true), 45000); }, 3000);
  }
  racePress(p) {
    const r = this.games.race; if (!r || r.state !== 'live') return; const x = r.players[p.id]; if (!x || x.p >= 1) return;
    const t = Date.now(); if (t - x.last < 60) return; x.last = t; x.p = Math.min(1, x.p + .02);
    if (x.p >= 1) { r.order.push(x.id); this.progress(p, 'race'); if (r.order.length === 1) { p.coins += 30; p.stats.races++; this.addXP(p, 40); this.badge(p, 'race_win'); this.log('race', p.name, 'gagne la course ! +30 🪙', 'arcade'); this.announce(`🏁 **${p.name}** gagne la course dans Discolife !`); this.pushProf(p); } }
    if (r.order.length >= Math.min(3, Object.keys(r.players).length)) this.raceEnd(r);
  }
  raceEnd(r, timeout) { if (r.state === 'done') return; r.state = 'done'; clearInterval(r.iv); Object.values(r.players).sort((a, b) => b.p - a.p).forEach(x => { if (!r.order.includes(x.id)) r.order.push(x.id); }); this.bcast({ t: 'race', r: this.raceView() }); }

  // ------------------------------------------------------------ test de clic (2 joueurs minimum)
  clickView() { const c = this.games.click; if (!c) return null; return { id: c.id, state: c.state, t: c.t, players: Object.values(c.players).map(x => ({ id: x.id, n: x.n, ms: x.ms, early: x.early })) }; }
  clickJoin(p) {
    let c = this.games.click;
    if (!c || c.state === 'done') {
      c = this.games.click = { id: Date.now(), state: 'lobby', t: Date.now() + 10000, players: {} };
      this.log('click', p.name, 'lance un test de clic : 10 s pour rejoindre !', 'arcade');
      setTimeout(() => this.clickStart(c.id), 10000);
    }
    if (c.state !== 'lobby' || c.players[p.id]) return;
    c.players[p.id] = { id: p.id, n: p.name, ms: null, early: false };
    this.bcast({ t: 'click', c: this.clickView() });
  }
  clickStart(id) {
    const c = this.games.click; if (!c || c.id !== id) return;
    if (Object.keys(c.players).length < 2) { c.state = 'done'; this.bcast({ t: 'click', c: { ...this.clickView(), cancel: 'Pas assez de joueurs (2 minimum)' } }); return; }
    c.state = 'wait'; this.bcast({ t: 'click', c: this.clickView() });
    setTimeout(() => { c.state = 'go'; this.bcast({ t: 'click', c: this.clickView() }); setTimeout(() => this.clickEnd(c), 3500); }, rnd(1500, 4000));
  }
  clickHit(p, ms, early) {
    const c = this.games.click; if (!c || !['wait', 'go'].includes(c.state)) return; const x = c.players[p.id]; if (!x || x.ms !== null || x.early) return;
    if (early || c.state === 'wait') { x.early = true; } else x.ms = Math.max(80, Math.min(3000, Math.round(+ms || 3000)));
    this.bcast({ t: 'click', c: this.clickView() });
    if (Object.values(c.players).every(y => y.ms !== null || y.early)) this.clickEnd(c);
  }
  clickEnd(c) {
    if (c.state === 'done') return; c.state = 'done';
    const ranked = Object.values(c.players).filter(x => x.ms !== null).sort((a, b) => a.ms - b.ms);
    for (const x of Object.values(c.players)) this.progress(this.profiles[x.id], 'click');
    if (ranked.length) {
      const w = this.profiles[ranked[0].id]; w.coins += 20; this.addXP(w, 30);
      w.stats.clickBest = Math.min(w.stats.clickBest || 9999, ranked[0].ms); if (ranked[0].ms < 250) this.badge(w, 'click_fast');
      const rec = this.world.records.click; if (!rec || ranked[0].ms < rec.ms) { this.world.records.click = { ms: ranked[0].ms, n: w.name }; this.log('click', w.name, `bat le record du serveur au test de clic : ${ranked[0].ms} ms !`, 'arcade'); this.pushWorld(); }
      else this.log('click', w.name, `gagne le test de clic en ${ranked[0].ms} ms · +20 🪙`, 'arcade');
      this.pushProf(w);
    }
    this.bcast({ t: 'click', c: this.clickView() });
  }
}
