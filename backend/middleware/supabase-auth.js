const { jwtVerify, createRemoteJWKSet } = require('jose');

// Verifies the Supabase access token (JWT) sent as "Authorization: Bearer <token>".
// Supabase projects sign with a shared HS256 secret (SUPABASE_JWT_SECRET) by default;
// projects migrated to asymmetric keys expose a JWKS URL instead (SUPABASE_JWKS_URL).
// On success, req.user = { id: <supabase uuid>, email }.

let jwks = null;
if (process.env.SUPABASE_JWKS_URL) {
  jwks = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL));
}

async function verifyToken(token) {
  if (jwks) {
    const { payload } = await jwtVerify(token, jwks);
    return payload;
  }
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error('Neither SUPABASE_JWT_SECRET nor SUPABASE_JWKS_URL is configured');
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: ['HS256'],
  });
  return payload;
}

async function requireSupabaseUser(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }
  try {
    const payload = await verifyToken(token);
    if (!payload.sub) throw new Error('Token has no subject');
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { requireSupabaseUser };
