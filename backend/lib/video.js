const crypto = require('crypto');

// Bunny Stream signed playback (embed) URLs — token-authenticated and short-lived.
// The Stream library must have "Embed View Token Authentication" enabled and
// allowed referrers restricted to the site domain (see README).
// Kept behind this one module so the provider can be swapped (e.g. Cloudflare Stream) later.

const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;
const TOKEN_AUTH_KEY = process.env.BUNNY_TOKEN_AUTH_KEY;

function getSignedPlaybackUrl(videoId, { expiresInSeconds = 3600 } = {}) {
  if (!LIBRARY_ID || !TOKEN_AUTH_KEY) {
    throw new Error('Bunny Stream is not configured (BUNNY_STREAM_LIBRARY_ID / BUNNY_TOKEN_AUTH_KEY)');
  }
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  // Bunny embed token: SHA256 hex of (token key + video id + expiry timestamp)
  const token = crypto
    .createHash('sha256')
    .update(TOKEN_AUTH_KEY + videoId + expires)
    .digest('hex');
  return `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?token=${token}&expires=${expires}`;
}

module.exports = { getSignedPlaybackUrl };
