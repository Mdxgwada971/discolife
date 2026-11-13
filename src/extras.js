// Rôles de jeux (choisis + détectés automatiquement), boutique Discord (pièces Discolife) et sauvegardes.

export const GAMES = [
  ['valo', '🎯', 'Valorant', /valorant/i], ['lol', '🧙', 'League of Legends', /league of legends|^lol$/i], ['fn', '🪂', 'Fortnite', /fortnite/i],
  ['mc', '⛏️', 'Minecraft', /minecraft/i], ['gta', '🚓', 'GTA', /grand theft auto|\bgta\b/i], ['cod', '⚔️', 'Call of Duty', /call of duty|warzone|\bcod\b/i],
  ['rl', '🚗', 'Rocket League', /rocket league/i], ['fc', '⚽', 'EA Sports FC', /ea sports fc|\bfifa\b|\bfc ?2\d\b/i], ['apex', '🔺', 'Apex Legends', /apex/i],
  ['cs', '💣', 'Counter-Strike', /counter-?strike|\bcs ?2\b|csgo/i], ['ow', '🛡️', 'Overwatch', /overwatch/i], ['r6', '🔫', 'Rainbow Six Siege', /rainbow six|\br6\b/i],
  ['amogus', '🚀', 'Among Us', /among us/i], ['roblox', '🧱', 'Roblox', /roblox/i], ['cr', '👑', 'Clash Royale', /clash royale/i],
  ['bs', '⭐', 'Brawl Stars', /brawl stars/i], ['forza', '🏎️', 'Forza / Gran Turismo', /forza|gran turismo/i], ['rivals', '🦸', 'Marvel Rivals', /marvel rivals/i],
  ['finals', '💥', 'The Finals', /the finals/i], ['dbd', '🔪', 'Dead by Daylight', /dead by daylight|\bdbd\b/i], ['elden', '🗡️', 'Elden Ring / Souls', /elden ring|dark souls|sekiro/i],
  ['poke', '⚡', 'Pokémon', /pok[eé]mon/i], ['mk', '🍄', 'Mario Kart / Nintendo', /mario|smash bros|zelda/i], ['coop', '👻', 'Jeux coop (Lethal, Phasmo…)', /lethal company|phasmophobia|repo\b|peak\b|content warning/i],
  ['autre', '🎲', 'Autres jeux / nouveautés', /^$/],
];
export const COLORS = [
  ['rouge', '🔴', 'Rouge', 0xff4d4d], ['orange', '🟠', 'Orange', 0xff9a3c], ['jaune', '🟡', 'Jaune', 0xffd84a], ['vert', '🟢', 'Vert', 0x3bd16f],
  ['bleu', '🔵', 'Bleu', 0x4f9dff], ['violet', '🟣', 'Violet', 0xa66bff], ['rose', '🌸', 'Rose', 0xff7ac8], ['cyan', '💠', 'Cyan', 0x4fe3ff],
];
export const SOUNDS = [ // fichier, nom dans le soundboard, emoji
  ['klaxon', 'Discolife klaxon', '🚗'], ['vroom', 'Discolife vroom', '🏎️'], ['coffre', 'Discolife coffre', '🪙'], ['victoire', 'Discolife victoire', '🏆'],
  ['bienvenue', 'Discolife bienvenue', '👋'], ['level-up', 'Discolife level up', '⬆️'], ['defaite', 'Discolife défaite', '💀'], ['ba-dum-tss', 'Discolife ba dum tss', '🥁'],
  ['bonne-reponse', 'Discolife bonne réponse', '✅'], ['buzzer', 'Discolife buzzer', '❌'], ['applaudissements', 'Discolife bravo', '👏'],
];
// son joué par la « sonnette » quand quelqu'un entre dans un vocal, selon le salon
const BELL = [[/garage/i, 'vroom'], [/gaming/i, 'level-up'], [/arcade/i, 'coffre'], [/studio/i, 'ba-dum-tss'], [/chill/i, 'bienvenue'], [/g[ée]n[ée]ral/i, 'bienvenue'], [/salon de|🎮/i, 'klaxon'], [/🔒|place/i, 'victoire']];
const COLOR_PRICE = 400, MECENE_PRICE = 2500, MECENE = '💎 Mécène';
export const gameFor = txt => { const t = String(txt || '').trim(); if (!t) return null; return GAMES.find(g => g[0] !== 'autre' && g[3].test(t)) || null; };

