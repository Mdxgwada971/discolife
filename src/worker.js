// Discolife — serveur (Cloudflare Worker + Durable Object)
export { House } from './house.js';

const DISCORD = 'https://discord.com/api/v10';
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

async function exchange(env, code, redirect_uri) {
  const body = new URLSearchParams({ client_id: env.CLIENT_ID, client_secret: env.CLIENT_SECRET || '', grant_type: 'authorization_code', code });
  if (redirect_uri) body.set('redirect_uri', redirect_uri);
  const r = await fetch(`${DISCORD}/oauth2/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(d.error_description || d.error || 'échange refusé');
  return d.access_token;
}

// Vérifie le jeton Discord : renvoie l'utilisateur et s'il est membre de La Maison
async function whoami(env, token) {
  if (env.DEV === '1' && token.startsWith('dev:')) {
    const [, id, name] = token.split(':');
    return { user: { id, name: decodeURIComponent(name || 'dev' + id), avatar: null }, member: true };
  }
  const h = { authorization: `Bearer ${token}` };
  const r = await fetch(`${DISCORD}/users/@me`, { headers: h });
  if (!r.ok) return null;
  const u = await r.json();
  let member = true;
  if (env.GUILD_ID) {
    const g = await fetch(`${DISCORD}/users/@me/guilds`, { headers: h });
    if (g.ok) { const list = await g.json(); member = list.some(x => x.id === env.GUILD_ID); }
  }
  return { user: { id: u.id, name: u.global_name || u.username, avatar: u.avatar || null }, member };
}

const hex = h => new Uint8Array((h || '').match(/../g).map(x => parseInt(x, 16)));
async function verifySig(pk, sig, msg) {
  try { const k = await crypto.subtle.importKey('raw', hex(pk), { name: 'Ed25519' }, false, ['verify']); return await crypto.subtle.verify({ name: 'Ed25519' }, k, hex(sig), new TextEncoder().encode(msg)); }
  catch { return false; }
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname.replace(/^\/\.proxy/, '');

    // Activité Discord : échange du code contre un jeton
    if (p === '/api/token' && req.method === 'POST') {
      try { const { code } = await req.json(); return json({ access_token: await exchange(env, code) }); }
      catch (e) { return json({ error: String(e.message || e) }, 400); }
    }

    // Version web : connexion avec Discord
    if (p === '/auth/login') {
      const redirect = `${url.origin}/auth/callback`;
      const q = new URLSearchParams({ client_id: env.CLIENT_ID, response_type: 'code', redirect_uri: redirect, scope: 'identify guilds', prompt: 'none' });
      return Response.redirect(`https://discord.com/oauth2/authorize?${q}`, 302);
    }
    if (p === '/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) return Response.redirect(`${url.origin}/`, 302);
      try { const t = await exchange(env, code, `${url.origin}/auth/callback`); return Response.redirect(`${url.origin}/#t=${encodeURIComponent(t)}`, 302); }
      catch (e) { return Response.redirect(`${url.origin}/#err=login`, 302); }
    }

    // Avatars Discord (passent par le serveur pour marcher dans l'Activité)
    const av = p.match(/^\/api\/avatar\/(\d+)\/([\w]+)$/);
    if (av) {
      const src = av[1] === '0' ? `https://cdn.discordapp.com/embed/avatars/${Number(av[2]) % 6}.png`
        : `https://cdn.discordapp.com/avatars/${av[1]}/${av[2]}.png?size=128`;
      const r = await fetch(src, { cf: { cacheTtl: 86400, cacheEverything: true } });
      return new Response(r.body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'image/png', 'cache-control': 'public, max-age=86400' } });
    }

    // Connexion temps réel au jeu
    if (p === '/api/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('websocket attendu', { status: 426 });
      const token = url.searchParams.get('token') || '';
      const who = token ? await whoami(env, token).catch(() => null) : null;
      if (!who || !who.member) {
        const pair = new WebSocketPair(); pair[1].accept();
        pair[1].close(who ? 4003 : 4001, who ? 'pas membre' : 'jeton invalide');
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      const stub = env.HOUSE.get(env.HOUSE.idFromName('la-maison'));
      const h = new Headers(req.headers); h.set('x-user', JSON.stringify(who.user));
      return stub.fetch(new Request(req.url, { headers: h }));
    }

    // Commandes du serveur Discord (/vip, /recruter, /classement…)
    if (p === '/api/interactions' && req.method === 'POST') {
      const sig = req.headers.get('x-signature-ed25519'), ts = req.headers.get('x-signature-timestamp'), body = await req.text();
      if (!env.PUBLIC_KEY || !sig || !ts || !(await verifySig(env.PUBLIC_KEY, sig, ts + body))) return new Response('signature invalide', { status: 401 });
      const ix = JSON.parse(body);
      if (ix.type === 1) return json({ type: 1 });
      const stub = env.HOUSE.get(env.HOUSE.idFromName('la-maison'));
      ctx.waitUntil(stub.fetch('https://do/ix', { method: 'POST', body }));
      if (ix.type === 2) return json({ type: 5, data: ['equipe', 'quitter', 'retirer'].includes(ix.data?.name) ? { flags: 64 } : {} });
      return json({ type: 6 });
    }
    if (p === '/api/setup') {
      const stub = env.HOUSE.get(env.HOUSE.idFromName('la-maison'));
      return new Response(await (await stub.fetch('https://do/setup')).text(), { headers: { 'content-type': 'application/json' } });
    }

    if (p === '/api/health') return json({ ok: true });
    return env.ASSETS.fetch(req);
  },
};
