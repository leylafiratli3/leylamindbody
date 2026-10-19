// Sender (sender.net): every mailing list on the site lives here, one Sender group per list,
// and contact-form notes are emailed to Leyla through Sender's transactional sending.
// Joining a group can trigger an automation in Sender (e.g. the free-class welcome email).
// List sign-ups are a no-op if not configured, so those flows work before Sender is set up.

const API_BASE = process.env.SENDER_API_BASE || 'https://api.sender.net/v2';
const API_TOKEN = process.env.SENDER_API_TOKEN;

async function senderPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sender ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function addToGroup(groupId, { email, firstName }) {
  if (!API_TOKEN || !groupId) return { skipped: true };
  return senderPost('/subscribers', {
    email,
    firstname: firstName || undefined,
    groups: [groupId],
    trigger_automation: true,
  });
}

const subscribeFreeClass = (person) => addToGroup(process.env.SENDER_FREE_CLASS_GROUP_ID, person);
const subscribeNewsletter = (person) => addToGroup(process.env.SENDER_NEWSLETTER_GROUP_ID, person);

// Sends one email (e.g. a contact-form note) to Leyla. Throws if Sender isn't configured,
// because unlike a list sign-up, a note that isn't sent is a note that's lost.
async function sendEmail({ to, from, replyTo, subject, html, text }) {
  if (!API_TOKEN) throw new Error('Sender is not configured (SENDER_API_TOKEN)');
  return senderPost('/message/send', {
    from,
    to,
    subject,
    html,
    text,
    headers: replyTo ? { 'Reply-To': replyTo } : undefined,
  });
}

module.exports = { subscribeFreeClass, subscribeNewsletter, sendEmail };