export function installExtras(House) {
  Object.assign(House.prototype, {
    X() { const w = this.world; w.x = w.x || {}; const X = w.x; X.groles = X.groles || {}; X.croles = X.croles || {}; return X; },

    // ------------------------------------------------------------ rôles de jeux
    async ensureGameRoles() {
      const g = this.env.GUILD_ID, X = this.X(); const roles = await this.discord('GET', `/guilds/${g}/roles`); if (!roles) return;
      for (const [k, e, n] of GAMES) {
        const name = `${e} ${n}`; const ex = roles.find(r => r.id === X.groles[k]) || roles.find(r => r.name === name);
        if (ex) { X.groles[k] = ex.id; continue; }
        const r = await this.discord('POST', `/guilds/${g}/roles`, { name, color: 0, hoist: false, mentionable: false }); if (r) X.groles[k] = r.id;
      }
      // salon « choisis tes jeux »
      const chs = await this.discord('GET', `/guilds/${g}/channels`) || [];
      if (!X.pickCh || !chs.some(c => c.id === X.pickCh)) {
        const parent = (chs.find(c => c.type === 0 && /annonces/i.test(c.name)) || chs.find(c => c.type === 0 && /g[ée]n[ée]ral/i.test(c.name)) || {}).parent_id;
        const ch = await this.discord('POST', `/guilds/${g}/channels`, { name: '🎮・choisis-tes-jeux', type: 0, parent_id: parent || undefined, topic: 'Choisis tes jeux : tu seras prévenu quand une partie se lance',
          permission_overwrites: [{ id: g, type: 0, deny: String(1 << 11), allow: String(1 << 10 | 1 << 16) }, { id: this.env.CLIENT_ID, type: 1, allow: String(1 << 10 | 1 << 11 | 1 << 16) }] });
        if (ch) { X.pickCh = ch.id; X.pickMsg = null; }
      }
      if (X.pickCh && (!X.pickMsg || X.pickV !== 2)) {
        if (X.pickMsg) await this.discord('DELETE', `/channels/${X.pickCh}/messages/${X.pickMsg}`);
        const m = await this.discord('POST', `/channels/${X.pickCh}/messages`, this.pickerMsg()); if (m) { X.pickMsg = m.id; X.pickV = 2; }
      }
      this.save();
    },
    pickerMsg() {
      return { embeds: [{ color: 0x4fe3ff, title: '🎮 Choisis tes jeux',
        description: 'Sélectionne les jeux auxquels tu joues dans le menu juste en dessous.\n\n• Choisir un jeu **l\'ajoute**, le rechoisir **le retire**\n• Quand quelqu\'un lance une partie avec `/annonce-jeu`, **tout le serveur est prévenu** et les joueurs de ce jeu sont cités en premier 🔔\n• Le bot t\'ajoute aussi tout seul un jeu quand Discord voit que tu y joues (tu peux le retirer ici)\n\nTon jeu n\'est pas dans la liste ? Prends **🎲 Autres jeux** et propose-le avec `/proposer-jeu` !' }],
        components: [{ type: 1, components: [{ type: 3, custom_id: 'groles', placeholder: '🎮 Ajouter / retirer des jeux…', min_values: 1, max_values: GAMES.length,
          options: GAMES.map(([k, e, n]) => ({ label: n, value: k, emoji: { name: e } })) }] }] };
    },
    async toggleGames(me, keys, follow) {
      const g = this.env.GUILD_ID, X = this.X(); me.games = me.games || []; me.gno = me.gno || []; const add = [], rem = [];
      for (const k of keys) { const rid = X.groles[k]; const G = GAMES.find(x => x[0] === k); if (!rid || !G) continue;
        if (me.games.includes(k)) { me.games = me.games.filter(x => x !== k); if (!me.gno.includes(k)) me.gno.push(k); rem.push(G); await this.discord('DELETE', `/guilds/${g}/members/${me.id}/roles/${rid}`); }
        else { me.games.push(k); me.gno = me.gno.filter(x => x !== k); add.push(G); await this.discord('PUT', `/guilds/${g}/members/${me.id}/roles/${rid}`); } }
      this.pushProf(me);
      const list = me.games.map(k => GAMES.find(x => x[0] === k)).filter(Boolean).map(G => `${G[1]} ${G[2]}`).join(' · ') || 'aucun';
      return follow({ content: `${add.length ? `✅ Ajouté : ${add.map(G => G[1] + ' ' + G[2]).join(', ')}\n` : ''}${rem.length ? `➖ Retiré : ${rem.map(G => G[1] + ' ' + G[2]).join(', ')}\n` : ''}🎮 **Tes jeux** : ${list}`, flags: 64 });
    },
    // appelé quand Discord voit quelqu'un jouer : on lui ajoute le rôle du jeu (sauf s'il l'a retiré lui-même)
    autoGameRole(uid, gameName) {
      const G = gameFor(gameName); if (!G) return; const X = this.X(), rid = X.groles[G[0]]; if (!rid) return;
      const p = this.profiles[uid]; if (!p) return; p.games = p.games || []; if (p.games.includes(G[0]) || (p.gno || []).includes(G[0])) return;
      p.games.push(G[0]); this.pushProf(p); this.discord('PUT', `/guilds/${this.env.GUILD_ID}/members/${uid}/roles/${rid}`);
    },
    gameRoleMention(jeu) { const G = gameFor(jeu); const rid = G && this.X().groles[G[0]]; return rid ? { rid, G } : null; },

    // ------------------------------------------------------------ boutique Discord
    shopMsg(me) {
      const X = this.X(), own = me.colors || [];
      return { flags: 64, embeds: [{ color: 0xffd84a, title: '🛍️ Boutique du serveur',
        description: `Tu as **${me.coins} 🪙** (les mêmes pièces que dans Discolife : quiz, coffres, mot mystère, jeu…)\n\n🎨 **Couleur de pseudo** · ${COLOR_PRICE} 🪙 la première fois, gratuit ensuite pour changer entre tes couleurs achetées\n💎 **Mécène** · ${MECENE_PRICE} 🪙 · rôle affiché à part dans la liste des membres, pour la vie\n\nChoisis dans le menu 👇`,
        fields: own.length ? [{ name: 'Tes couleurs', value: own.map(k => { const c = COLORS.find(x => x[0] === k); return c ? c[1] + ' ' + c[2] : ''; }).join(' · ') + (me.color ? `\nActive : ${(COLORS.find(x => x[0] === me.color) || [])[1] || ''}` : '') }] : [] }],
        components: [{ type: 1, components: [{ type: 3, custom_id: 'shop', placeholder: '🛍️ Acheter / équiper…', options: [
          ...COLORS.map(([k, e, n]) => ({ label: `Couleur ${n}`, value: 'c_' + k, emoji: { name: e }, description: own.includes(k) ? (me.color === k ? 'Équipée' : 'Achetée · équiper gratuitement') : `${COLOR_PRICE} pièces` })),
          { label: 'Retirer ma couleur', value: 'c_none', emoji: { name: '⚪' } },
          { label: 'Mécène', value: 'mecene', emoji: { name: '💎' }, description: me.mecene ? 'Déjà à toi ✨' : `${MECENE_PRICE} pièces` }] }] }] };
    },
    async ensureShopRoles() {
      const g = this.env.GUILD_ID, X = this.X(); const roles = await this.discord('GET', `/guilds/${g}/roles`); if (!roles) return false;
      let made = false;
      for (const [k, e, n, col] of COLORS) { const name = `${e} ${n}`; const ex = roles.find(r => r.id === X.croles[k]) || roles.find(r => r.name === name);
        if (ex) X.croles[k] = ex.id; else { const r = await this.discord('POST', `/guilds/${g}/roles`, { name, color: col, hoist: false, mentionable: false }); if (r) { X.croles[k] = r.id; made = true; } } }
      { const ex = roles.find(r => r.id === X.mecene) || roles.find(r => r.name === MECENE);
        if (ex) X.mecene = ex.id; else { const r = await this.discord('POST', `/guilds/${g}/roles`, { name: MECENE, color: 0x7fe6ff, hoist: true, mentionable: false }); if (r) { X.mecene = r.id; made = true; } } }
      // les couleurs doivent être juste sous le rôle du bot pour passer devant les couleurs des rôles de niveau
      if (made || !X.shopPos) {
        const all = await this.discord('GET', `/guilds/${g}/roles`), me = await this.discord('GET', `/guilds/${g}/members/${this.env.CLIENT_ID}`);
        if (all && me) { const top = Math.max(0, ...all.filter(r => me.roles.includes(r.id)).map(r => r.position)); const mine = new Set([...Object.values(X.croles), X.mecene]);
          const below = all.filter(r => r.position < top && r.id !== g).sort((a, b) => b.position - a.position);
          const order = [...below.filter(r => mine.has(r.id)), ...below.filter(r => !mine.has(r.id))]; const pos = order.map((r, i) => ({ id: r.id, position: top - 1 - i })).filter(x => x.position > 0);
          if (await this.discord('PATCH', `/guilds/${g}/roles`, pos)) X.shopPos = 1; } }
      this.save(); return true;
    },
    async shopBuy(me, val, follow) {
      const g = this.env.GUILD_ID, X = this.X(); me.colors = me.colors || []; await this.ensureShopRoles();
      if (val === 'mecene') {
        if (me.mecene) return follow({ content: '💎 Tu es déjà Mécène !', flags: 64 });
        if (me.coins < MECENE_PRICE) return follow({ content: `Il te faut **${MECENE_PRICE} 🪙** (tu en as ${me.coins}). Quiz, coffres, mot mystère et Discolife en rapportent !`, flags: 64 });
        if (!X.mecene || !(await this.discord('PUT', `/guilds/${g}/members/${me.id}/roles/${X.mecene}`))) return follow({ content: '❌ Le bot n\'a pas pu donner le rôle. Réessaie plus tard (rien n\'a été débité).', flags: 64 });
        me.coins -= MECENE_PRICE; me.mecene = true; this.pushProf(me); this.log('info', me.name, 'devient 💎 Mécène du serveur');
        return follow({ content: `💎 Bravo, tu es **Mécène** du serveur ! **−${MECENE_PRICE} 🪙** (il te reste ${me.coins})`, flags: 64 });
      }
      const k = val.replace(/^c_/, '');
      const drop = async () => { for (const rid of Object.values(X.croles)) if (me.color && X.croles[me.color] === rid) await this.discord('DELETE', `/guilds/${g}/members/${me.id}/roles/${rid}`); };
      if (k === 'none') { await drop(); me.color = null; this.pushProf(me); return follow({ content: '⚪ Couleur retirée.', flags: 64 }); }
      const C = COLORS.find(x => x[0] === k); const rid = C && X.croles[k]; if (!rid) return follow({ content: '❌ Couleur indisponible pour l\'instant.', flags: 64 });
      if (me.color === k) return follow({ content: `${C[1]} Tu as déjà cette couleur.`, flags: 64 });
      const owned = me.colors.includes(k);
      if (!owned && me.coins < COLOR_PRICE) return follow({ content: `Il te faut **${COLOR_PRICE} 🪙** (tu en as ${me.coins}).`, flags: 64 });
      await drop(); if (!(await this.discord('PUT', `/guilds/${g}/members/${me.id}/roles/${rid}`))) return follow({ content: '❌ Le bot n\'a pas pu changer ta couleur (rien n\'a été débité).', flags: 64 });
      if (!owned) { me.coins -= COLOR_PRICE; me.colors.push(k); } me.color = k; this.pushProf(me);
      return follow({ content: `${C[1]} Ton pseudo est maintenant **${C[2]}** !${owned ? '' : ` **−${COLOR_PRICE} 🪙** (il te reste ${me.coins})`}`, flags: 64 });
    },

    // ------------------------------------------------------------ soundboard du serveur + sonnette d'entrée en vocal
    async ensureSoundboard() {
      const g = this.env.GUILD_ID, X = this.X(); X.sb = X.sb || {};
      const cur = await this.discord('GET', `/guilds/${g}/soundboard-sounds`); if (!cur) { X.sbErr = 'lecture impossible'; return false; }
      const list = cur.items || cur; let err = null;
      for (const [f, name, emoji] of SOUNDS) {
        const ex = list.find(x => x.name === name); if (ex) { X.sb[f] = ex.sound_id; continue; }
        try { const r = await (this.env.ASSETS ? this.env.ASSETS.fetch(new Request(`https://discolife.warren-molongo.workers.dev/sounds/${f}.mp3`)) : fetch(`https://discolife.warren-molongo.workers.dev/sounds/${f}.mp3`));
          if (!r.ok) { err = 'fichier ' + f; continue; } const b = new Uint8Array(await r.arrayBuffer()); let bin = ''; for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode(...b.subarray(i, i + 8192));
          const made = await this.discord('POST', `/guilds/${g}/soundboard-sounds`, { name, sound: 'data:audio/mpeg;base64,' + btoa(bin), volume: 0.8, emoji_name: emoji });
          if (made) X.sb[f] = made.sound_id; else err = 'droit « Créer des expressions » manquant (ou plus de place dans le soundboard)';
        } catch (e) { err = String(e.message || e); } }
      X.sbErr = err; this.save(); return !err;
    },
    // quelqu'un entre dans un vocal : le bot passe une seconde, joue le son du salon, puis repart
    doorbell(uid, chId) {
      const X = this.X(), L = this.L(), S = this.srv(), now = Date.now(); if (!chId || uid === this.env.CLIENT_ID || X.bellOff) return;
      const ch = S.ch[chId] || {}; if (/afk/i.test(ch.name || '') || chId === L.createVc || (L.stat && Object.values(L.stat).includes(chId))) return;
            X.bellU = X.bellU || {}; if (now - (X.bellU[uid] || 0) < 3 * 60e3) return; X.bellU[uid] = now;
      const f = (BELL.find(([re]) => re.test(ch.name || '')) || [0, 'bienvenue'])[1], sid = (X.sb || {})[f]; if (!sid || !this.gwAlive()) return;
      this._bellQ = (this._bellQ || Promise.resolve()).then(() => this.bellRun(chId, sid, f)).catch(e => console.log('bell', e));
    },
    async bellRun(chId, sid, f) {
      const g = this.env.GUILD_ID, X = this.X(), gw = this._gw; if (!gw) return; const wait = ms => new Promise(r => setTimeout(r, ms));
      this.gwSend(gw, 4, { guild_id: g, channel_id: chId, self_mute: false, self_deaf: false });
      for (let i = 0; i < 20 && this._botVoice !== chId; i++) await wait(200);
      let ok = false; if (this._botVoice === chId) { await wait(600); ok = !!(await this.discord('POST', `/channels/${chId}/send-soundboard-sound`, { sound_id: sid, source_guild_id: g })); }
      X.bellLast = { t: Date.now(), ok, f, joined: this._botVoice === chId }; this.save();
      await wait(3500); if (this._gw) this.gwSend(this._gw, 4, { guild_id: g, channel_id: null, self_mute: false, self_deaf: false });
      await wait(800);
    },

    // icône du serveur (posée une fois par le bot)
    async ensureIcon() {
      const X = this.X(); if (X.iconV === 1) return;
      try { const r = await (this.env.ASSETS ? this.env.ASSETS.fetch(new Request('https://discolife.warren-molongo.workers.dev/icon-serveur.jpg')) : fetch('https://discolife.warren-molongo.workers.dev/icon-serveur.jpg'));
        if (!r.ok) return; const b = new Uint8Array(await r.arrayBuffer()); let bin = ''; for (let i = 0; i < b.length; i += 8192) bin += String.fromCharCode(...b.subarray(i, i + 8192));
        if (await this.discord('PATCH', `/guilds/${this.env.GUILD_ID}`, { icon: 'data:image/jpeg;base64,' + btoa(bin) })) { X.iconV = 1; this.save(); } } catch (e) { console.log('icon', e); }
    },

    // ------------------------------------------------------------ sauvegardes
    snapshot() { return JSON.stringify({ v: 1, at: new Date().toISOString(), world: this.world, profiles: this.profiles }); },
    async backupTick(today) {
      const X = this.X(); if (X.bakDay === today) return; X.bakDay = today;
      try { // copie interne quotidienne, on garde 7 jours (découpée en morceaux)
        const s = this.snapshot(), parts = []; for (let i = 0; i < s.length; i += 40000) parts.push(s.slice(i, i + 40000));
        const put = { [`bak:${today}:n`]: parts.length }; parts.forEach((p, i) => { put[`bak:${today}:${i}`] = p; }); await this.ctx.storage.put(put);
        X.baks = [...(X.baks || []).filter(d => d !== today), today]; while (X.baks.length > 7) { const old = X.baks.shift(); const n = await this.ctx.storage.get(`bak:${old}:n`) || 0; await this.ctx.storage.delete([`bak:${old}:n`, ...Array.from({ length: n }, (_, i) => `bak:${old}:${i}`)]); }
      } catch (e) { console.log('backup', e); }
      if (new Date(today + 'T12:00:00Z').getUTCDay() === 1) await this.backupFile('Sauvegarde automatique de la semaine'); // lundi : copie hors du bot
      this.save();
    },
    async backupFile(why) {
      const ch = this.world.staffCh; if (!ch) return false; const fd = new FormData(), name = `discolife-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      fd.append('payload_json', JSON.stringify({ content: `💾 ${why} · ${Object.keys(this.profiles).length} profils (pièces, XP, meubles, équipes). Garde ce fichier : il permet de tout restaurer.`, allowed_mentions: { parse: [] }, attachments: [{ id: 0, filename: name }] }));
      fd.append('files[0]', new Blob([this.snapshot()], { type: 'application/json' }), name);
      const r = await fetch(`https://discord.com/api/v10/channels/${ch}/messages`, { method: 'POST', headers: { authorization: `Bot ${this.env.BOT_TOKEN}` }, body: fd });
      if (!r.ok) console.log('backup file', r.status, await r.text()); return r.ok;
    },
  });
}
