// Kit (ConvertKit) — subscribe a free-class lead to a form and tag them by locale,
// which triggers the nurture automation in Kit.
// No-op if not configured, so the free-class flow works before Kit is set up.

const API_BASE = process.env.KIT_API_BASE || 'https://api.convertkit.com/v3';
const API_KEY = process.env.KIT_API_KEY;
const FORM_ID = process.env.KIT_FREE_CLASS_FORM_ID;

function tagIdForLocale(locale) {
  const id = locale === 'tr'
    ? process.env.KIT_TAG_FREE_CLASS_TR
    : process.env.KIT_TAG_FREE_CLASS_EN;
  return id ? Number(id) : null;
}

// Adds (or re-subscribes) the email to the free-class form with the locale tag.
// Kit dedupes by email, so calling this for an existing subscriber is safe.
async function subscribeFreeClass({ email, firstName, locale }) {
  if (!API_KEY || !FORM_ID) return { skipped: true };

  const tagId = tagIdForLocale(locale);
  const res = await fetch(`${API_BASE}/forms/${FORM_ID}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: API_KEY,
      email,
      first_name: firstName || undefined,
      tags: tagId ? [tagId] : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Kit subscribe failed: ${res.status} ${text}`);
  }
  return res.json();
}

module.exports = { subscribeFreeClass };
