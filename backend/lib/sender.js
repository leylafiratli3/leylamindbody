// Sender (sender.net) — add a free-class lead to the free-class group,
// which triggers the welcome automation in Sender.
// No-op if not configured, so the free-class flow works before Sender is set up.

const API_BASE = process.env.SENDER_API_BASE || 'https://api.sender.net/v2';
const API_TOKEN = process.env.SENDER_API_TOKEN;
const GROUP_ID = process.env.SENDER_FREE_CLASS_GROUP_ID;

async function subscribeFreeClass({ email, firstName }) {
  if (!API_TOKEN || !GROUP_ID) return { skipped: true };

  const res = await fetch(`${API_BASE}/subscribers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      firstname: firstName || undefined,
      groups: [GROUP_ID],
      trigger_automation: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sender subscribe failed: ${res.status} ${text}`);
  }
  return res.json();
}

module.exports = { subscribeFreeClass };
