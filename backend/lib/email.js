const { Resend } = require('resend');

// Transactional email via Resend, localized EN/TR by purchase locale.
// Copy lives in the TEMPLATES object below — edit freely.

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
const FROM = process.env.EMAIL_FROM || 'Leyla <onboarding@resend.dev>';

const TEMPLATES = {
  setPassword: {
    en: (p) => ({
      subject: 'Your video is ready — set your password',
      html: `
        <p>Hi,</p>
        <p>Thank you for your purchase of <strong>${p.productTitle}</strong>.</p>
        <p>To watch it, set a password for your account (it uses this email address):</p>
        <p><a href="${p.actionLink}">Set your password</a></p>
        <p>Afterwards you can log in any time at <a href="${p.appUrl}/login.html">${p.appUrl}/login.html</a> and find everything you own in your library.</p>
        <p>With warmth,<br>Leyla</p>`,
    }),
    tr: (p) => ({
      subject: 'Videonuz hazır — şifrenizi oluşturun',
      html: `
        <p>Merhaba,</p>
        <p><strong>${p.productTitle}</strong> satın aldığınız için teşekkürler.</p>
        <p>İzlemek için bu e-posta adresine bağlı hesabınızın şifresini oluşturun:</p>
        <p><a href="${p.actionLink}">Şifrenizi oluşturun</a></p>
        <p>Sonrasında dilediğiniz zaman <a href="${p.appUrl}/tr/giris.html">${p.appUrl}/tr/giris.html</a> adresinden giriş yapıp sahip olduğunuz tüm derslere kütüphanenizden ulaşabilirsiniz.</p>
        <p>Sevgiyle,<br>Leyla</p>`,
    }),
  },
  receipt: {
    en: (p) => ({
      subject: `Purchase confirmed: ${p.productTitle}`,
      html: `
        <p>Hi,</p>
        <p>Your purchase of <strong>${p.productTitle}</strong> is confirmed and has been added to your library.</p>
        <p><a href="${p.appUrl}/library.html">Go to your library</a> (log in with this email address).</p>
        <p>With warmth,<br>Leyla</p>`,
    }),
    tr: (p) => ({
      subject: `Satın alma onaylandı: ${p.productTitle}`,
      html: `
        <p>Merhaba,</p>
        <p><strong>${p.productTitle}</strong> satın alımınız onaylandı ve kütüphanenize eklendi.</p>
        <p><a href="${p.appUrl}/tr/kutuphane.html">Kütüphanenize gidin</a> (bu e-posta adresiyle giriş yapın).</p>
        <p>Sevgiyle,<br>Leyla</p>`,
    }),
  },
};

function pickLocale(locale) {
  return locale === 'tr' ? 'tr' : 'en';
}

async function sendSetPasswordEmail({ to, locale, productTitle, actionLink }) {
  const t = TEMPLATES.setPassword[pickLocale(locale)]({
    productTitle,
    actionLink,
    appUrl: process.env.APP_URL || '',
  });
  return resend.emails.send({ from: FROM, to, subject: t.subject, html: t.html });
}

async function sendReceipt({ to, locale, productTitle }) {
  const t = TEMPLATES.receipt[pickLocale(locale)]({
    productTitle,
    appUrl: process.env.APP_URL || '',
  });
  return resend.emails.send({ from: FROM, to, subject: t.subject, html: t.html });
}

module.exports = { sendSetPasswordEmail, sendReceipt };
