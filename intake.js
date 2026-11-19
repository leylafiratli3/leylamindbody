// The pre-session intake form (intake.html, intake-tr.html).
// Every question on the page is marked data-q, inside a section marked data-part. On sending, each
// answer is saved with its question exactly as the client read it, so the admin page shows the
// form as it was filled in, in the client's language, and a question can change here without the
// server changing. Name, email and the storage consent are their own fields.
(function () {
  var form = document.getElementById('intake-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var done = document.getElementById('intake-done');
  var text = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };

  // "None of these" and the other boxes in the same list rule each other out.
  form.querySelectorAll('[data-none]').forEach(function (none) {
    var set = none.closest('fieldset');
    set.addEventListener('change', function (e) {
      if (e.target.type !== 'checkbox') return;
      if (e.target === none && none.checked) {
        set.querySelectorAll('input[type=checkbox]').forEach(function (b) { if (b !== none) b.checked = false; });
      } else if (e.target !== none && e.target.checked) none.checked = false;
    });
  });

  function answers() {
    return Array.prototype.map.call(form.querySelectorAll('[data-q]'), function (el) {
      var part = el.closest('[data-part]');
      var boxes = el.querySelectorAll('input[type=checkbox], input[type=radio]');
      var a;
      if (boxes.length) {
        a = Array.prototype.filter.call(boxes, function (b) { return b.checked; })
          .map(function (b) { return text(b.labels && b.labels[0]); }).join('\n');
      } else {
        a = (el.querySelector('textarea, input') || {}).value || '';
      }
      return { part: part ? part.dataset.part : '', q: text(el.querySelector('legend, label')), a: a };
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    var original = btn.textContent;
    btn.textContent = form.dataset.sending;
    btn.disabled = true;
    status.textContent = '';
    var body = {
      lang: document.documentElement.lang === 'tr' ? 'tr' : 'en',
      name: form.elements.name.value,
      email: form.elements.email.value,
      consent: form.elements.consent.checked,
      website: form.elements.website.value,
      answers: answers()
    };
    // When previewing locally, send to the local backend (cd backend && PORT=3000 node server.js)
    var url = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:3000/api/intake' : form.action;
    fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error();
      form.hidden = true;
      done.hidden = false;
      done.focus();
      done.scrollIntoView({ block: 'center' });
    }).catch(function () {
      status.textContent = form.dataset.error;
    }).finally(function () {
      btn.textContent = original;
      btn.disabled = false;
    });
  });
})();
