// Connexion permanente du bot à la passerelle Discord : vocal, messages, présences, salons, arrivées en direct.
const INTENTS = 1 | 2 | 128 | 256 | 512 | 1024 | 32768; // + GUILD_MESSAGE_REACTIONS // GUILDS, MEMBERS, VOICE_STATES, PRESENCES, GUILD_MESSAGES, MESSAGE_CONTENT
const VIEW = 1n << 10n;
const THEMES = ['garage', 'gaming', 'chill', 'studio', 'arcade', 'afk'];

export function installGateway(House) {
  Object.assign(House.prototype, {
    srv() {
      if (!this._srv) this._srv = { ch: {}, voice: {}, mem: {}, pres: {}, last: {}, ready: false };
      return this._srv;
    },
    gwAlive() { return this._gw && this._gw.ws && Date.now() - (this._gw.lastAck || 0) < 120e3; },
    async gwEnsure() {
      if (!this.env.BOT_TOKEN || this.gwAlive() || this._gwConnecting || this._gwDead) return;
      if (this._gwNext && Date.now() < this._gwNext) return;
      this._gwFails = (this._gwFails || 0) + 1; this._gwNext = Date.now() + Math.min(600e3, 5e3 * 2 ** Math.min(7, this._gwFails - 1));
      this._gwConnecting = true;
      try { await this.gwConnect(); this._gwErr = null; } catch (e) { console.log('gw connect', e); this._gwErr = String(e && e.message || e); } finally { this._gwConnecting = false; }
    },
    async gwConnect() {
      if (this._gw && this._gw.ws) { try { this._gw.ws.close(); } catch (e) {} clearInterval(this._gw.hb); }
      const base = (this._gwSession && this._gwResume) ? this._gwResume.replace('wss://', 'https://') : 'https://gateway.discord.gg';
      const res = await fetch(base + '/?v=10&encoding=json', { headers: { Upgrade: 'websocket' } });
      const ws = res.webSocket; if (!ws) throw new Error('pas de websocket ' + res.status);
      ws.accept();
      const gw = this._gw = { ws, seq: null, hb: null, lastAck: Date.now(), session: this._gwSession || null };
      ws.addEventListener('message', ev => { try { this.gwOnMessage(gw, JSON.parse(ev.data)); } catch (e) { console.log('gw msg', e); } });
      ws.addEventListener('close', ev => { console.log('gw close', ev.code); this._gwErr = 'close ' + ev.code + ' ' + (ev.reason || ''); clearInterval(gw.hb); if (this._gw === gw) this._gw = null; if ([4004, 4010, 4011, 4012, 4013, 4014].includes(ev.code)) this._gwDead = true; if (ev.code === 4000 || ev.code === 4900) { this._gwNext = 0; this._gwFails = 0; setTimeout(() => this.gwEnsure(), 1000); } });
      ws.addEventListener('error', e => console.log('gw err', e.message));
    },
    gwSleep() { const gw = this._gw; this._gw = null; this._gwSession = null; this._gwSeq = null; if (gw) { clearInterval(gw.hb); try { gw.ws.close(1000, 'veille'); } catch (e) {} } const S = this.srv(); S.ready = false; S.voice = {}; S.pres = {}; console.log('gateway en veille'); },
    gwSend(gw, op, d) { try { gw.ws.send(JSON.stringify({ op, d })); } catch (e) {} },
    gwOnMessage(gw, m) {
      if (m.s) gw.seq = m.s;
      if (m.op === 10) {
        clearInterval(gw.hb); const beat = () => this.gwSend(gw, 1, gw.seq);
        setTimeout(beat, Math.random() * m.d.heartbeat_interval); gw.hb = setInterval(beat, m.d.heartbeat_interval);
        if (gw.session && this._gwSeq) this.gwSend(gw, 6, { token: this.env.BOT_TOKEN, session_id: gw.session, seq: this._gwSeq });
        else this.gwSend(gw, 2, { token: this.env.BOT_TOKEN, intents: INTENTS, properties: { os: 'linux', browser: 'discolife', device: 'discolife' }, presence: { status: 'online', activities: [{ type: 0, name: 'Discolife 🏠' }] } });
        return;
      }
      if (m.op === 11) { gw.lastAck = Date.now(); return; }
      if (m.op === 1) { this.gwSend(gw, 1, gw.seq); return; }
      if (m.op === 7) { try { gw.ws.close(4900); } catch (e) {} return; }
      if (m.op === 9) { this._gwSession = null; this._gwSeq = null; gw.session = null; setTimeout(() => { try { gw.ws.close(4900); } catch (e) {} }, 2000); return; }
      if (m.op !== 0) return;
      this._gwSeq = gw.seq; gw.lastAck = Date.now();
      const d = m.d, S = this.srv();
      switch (m.t) {
        case 'READY': this._gwSession = gw.session = d.session_id; this._gwResume = d.resume_gateway_url || null; this._gwFails = 0; this._gwNext = 0; break;
        case 'RESUMED': this._gwFails = 0; this._gwNext = 0; break;
        case 'GUILD_CREATE': if (d.id !== this.env.GUILD_ID) break;
          S.ch = {}; for (const c of d.channels || []) this.gwChan(c);
          for (const mb of d.members || []) this.gwMem(mb);
          S.voice = {}; for (const v of d.voice_states || []) if (v.channel_id) S.voice[v.user_id] = { ch: v.channel_id, mute: !!(v.self_mute || v.mute), deaf: !!(v.self_deaf || v.deaf) };
          S.pres = {}; for (const p of d.presences || []) this.gwPres(p, true);
          S.ready = true; this.srvPush(true); break;
        case 'CHANNEL_CREATE': case 'CHANNEL_UPDATE': if (d.guild_id === this.env.GUILD_ID) { this.gwChan(d); this.srvPush(true); } break;
        case 'CHANNEL_DELETE': delete S.ch[d.id]; this.srvPush(true); break;
        case 'GUILD_MEMBER_ADD': if (d.guild_id === this.env.GUILD_ID) { this.gwMem(d); this.gwWelcome(d); try { this.liveStat(d.user.id, 'm', 0); this.L().day.joins++; } catch (e) {} } break;
        case 'GUILD_MEMBER_UPDATE': if (d.guild_id === this.env.GUILD_ID) this.gwMem(d); break;
        case 'VOICE_STATE_UPDATE': {
          if (d.guild_id !== this.env.GUILD_ID) break; if (d.member) this.gwMem(d.member);
          const before = S.voice[d.user_id] && S.voice[d.user_id].ch;
          if (d.channel_id) S.voice[d.user_id] = { ch: d.channel_id, mute: !!(d.self_mute || d.mute), deaf: !!(d.self_deaf || d.deaf) }; else delete S.voice[d.user_id];
          this.bcast({ t: 'sv', voice: { [d.user_id]: this.voiceView(S.voice[d.user_id]) }, mem: S.mem[d.user_id] ? { [d.user_id]: S.mem[d.user_id] } : {} });
          if (before !== d.channel_id) { this.gwVoiceMoved(d.user_id, d.channel_id); this.liveOnVoice(d, before).catch(e => console.log('live voice', e)); }
          break;
        }
        case 'PRESENCE_UPDATE': if (d.guild_id === this.env.GUILD_ID) { const ch = this.gwPres(d), id = d.user.id; if (ch && (this.voiceView(S.voice[id]) || this.online()[id])) this.bcast({ t: 'sv', pres: { [id]: S.pres[id] || null } }); } break;
        case 'MESSAGE_CREATE': this.gwMsg(d); this.liveOnMessage(d).catch(e => console.log('live msg', e)); break;
        case 'MESSAGE_REACTION_ADD': this.liveOnReaction(d).catch(e => console.log('live rx', e)); break;
      }
    },
    gwPublic(c) {
      const S = this.srv(), g = this.env.GUILD_ID;
      const denied = x => (x.permission_overwrites || []).some(o => o.id === g && (BigInt(o.deny || '0') & VIEW));
      if (denied(c)) return false; const par = c.parent_id && S.ch[c.parent_id];
      if (par && par.raw && denied(par.raw) && !(c.permission_overwrites || []).some(o => o.id === g && (BigInt(o.allow || '0') & VIEW))) return false;
      return true;
    },
    gwChan(c) {
      const S = this.srv(); if (![0, 2, 4, 5, 13].includes(c.type)) return;
      S.ch[c.id] = { id: c.id, name: c.name, type: c.type, pos: c.position || 0, parent: c.parent_id || null, raw: c };
      for (const x of Object.values(S.ch)) x.pub = this.gwPublic(x.raw);
    },
    gwMem(mb) {
      const u = mb.user; if (!u || u.bot) return;
      this.srv().mem[u.id] = { id: u.id, name: mb.nick || u.global_name || u.username, avatar: u.avatar || null };
    },
    gwPres(p, quiet) {
      const S = this.srv(), id = p.user && p.user.id; if (!id) return false;
      const act = (p.activities || []).find(a => a.type === 0 || a.type === 1); // jeux et streams seulement (pas de Spotify)
      const v = act ? { g: act.name, k: act.type } : null;
      const old = JSON.stringify(S.pres[id] || null); if (v) S.pres[id] = v; else delete S.pres[id];
      return old !== JSON.stringify(v);
    },
    gwMsg(d) {
      if (d.guild_id !== this.env.GUILD_ID || !d.author || d.author.bot || d.webhook_id) return;
      const S = this.srv(), c = S.ch[d.channel_id]; if (!c || !c.pub) return;
      if (d.member) this.gwMem({ ...d.member, user: d.author });
      let text = (d.content || '').replace(/<@!?(\d+)>/g, (_, id) => '@' + ((S.mem[id] || this.profiles[id] || {}).name || 'quelqu\'un')).replace(/<#(\d+)>/g, (_, id) => '#' + ((S.ch[id] || {}).name || 'salon')).replace(/<a?:(\w+):\d+>/g, ':$1:').replace(/https?:\/\/\S+/g, '🔗').trim();
      if (!text && d.attachments && d.attachments.length) text = '📎 a envoyé un fichier'; if (!text && d.sticker_items) text = '🏷️ sticker';
      if (!text) return; text = text.slice(0, 140);
      const msg = { id: d.id, ch: c.id, chn: c.name, uid: d.author.id, n: (S.mem[d.author.id] || {}).name || d.author.global_name || d.author.username, av: d.author.avatar || null, text, t: Date.now() };
      (S.last[c.id] = S.last[c.id] || []).push(msg); if (S.last[c.id].length > 6) S.last[c.id].shift();
      this.bcast({ t: 'dmsg', m: msg });
    },
    gwVoiceMoved(uid, ch) { // les joueurs web avec la synchro suivent leur salon vocal
      const r = ch ? this.roomOfChannel(ch, this.profiles[uid]) : null; this.vcSeen[uid] = ch || undefined;
      if (r) for (const w of this.sockets()) if (this.att(w).id === uid) this.send(w, { t: 'vfollow', room: r });
    },
    roomOfChannel(ch, p) {
      const tm = p && p.team && this.world.teams[p.team]; if (tm && tm.channelId === ch) return 'team';
      const c = this.srv().ch[ch]; if (!c || c.type !== 2) return null;
      const n = c.name.toLowerCase(); for (const r of THEMES) if (n.includes(r)) return r;
      return c.pub ? 'v:' + c.id : null;
    },
    async gwWelcome(mb) {
      const u = mb.user; if (!u || u.bot) return; const w = this.world; w.known = w.known || []; if (w.known.includes(u.id)) return; w.known.push(u.id); w.memT = Date.now();
      const nm = mb.nick || u.global_name || u.username;
      await this.discord('POST', `/channels/${this.env.ANNOUNCE_CHANNEL_ID}/messages`, { content: `<@${u.id}>`, allowed_mentions: { users: [u.id] }, embeds: [{ color: 0x3bd16f, title: `🏠 Bienvenue dans la maison, ${nm} !`,
        description: `Un nouveau voisin débarque 🎉\nTa place t'attend dans **Discolife** : gare ta caisse, commande à Lola, défie les autres à l'arcade et gagne tes premières 🪙.`,
        thumbnail: { url: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256` : 'https://cdn.discordapp.com/embed/avatars/0.png' } }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Entrer dans Discolife', emoji: { name: '🏠' }, url: 'https://discolife.warren-molongo.workers.dev' }] }] });
      this.log('welcome', nm, 'vient d\'arriver sur le serveur 🏠'); this.save();
    },
    voiceView(v) { if (!v) return null; const c = this.srv().ch[v.ch]; if (c && c.pub) return v; const tm = Object.values(this.world.teams).find(t => t.channelId === v.ch); return tm ? { ...v, team: tm.id } : null; },
    srvSnapshot() {
      const S = this.srv();
      const ch = Object.values(S.ch).filter(c => c.pub || c.type === 4).map(c => ({ id: c.id, name: c.name, type: c.type, pos: c.pos, parent: c.parent }));
      const pubIds = new Set(ch.map(c => c.id));
      const voice = {}; for (const [u, v] of Object.entries(S.voice)) { const x = this.voiceView(v); if (x) voice[u] = x; }
      const mem = {}; for (const u of Object.keys(voice)) if (S.mem[u]) mem[u] = S.mem[u];
      const last = {}; for (const [k, v] of Object.entries(S.last)) if (pubIds.has(k)) { last[k] = v; for (const m of v) if (S.mem[m.uid]) mem[m.uid] = S.mem[m.uid]; }
      const on = this.online(), pres = {}; for (const [u, v] of Object.entries(S.pres)) if (voice[u] || on[u]) pres[u] = v;
      return { ready: S.ready, ch, voice, mem, pres, last };
    },
    srvPush(full) { if (full) this.bcast({ t: 'srv', s: this.srvSnapshot() }); },
  });
}
