// « Discord vivant » : le serveur bouge tout seul, comme Discolife.
// Salons stats en direct, vocaux à la demande, question du jour, quiz express, coffres surprise, anniversaires,
// comptage collectif, duels à mise, mot mystère, membre de la semaine, starboard automatique, journal du matin, bannière.
import { FURN } from './social.js';

const QOTD = [
  'Pire jeu auquel tu as joué de ta vie ?', 'Si tu pouvais vivre dans un jeu vidéo, lequel ?', 'Ton plat préféré de tous les temps ?', 'La série que tu conseillerais à tout le monde ?',
  'Ton pire fail en public ?', 'Super-pouvoir de rêve ?', 'La voiture de tes rêves ?', 'Le son que tu écoutes en boucle en ce moment ?',
  'Pizza ananas : oui ou non ? Défends ta position.', 'Ton meilleur souvenir de vacances ?', 'Le jeu qui t\'a le plus marqué enfant ?', 'Si tu gagnais 1 million demain, première dépense ?',
  'Ton film culte ?', 'Matin ou soir ?', 'Le pire cadeau que tu as reçu ?', 'Une compétence que tu aimerais apprendre ?',
  'Ton emoji le plus utilisé ?', 'Chat ou chien ?', 'Le meilleur personnage de jeu vidéo ?', 'Ta destination de voyage de rêve ?',
  'Le dernier truc qui t\'a fait rire aux larmes ?', 'Ton snack de session gaming ?', 'PC, console ou mobile ?', 'Le métier que tu voulais faire petit ?',
  'Ta plus grosse rage quit ?', 'Un talent caché ?', 'Le meilleur album de tous les temps ?', 'Tu préfères : jamais plus de musique ou jamais plus de films ?',
  'La pire mode que tu as suivie ?', 'Ton spot préféré dans ta ville ?', 'Le meilleur anime / dessin animé ?', 'Quel jeu on devrait tous lancer ce week-end ?',
  'Ton pire boss de jeu vidéo ?', 'Le meilleur fast-food ?', 'Si tu étais un objet de la maison Discolife, lequel ?', 'Ta citation préférée ?',
  'Le pays où tu aimerais vivre ?', 'Ton record perso dont tu es fier ?', 'Le dernier achat inutile que tu as fait ?', 'Une appli que tu ne peux pas lâcher ?',
];
const QUIZ = [
  ['Combien de joueurs dans une équipe de foot sur le terrain ?', ['11', 'onze']], ['Quelle est la capitale de l\'Australie ?', ['canberra']],
  ['Quel plombier moustachu porte une casquette rouge ?', ['mario']], ['Combien de côtés a un hexagone ?', ['6', 'six']],
  ['Quelle planète est surnommée la planète rouge ?', ['mars']], ['Dans Minecraft, quel monstre vert explose ?', ['creeper', 'un creeper']],
  ['Quel est le plus grand océan du monde ?', ['pacifique', 'l\'ocean pacifique', 'ocean pacifique']], ['En quelle année l\'homme a marché sur la Lune ?', ['1969']],
  ['Quel pays a gagné la Coupe du monde de foot 2018 ?', ['france', 'la france']], ['Combien font 12 × 12 ?', ['144']],
  ['Quel est le métal le plus précieux : or ou argent ?', ['or', 'l\'or']], ['Quel animal est le plus rapide sur terre ?', ['guepard', 'le guepard']],
  ['Dans quel jeu construit-on avec des blocs et affronte-t-on l\'Ender Dragon ?', ['minecraft']], ['Quelle est la langue la plus parlée au monde ?', ['anglais', 'mandarin', 'chinois']],
  ['Combien de minutes dans une heure et demie ?', ['90', 'quatre-vingt-dix']], ['Quel hérisson bleu est la mascotte de Sega ?', ['sonic']],
  ['Quelle est la monnaie du Japon ?', ['yen', 'le yen']], ['Qui a peint la Joconde ?', ['leonard de vinci', 'de vinci', 'vinci', 'leonard']],
  ['Quel est le plus long fleuve de France ?', ['loire', 'la loire']], ['Combien de cases sur un échiquier ?', ['64', 'soixante-quatre']],
  ['Dans Fortnite, comment s\'appelle la zone qui rétrécit ?', ['tempete', 'la tempete', 'storm', 'zone']], ['Quel gaz respirons-nous pour vivre ?', ['oxygene', 'l\'oxygene', 'o2']],
  ['Quelle marque fabrique la PlayStation ?', ['sony']], ['Combien de continents sur Terre (réponse classique en France) ?', ['5', 'cinq', '6', 'six', '7', 'sept']],
  ['Quel est le symbole chimique de l\'eau ?', ['h2o']], ['Dans quel pays se trouve la tour de Pise ?', ['italie', 'l\'italie']],
  ['Combien de pattes a une araignée ?', ['8', 'huit']], ['Quelle couleur obtient-on en mélangeant bleu et jaune ?', ['vert', 'le vert']],
  ['Quel est le personnage principal de Zelda (celui qu\'on joue) ?', ['link']], ['Quelle ville est surnommée la Ville Lumière ?', ['paris']],
];
const WORDS = ['banane', 'tornade', 'pingouin', 'galaxie', 'trompette', 'cactus', 'volcan', 'sardine', 'parapluie', 'dinosaure', 'citrouille', 'boussole', 'kangourou', 'moustache', 'baguette', 'chocolat',
  'licorne', 'toboggan', 'crocodile', 'escargot', 'aspirateur', 'girafe', 'brioche', 'fusee', 'chaussette', 'arcenciel', 'piscine', 'trampoline', 'hamster', 'saucisson', 'bonbon', 'pirate', 'robot',
  'raclette', 'tracteur', 'flamant', 'ananas', 'cornichon', 'grenouille', 'papillon', 'manette', 'pastèque', 'camembert', 'karaoke', 'igloo', 'requin', 'sorcier', 'trottinette', 'popcorn', 'koala'];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9' -]/g, '').replace(/\s+/g, ' ').trim();
const parisNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const rndInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const SITE = 'https://discolife.warren-molongo.workers.dev';

export function installLive(House) {
  Object.assign(House.prototype, {
    L() { const w = this.world; if (!w.live) w.live = {}; const L = w.live; L.temp = L.temp || {}; L.count = L.count || { n: 0, last: null, record: 0 }; L.starred = L.starred || []; return L; },
    liveProfile(uid) {
      const S = this.srv(), m = S.mem[uid]; if (this.profiles[uid]) return this.profiles[uid];
      return this.ensureProfile({ id: uid, name: (m && m.name) || 'membre', avatar: (m && m.avatar) || null }, true);
    },
    liveStat(uid, k, n = 1) {
      const L = this.L(), d = dayKey(); if (!L.day || L.day.d !== d) { L.yday = L.day || null; L.day = { d, msgs: 0, voice: 0, joins: 0, users: {} }; }
      const u = L.day.users[uid] = L.day.users[uid] || { m: 0, v: 0 }; if (k === 'm') { u.m += n; L.day.msgs += n; } else { u.v += n; L.day.voice += n; }
      const wk = this.weekKeyL(); if (!L.wk || L.wk.k !== wk) { L.lastWk = L.wk || null; L.wk = { k: wk, users: {} }; }
      const x = L.wk.users[uid] = L.wk.users[uid] || { m: 0, v: 0 }; if (k === 'm') x.m += n; else x.v += n;
    },
    weekKeyL() { const d = parisNow(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
    async chanId(re, type = 0) { return this.channelByName(re, type); },

    // ---------------------------------------------------------------- création des salons utiles
    async ensureLive() {
      const g = this.env.GUILD_ID, L = this.L(), CONNECT = 1 << 20, VIEW = 1 << 10, SEND = 1 << 11;
      const chs = await this.discord('GET', `/guilds/${g}/channels`); if (!chs) return;
      const find = (re, type) => chs.find(c => c.type === type && re.test(c.name));
      const voiceParent = (find(/garage/i, 2) || find(/g[ée]n[ée]ral/i, 2) || {}).parent_id || null;
      const textParent = (find(/mini-jeux/i, 0) || find(/g[ée]n[ée]ral/i, 0) || {}).parent_id || null;
      if (!L.countCh || !chs.some(c => c.id === L.countCh)) { const ex = find(/comptage/i, 0); const c = ex || await this.discord('POST', `/guilds/${g}/channels`, { name: '🔢・comptage', type: 0, parent_id: textParent || undefined, topic: 'Comptez ensemble : 1, 2, 3… Un nombre par message, pas deux fois de suite la même personne. Record : 0' }); if (c) L.countCh = c.id; }
      if (!L.createVc || !chs.some(c => c.id === L.createVc)) { const ex = find(/cr[ée]er un salon/i, 2); const c = ex || await this.discord('POST', `/guilds/${g}/channels`, { name: '➕ Créer un salon', type: 2, parent_id: voiceParent || undefined }); if (c) L.createVc = c.id; }
      if (!L.statCat || !chs.some(c => c.id === L.statCat)) {
        const cat = await this.discord('POST', `/guilds/${g}/channels`, { name: '📊 EN DIRECT', type: 4, position: 0 }); if (cat) L.statCat = cat.id; L.stat = {};
        for (const k of ['on', 'voice', 'members']) { const c = await this.discord('POST', `/guilds/${g}/channels`, { name: k === 'on' ? '🟢 Discolife : …' : k === 'voice' ? '🔊 En vocal : …' : '👥 Membres : …', type: 2, parent_id: L.statCat, permission_overwrites: [{ id: g, type: 0, deny: String(CONNECT), allow: String(VIEW) }] }); if (c) L.stat[k] = c.id; }
        await this.discord('PATCH', `/guilds/${g}/channels`, [{ id: L.statCat, position: 0 }]);
      }
      this.save();
    },

    // ---------------------------------------------------------------- tic régulier (appelé par l'alarme)
    async liveTick() {
      if (!this.env.BOT_TOKEN) return; const L = this.L(), now = Date.now(), d = parisNow(), h = d.getHours() + d.getMinutes() / 60, today = dayKey();
      // temps de vocal
      const S = this.srv(); for (const [u, v] of Object.entries(S.voice)) { if (!v.acc) v.acc = now; const sec = Math.floor((now - v.acc) / 1000); if (sec >= 30) { v.acc = now; if (v.ch !== L.createVc && !(L.stat && Object.values(L.stat).includes(v.ch))) this.liveStat(u, 'v', sec); const p = this.profiles[u]; if (p && !this.online()[u]) p.vocSec = (p.vocSec || 0) + sec; } }
      // planning du jour
      if (!L.sched || L.sched.d !== today) {
        const at = (h0, h1) => { const base = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' })); base.setHours(0, 0, 0, 0); return rndInt(h0 * 60, h1 * 60); };
        L.sched = { d: today, quiz: [at(13, 16), at(19, 22)].sort((a, b) => a - b), drop: [at(11, 14), at(16, 19), at(20, 23)].sort((a, b) => a - b), done: {} };
        L.word = { w: WORDS[rndInt(0, WORDS.length - 1)], found: null, d: today };
      }
      const mins = d.getHours() * 60 + d.getMinutes(), done = L.sched.done;
      if (mins >= 9 * 60 && !done.journal) { done.journal = 1; await this.postJournal(); await this.birthdays(); }
      if (mins >= 18 * 60 && !done.qotd) { done.qotd = 1; await this.postQotd(); }
      for (let i = 0; i < L.sched.quiz.length; i++) if (mins >= L.sched.quiz[i] && !done['q' + i] && this.gwAlive()) { done['q' + i] = 1; await this.postQuiz(); }
      for (let i = 0; i < L.sched.drop.length; i++) if (mins >= L.sched.drop[i] && !done['d' + i]) { done['d' + i] = 1; await this.postDrop(); }
      if (L.quiz && !L.quiz.done && now > L.quiz.until) { L.quiz.done = true; await this.discord('POST', `/channels/${L.quiz.ch}/messages`, { content: `⌛ Personne n'a trouvé ! La réponse était **${L.quiz.show}**.` }); }
      // salons stats (Discord limite les renommages : au plus toutes les 6 min)
      if (L.stat && (!L.statT || now - L.statT > 6 * 60e3)) { L.statT = now; await this.updateStats(); }
      // bannière dynamique (toutes les heures)
      if (!L.banT || now - L.banT > 55 * 60e3) { L.banT = now; await this.updateBanner(); }
      // temporaires vides oubliés
      for (const ch of Object.keys(L.temp)) if (!Object.values(S.voice).some(v => v.ch === ch) && S.ready) { await this.discord('DELETE', `/channels/${ch}`); delete L.temp[ch]; }
      this.save();
    },
    async updateStats() {
      const L = this.L(), S = this.srv(); let members = Object.keys(S.mem).length;
      const g = await this.discord('GET', `/guilds/${this.env.GUILD_ID}?with_counts=true`); if (g && g.approximate_member_count) members = g.approximate_member_count;
      const vals = { on: `🟢 Discolife : ${Object.keys(this.online()).length}`, voice: `🔊 En vocal : ${S.ready ? Object.values(S.voice).filter(v => v.ch !== L.createVc).length : '…'}`, members: `👥 Membres : ${members}` };
      L.statV = L.statV || {}; for (const [k, name] of Object.entries(vals)) if (L.stat[k] && L.statV[k] !== name) { const ok = await this.discord('PATCH', `/channels/${L.stat[k]}`, { name }); if (ok) L.statV[k] = name; }
    },

    // ---------------------------------------------------------------- bannière dynamique au thème Discolife
    bannerSlot() {
      const d = parisNow(), h = d.getHours(), mo = d.getMonth(), day = d.getDate();
      if (mo === 11) return 'xmas'; if (mo === 9 && day >= 18) return 'hallo';
      return h >= 8 && h < 18 ? 'day' : h >= 18 && h < 21 ? 'dusk' : 'night';
    },
    async updateBanner() {
      const L = this.L(), slot = this.bannerSlot(); if (L.banSlot === slot && L.banMsg) return; const url = `${SITE}/banners/${slot}.jpg`;
      const g = await this.discord('GET', `/guilds/${this.env.GUILD_ID}`);
      if (g && g.premium_tier >= 2) { try { const r = await this.env.ASSETS.fetch(new Request(url)); const b = new Uint8Array(await r.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); await this.discord('PATCH', `/guilds/${this.env.GUILD_ID}`, { banner: 'data:image/jpeg;base64,' + btoa(s) }); } catch (e) { console.log('banner', e); } }
      const ch = await this.chanId(/bienvenue/i, 0); if (!ch) return;
      const titles = { day: '☀️ La Maison · journée', dusk: '🌇 La Maison · soirée', night: '🌙 La Maison · de nuit', xmas: '🎄 La Maison · Noël', hallo: '🎃 La Maison · Halloween' };
      const body = { embeds: [{ color: 0xa66bff, title: titles[slot], description: `En ce moment : **${Object.keys(this.online()).length}** sur Discolife · **${Object.keys(this.srv().voice).length}** en vocal`, image: { url: url + '?v=' + Date.now().toString(36).slice(-4) }, footer: { text: 'La bannière change selon l\'heure et les fêtes · Discolife' } }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Entrer dans Discolife', emoji: { name: '🏠' }, url: SITE }] }] };
      if (L.banMsg && L.banCh === ch) { const ok = await this.discord('PATCH', `/channels/${ch}/messages/${L.banMsg}`, body); if (ok) { L.banSlot = slot; return; } }
      const m = await this.discord('POST', `/channels/${ch}/messages`, body); if (m) { L.banMsg = m.id; L.banCh = ch; L.banSlot = slot; }
    },

    // ---------------------------------------------------------------- question du jour, quiz, coffre, journal, anniversaires
    async postQotd() {
      const ch = await this.chanId(/^g[ée]n[ée]ral$|g[ée]n[ée]ral/i, 0); if (!ch) return; const L = this.L();
      const q = QOTD[(Math.floor(Date.now() / 864e5)) % QOTD.length];
      const m = await this.discord('POST', `/channels/${ch}/messages`, { embeds: [{ color: 0xffd84a, title: '💬 Question du jour', description: `**${q}**\n\nRéponds dans le fil 👇 · les 10 premiers gagnent **10 🪙** sur Discolife` }] });
      if (!m) return; const th = await this.discord('POST', `/channels/${ch}/messages/${m.id}/threads`, { name: 'Réponses · question du jour', auto_archive_duration: 1440 });
      L.qotd = { msg: m.id, thread: th ? th.id : null, d: dayKey(), paid: [] };
    },
    async postQuiz() {
      const ch = await this.chanId(/mini-jeux/i, 0) || await this.chanId(/g[ée]n[ée]ral/i, 0); if (!ch) return; const L = this.L();
      const q = QUIZ[rndInt(0, QUIZ.length - 1)];
      await this.discord('POST', `/channels/${ch}/messages`, { embeds: [{ color: 0x4fe3ff, title: '⚡ Quiz express !', description: `**${q[0]}**\n\nLe premier qui répond juste ici gagne **25 🪙** · 60 secondes !` }] });
      L.quiz = { ch, ans: q[1].map(norm), show: q[1][0], until: Date.now() + 60e3, done: false };
    },
    async postDrop() {
      const ch = await this.chanId(/g[ée]n[ée]ral/i, 0); if (!ch) return; const L = this.L(); const id = Date.now().toString(36);
      const m = await this.discord('POST', `/channels/${ch}/messages`, { embeds: [{ color: 0xff8a3d, title: '🎁 Un coffre mystère vient d\'apparaître !', description: 'Le premier qui l\'ouvre repart avec le contenu : des pièces ou un meuble pour sa chambre Discolife.' }], components: [{ type: 1, components: [{ type: 2, style: 3, label: 'Ouvrir le coffre', emoji: { name: '🗝️' }, custom_id: `drop:${id}` }] }] });
      if (m) L.drop = { id, msg: m.id, ch, open: false };
    },
    async postJournal() {
      const L = this.L(), y = L.day && L.day.d !== dayKey() ? L.day : L.yday; const ch = await this.chanId(/g[ée]n[ée]ral/i, 0); if (!ch) return;
      const nm = id => (this.srv().mem[id] || this.profiles[id] || {}).name || 'quelqu\'un';
      const users = y ? Object.entries(y.users) : []; const topM = users.slice().sort((a, b) => b[1].m - a[1].m)[0], topV = users.slice().sort((a, b) => b[1].v - a[1].v)[0];
      const w = L.word, f = [];
      if (y) { f.push({ name: '💬 Messages', value: String(y.msgs), inline: true }, { name: '🔊 Vocal', value: `${Math.round(y.voice / 360) / 10} h`, inline: true }, { name: '🏠 Nouveaux', value: String(y.joins || 0), inline: true });
        if (topM && topM[1].m) f.push({ name: '🗣️ Le plus bavard', value: `${nm(topM[0])} · ${topM[1].m} messages`, inline: true }); if (topV && topV[1].v) f.push({ name: '🎧 Le plus en vocal', value: `${nm(topV[0])} · ${Math.round(topV[1].v / 60)} min`, inline: true }); }
      if (w && w.d === dayKey()) f.push({ name: '🔍 Mot mystère du jour', value: `${w.w.length} lettres, commence par « ${w.w[0].toUpperCase()} ». Le premier qui l'écrit dans un message gagne **50 🪙** !` });
      await this.discord('POST', `/channels/${ch}/messages`, { embeds: [{ color: 0xa66bff, title: '☕ Le journal de La Maison', description: y ? 'Ce qui s\'est passé hier sur le serveur :' : 'Bonne journée à tous !', fields: f, footer: { text: 'Question du jour à 18 h · coffres et quiz surprises dans la journée' } }] });
    },
    async birthdays() {
      const L = this.L(), g = this.env.GUILD_ID, d = parisNow(), today = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (L.bdayRole) for (const id of L.bdayHolders || []) await this.discord('DELETE', `/guilds/${g}/members/${id}/roles/${L.bdayRole}`); L.bdayHolders = [];
      const list = Object.values(this.profiles).filter(p => p.bday === today); if (!list.length) return;
      if (!L.bdayRole) { const r = await this.discord('POST', `/guilds/${g}/roles`, { name: '🎂 Anniversaire', color: 0xff6fae, hoist: true }); if (r) L.bdayRole = r.id; }
      const ch = await this.chanId(/g[ée]n[ée]ral/i, 0);
      for (const p of list) { p.coins += 100; const h = this.homeOf(p); h.gifts.push({ id: 'b' + Date.now().toString(36) + p.id.slice(-3), from: 'serveur', fromName: 'La Maison', coins: 0, k: 'neon', note: 'Joyeux anniversaire ! 🎂', t: Date.now() }); this.pushProf(p);
        if (L.bdayRole && await this.discord('PUT', `/guilds/${g}/members/${p.id}/roles/${L.bdayRole}`)) L.bdayHolders.push(p.id); }
      if (ch) await this.discord('POST', `/channels/${ch}/messages`, { content: `🎂 **Joyeux anniversaire** ${list.map(p => `<@${p.id}>`).join(' ')} ! 🎉\nLa Maison t'offre **100 🪙** et un cadeau t'attend dans ta chambre Discolife.`, allowed_mentions: { users: list.map(p => p.id) } });
    },

    // ---------------------------------------------------------------- événements de la gateway
    async liveOnMessage(d) {
      if (d.guild_id !== this.env.GUILD_ID || !d.author || d.author.bot) return; const L = this.L(), uid = d.author.id, text = d.content || '';
      this.liveStat(uid, 'm');
      // comptage
      if (d.channel_id === L.countCh) {
        const t = text.trim(); if (!/^\d+$/.test(t)) return; const n = parseInt(t, 10), C = L.count;
        if (n === C.n + 1 && uid !== C.last) { C.n = n; C.last = uid; await this.react(d.channel_id, d.id, n % 100 === 0 ? '💯' : '✅');
          if (n > C.record) { C.record = n; if (!L.countTopicT || Date.now() - L.countTopicT > 11 * 60e3) { L.countTopicT = Date.now(); this.discord('PATCH', `/channels/${L.countCh}`, { topic: `Comptez ensemble : 1, 2, 3… Un nombre par message, pas deux fois de suite la même personne. Record : ${C.record}` }); } } }
        else { const was = C.n, twice = uid === C.last; C.n = 0; C.last = null; await this.react(d.channel_id, d.id, '❌'); await this.discord('POST', `/channels/${d.channel_id}/messages`, { content: `💥 <@${uid}> a cassé la série à **${was}** ${twice ? '(pas deux fois de suite !) ' : ''}! On repart de **1**. Record du serveur : **${C.record}**`, allowed_mentions: { users: [] } }); }
        this.save(); return;
      }
      // quiz express
      if (L.quiz && !L.quiz.done && d.channel_id === L.quiz.ch && Date.now() < L.quiz.until && L.quiz.ans.includes(norm(text))) {
        L.quiz.done = true; const p = this.liveProfile(uid); p.coins += 25; this.pushProf(p); await this.react(d.channel_id, d.id, '🏆');
        await this.discord('POST', `/channels/${d.channel_id}/messages`, { content: `🎉 Bravo <@${uid}> ! La réponse était **${L.quiz.show}** · **+25 🪙** sur Discolife`, allowed_mentions: { users: [uid] } });
      }
      // mot mystère
      const w = L.word; if (w && !w.found && w.d === dayKey() && new RegExp(`(^|[^a-z])${w.w}([^a-z]|$)`).test(norm(text).replace(/'/g, ' '))) {
        w.found = uid; const p = this.liveProfile(uid); p.coins += 50; this.pushProf(p); await this.react(d.channel_id, d.id, '🔍');
        await this.discord('POST', `/channels/${d.channel_id}/messages`, { content: `🔍 <@${uid}> a trouvé le **mot mystère** du jour : « **${w.w}** » ! **+50 🪙**`, allowed_mentions: { users: [uid] } });
        this.log('info', p.name, `trouve le mot mystère « ${w.w} » 🔍`);
      }
      // réponse à la question du jour (dans le fil)
      const Q = L.qotd; if (Q && (d.channel_id === Q.thread || (d.message_reference && d.message_reference.message_id === Q.msg)) && !Q.paid.includes(uid) && Q.paid.length < 10) { Q.paid.push(uid); const p = this.liveProfile(uid); p.coins += 10; this.pushProf(p); await this.react(d.channel_id, d.id, '🪙'); }
    },
    async liveOnVoice(d, before) {
      const L = this.L(), S = this.srv(), uid = d.user_id;
      // salon à la demande
      if (d.channel_id && d.channel_id === L.createVc) {
        const nm = (S.mem[uid] || this.profiles[uid] || {}).name || 'membre', parent = (S.ch[L.createVc] || {}).parent || undefined;
        const c = await this.discord('POST', `/guilds/${this.env.GUILD_ID}/channels`, { name: `🎮 Salon de ${nm}`.slice(0, 90), type: 2, parent_id: parent, permission_overwrites: [{ id: uid, type: 1, allow: String((1 << 4) + (1 << 20) + (1 << 24)) }] });
        if (c) { L.temp[c.id] = uid; this.save(); await this.discord('PATCH', `/guilds/${this.env.GUILD_ID}/members/${uid}`, { channel_id: c.id }); }
      }
      if (before && L.temp[before] && !Object.values(S.voice).some(v => v.ch === before)) { await this.discord('DELETE', `/channels/${before}`); delete L.temp[before]; this.save(); }
    },
    async liveOnReaction(d) {
      if (d.guild_id !== this.env.GUILD_ID || !d.emoji) return; const e = d.emoji.name; if (!['😂', '🤣', '⭐', '💀', '🔥', '😭'].includes(e)) return;
      const L = this.L(); if (L.starred.includes(d.message_id)) return; const S = this.srv(), c = S.ch[d.channel_id]; if (!c || !c.pub) return;
      const k = this._rx || (this._rx = {}); const s = k[d.message_id] = k[d.message_id] || new Set(); s.add(d.user_id); if (s.size < 3) return;
      L.starred.push(d.message_id); if (L.starred.length > 300) L.starred.shift(); delete k[d.message_id];
      const m = await this.discord('GET', `/channels/${d.channel_id}/messages/${d.message_id}`); if (!m || m.author.bot) return;
      const star = await this.chanId(/starboard/i, 0); if (!star) return; await this.react(d.channel_id, d.message_id, '⭐');
      const img = (m.attachments || []).find(a => /^image\//.test(a.content_type || ''));
      await this.discord('POST', `/channels/${star}/messages`, { embeds: [{ color: 0xffd84a, author: { name: m.author.global_name || m.author.username, icon_url: m.author.avatar ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64` : undefined },
        description: (m.content || '').slice(0, 1500) + `\n\n[➜ Voir le message](https://discord.com/channels/${this.env.GUILD_ID}/${d.channel_id}/${d.message_id})`, image: img ? { url: img.url } : undefined, footer: { text: `⭐ dans #${c.name} · ${e} ×3` } }] });
      const p = this.profiles[m.author.id]; if (p) { p.coins += 20; this.pushProf(p); }
    },
    react(ch, msg, emoji) { return this.discord('PUT', `/channels/${ch}/messages/${msg}/reactions/${encodeURIComponent(emoji)}/@me`); },

    // ---------------------------------------------------------------- membre de la semaine (appelé par le récap du dimanche)
    async memberOfWeek() {
      const L = this.L(), wk = L.wk; if (!wk) return null; const sc = {};
      for (const [u, x] of Object.entries(wk.users)) sc[u] = (sc[u] || 0) + x.m + x.v / 300;
      for (const p of Object.values(this.profiles)) if (p.wk && p.wk.k === this.weekKeyL()) sc[p.id] = (sc[p.id] || 0) + p.wk.xp / 10;
      const top = Object.entries(sc).sort((a, b) => b[1] - a[1])[0]; if (!top || top[1] < 5) return null; const uid = top[0], g = this.env.GUILD_ID;
      if (!L.motwRole) { const r = await this.discord('POST', `/guilds/${g}/roles`, { name: '🌟 Membre de la semaine', color: 0xffc93c, hoist: true }); if (r) L.motwRole = r.id; }
      if (L.motwRole) { if (L.motw && L.motw !== uid) await this.discord('DELETE', `/guilds/${g}/members/${L.motw}/roles/${L.motwRole}`); await this.discord('PUT', `/guilds/${g}/members/${uid}/roles/${L.motwRole}`); }
      L.motw = uid; const p = this.liveProfile(uid); p.coins += 100; this.pushProf(p); return { id: uid, name: p.name };
    },

    // ---------------------------------------------------------------- interactions (boutons et commandes)
    async liveCommand(d, me, reply, opt, who, isAdm) {
      if (d.name === 'anniv') {
        const v = (opt(d, 'date') || '').trim(), m = v.match(/^(\d{1,2})\/(\d{1,2})$/); if (!m || +m[1] > 31 || +m[2] > 12 || +m[1] < 1 || +m[2] < 1) return reply('Date invalide : écris par exemple **14/03**.');
        me.bday = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}`; this.pushProf(me); return reply(`🎂 C'est noté : ton anniversaire est le **${me.bday}**. Le serveur te le souhaitera avec un cadeau !`);
      }
      if (d.name === 'duel') {
        const t = who(d); if (!t || t === 'bot' || t.id === me.id) return reply('Choisis un vrai adversaire 🙂'); const mise = Math.max(0, Math.min(500, Math.floor(+opt(d, 'mise') || 0)));
        if (mise > me.coins) return reply(`Tu n'as que ${me.coins} 🪙.`); const L = this.L(); L.dd = L.dd || {}; const id = Date.now().toString(36);
        L.dd[id] = { id, a: me.id, b: t.id, an: me.name, bn: t.name, mise, t: Date.now() }; this.save();
        return reply({ content: `⚔️ <@${t.id}>, **${me.name}** te défie en duel de dés${mise ? ` pour **${mise} 🪙** chacun` : ''} ! Le plus gros lancer remporte ${mise ? 'la mise' : 'la gloire'}.`, allowed_mentions: { users: [t.id] },
          components: [{ type: 1, components: [{ type: 2, style: 3, label: 'Accepter', emoji: { name: '🎲' }, custom_id: `dd:${id}:1` }, { type: 2, style: 4, label: 'Refuser', custom_id: `dd:${id}:0` }] }] });
      }
      return null;
    },
    async liveButton(k, to, ok, me, reply, follow) {
      const L = this.L();
      if (k === 'drop') {
        const D = L.drop; if (!D || D.id !== to || D.open) return follow({ content: 'Trop tard, le coffre a déjà été ouvert 😅', flags: 64 }); D.open = true;
        const p = me, r = Math.random(); let txt;
        if (r < 0.15) { const keys = Object.keys(FURN).filter(f => !FURN[f].ltd); const f = keys[rndInt(0, keys.length - 1)]; p.furn = p.furn || {}; p.furn[f] = (p.furn[f] || 0) + 1; txt = `${FURN[f].e} **${FURN[f].n}** pour sa chambre`; }
        else { const n = r < 0.4 ? rndInt(100, 150) : rndInt(20, 80); p.coins += n; txt = `**${n} 🪙**`; }
        this.pushProf(p); this.log('info', p.name, `ouvre le coffre mystère du serveur 🎁`);
        return reply({ embeds: [{ color: 0x3bd16f, title: '🎁 Coffre ouvert !', description: `<@${p.id}> a été le plus rapide et gagne ${txt} !` }], components: [] });
      }
      if (k === 'dd') {
        const D = (L.dd || {})[to]; if (!D) return follow({ content: '⌛ Ce duel a expiré.', flags: 64 }); if (me.id !== D.b) return follow({ content: 'Ce duel n\'est pas pour toi 😉', flags: 64 });
        delete L.dd[to]; if (ok !== '1') return reply({ content: `🏳️ **${D.bn}** refuse le duel de **${D.an}**.`, components: [] });
        const A = this.profiles[D.a], B = me; if (!A) return reply({ content: 'Duel annulé.', components: [] });
        if (D.mise && (A.coins < D.mise || B.coins < D.mise)) return reply({ content: `❌ Pas assez de 🪙 pour la mise de ${D.mise}.`, components: [] });
        let ra, rb; do { ra = rndInt(1, 100); rb = rndInt(1, 100); } while (ra === rb);
        const win = ra > rb ? A : B, lose = win === A ? B : A; if (D.mise) { win.coins += D.mise; lose.coins -= D.mise; } this.pushProf(A); this.pushProf(B);
        return reply({ content: `🎲 **${A.name}** lance **${ra}** · **${B.name}** lance **${rb}**\n🏆 **${win.name}** gagne${D.mise ? ` **${D.mise} 🪙**` : ''} !`, components: [], allowed_mentions: { parse: [] } });
      }
      return null;
    },
  });
}
