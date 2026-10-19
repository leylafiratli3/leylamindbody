#!/usr/bin/env python3
"""Build the Writing section from the text files in _writing/.

Run from the project root:   python3 tools/build_writing.py

Each file in _writing/ is one article. The file name sets the order and the address:
  04-what-is-tms.md  ->  /en/writing/what-is-tms.html, fourth in the list.

A file starts with a few "key: value" lines, then a line with only ---, then the text:

  title: What is TMS?
  date: 2026-10-12
  image: forest-cedar            (a photo in assets/, needs both .jpg and .webp)
  size: 1050x1400                (the photo's width x height in pixels)
  alt: What the photo shows
  title_html: optional, the title with <mark class="hl">...</mark> for the Writing page
  focus: optional, which part of the photo to keep when it is cropped (30% center = left of middle)
  updated: optional, the date you last edited it (2026-10-17); search engines see it
  ---
  The first paragraph is the short, direct answer.

  ## A heading
  More paragraphs. Blank line between paragraphs. [link text](/en/about.html), *italic*, **bold**.
  End a line with \\ to keep the line break inside a paragraph (With love,\\ then Leyla on the next line).
  - list item
  1. numbered list item

  ## Related questions
  ### A question?
  Its answer.

The first three articles are shown large on the Writing page, the rest in the compact list.
The page header and footer are copied from en/about.html, so nav changes there carry over.
"""
import datetime, glob, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://mindbodyhealingwithleyla.com'
SUBSTACK = 'https://leylafiratli.substack.com/'
os.chdir(ROOT)

SQUIGGLE = ('<svg viewBox="0 0 300 18" preserveAspectRatio="none" fill="none" aria-hidden="true">'
            '<path d="M3 13C70 5 150 16 200 9s95-4 97 2" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>')
PERSON = {"@type": "Person", "name": "Leyla Fıratlı", "url": f"{SITE}/en/about.html",
          "jobTitle": "Breathwork Therapist & Mind-Body Practitioner",
          "sameAs": [SUBSTACK, "https://www.instagram.com/leylafiratli/"]}
CLASS_TEXT = ("I share my story, explain how mind-body pain happens, help you tell whether you might be "
              "experiencing it, and leave you with a roadmap and tools to start working with it.")


# ---------- reading the article files ----------
def inline(t):
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)',
               lambda m: f'<a href="{m.group(2)}"' + (' target="_blank" rel="noopener"' if m.group(2).startswith('http') else '') + f'>{m.group(1)}</a>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', t)
    return t


def plain(t):
    return html.unescape(re.sub(r'<[^>]+>', '', t))


def first_sentence(t):
    """The opening sentence, plus the next one when the first is very short ("No.", "Yes, they can.")."""
    out = ''
    text = re.sub(r'\b(Dr|Mr|Ms|vs|U\.S)\. ', lambda m: m.group(1) + '.\x00', plain(t))  # don't end a sentence at "Dr."
    for part in re.findall(r'.+?[.!?](?:\s|$)', text + ' '):
        out += part.replace('\x00', ' ')
        if len(out.strip()) >= 60:
            break
    return out.strip() or plain(t)


def anchor(t):
    return re.sub(r'[^a-z0-9]+', '-', plain(t).lower()).strip('-')


def load(path):
    raw = open(path, encoding='utf-8').read()
    for bad in ('—', '–'):
        if bad in raw:
            sys.exit(f'{path}: contains a long dash. House rule: no em or en dashes.')
    meta_txt, text = raw.split('\n---\n', 1)
    meta = dict((k.strip(), v.strip()) for k, v in (line.split(':', 1) for line in meta_txt.strip().splitlines()))
    name = os.path.basename(path)[:-3]
    a = dict(meta, slug=re.sub(r'^\d+-', '', name))
    a['w'], a['h'] = a['size'].split('x')
    blocks = [b.strip() for b in re.split(r'\n\s*\n', text.strip()) if b.strip()]
    a['answer'] = inline(' '.join(blocks[0].splitlines()))
    body, related, sections, in_related = [], [], [], False
    for b in blocks[1:]:
        lines = b.splitlines()
        if b.startswith('## '):
            title = b[3:].strip()
            in_related = title.lower() == 'related questions'
            if not in_related:
                sections.append(title)
                body.append(f'<h2 id="{anchor(title)}">{inline(title)}</h2>')
        elif b.startswith('### '):
            if in_related:
                related.append([inline(b[4:].strip()), []])
            else:
                body.append(f'<h3>{inline(b[4:].strip())}</h3>')
        elif all(l.startswith('- ') for l in lines):
            items = ''.join(f'\n              <li>{inline(l[2:].strip())}</li>' for l in lines)
            (related[-1][1] if in_related and related else body).append(f'<ul>{items}\n            </ul>')
        elif all(re.match(r'\d+\. ', l) for l in lines):
            items = ''.join(f'\n              <li>{inline(l.split(". ", 1)[1].strip())}</li>' for l in lines)
            (related[-1][1] if in_related and related else body).append(f'<ol>{items}\n            </ol>')
        else:
            # a line ending in a backslash keeps its line break (for sign-offs: "With love,\" then "Leyla" on the next line)
            para = f'<p>{inline(" ".join(lines)).replace(chr(92) + " ", "<br>")}</p>'
            (related[-1][1] if in_related and related else body).append(para)
    a['body'], a['related'], a['sections'] = body, related, sections
    a['desc'] = a.get('description') or first_sentence(a['answer'])
    a.setdefault('topic', 'Writing')
    words = len(plain(' '.join([a['answer']] + body + [x for q, ans in related for x in [q] + ans])).split())
    a['minutes'] = max(1, round(words / 200))
    d = datetime.date.fromisoformat(a['date'])
    a['date_text'] = f'{d.day} {d.strftime("%B %Y")}'
    return a


ARTICLES = [load(p) for p in sorted(glob.glob('_writing/*.md'))]
if not ARTICLES:
    sys.exit('No articles found in _writing/.')

# ---------- shared page shell (from the About page) ----------
about = open('en/about.html', encoding='utf-8').read()
header = about[about.index('<body>'):about.index('  <main id="main">')]
footer = about[about.index('  </main>'):]
fonts = about[about.index('  <link rel="preconnect" href="https://fonts.googleapis.com">'):about.index('  <link rel="stylesheet" href="../liberation.css">')]


def head(title, desc, url, up, og_type, ld, image='leylaprofilepic'):
    t, d = html.escape(title), html.escape(desc)
    blocks = '\n'.join('  <script type="application/ld+json">\n' + json.dumps(x, ensure_ascii=False, indent=2) + '\n  </script>' for x in ld)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Built by tools/build_writing.py from _writing/. Edit the text there, then run the script. -->

  <title>{t}</title>
  <meta name="description" content="{d}">
  <link rel="canonical" href="{url}">

  <link rel="icon" type="image/png" href="{up}assets/favicon.png">

  <meta property="og:title" content="{t}">
  <meta property="og:description" content="{d}">
  <meta property="og:image" content="{SITE}/assets/{image}.jpg">
  <meta property="og:url" content="{url}">
  <meta property="og:type" content="{og_type}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{t}">
  <meta name="twitter:description" content="{d}">
  <meta name="twitter:image" content="{SITE}/assets/{image}.jpg">

{blocks}

{fonts}  <link rel="stylesheet" href="{up}liberation.css">
</head>
'''


def picture(a, up, pad, lazy=True):
    lz = ' loading="lazy"' if lazy else ''
    return (f'<picture>\n{pad}  <source srcset="{up}assets/{a["image"]}.webp" type="image/webp">\n'
            f'{pad}  <img src="{up}assets/{a["image"]}.jpg" alt="{html.escape(a["alt"])}" width="{a["w"]}" height="{a["h"]}"{lz}{focus(a)}>\n{pad}</picture>')


def focus(a):
    """Which part of the photo stays in view when it is cropped, from the optional focus: line."""
    return f' style="object-position: {html.escape(a["focus"])}"' if a.get('focus') else ''


def class_band(up):
    return f'''    <!-- FREE CLASS (ecru-deep, banner). The free class section always carries the banner photo. -->
    <section class="section bg-ecru-deep" style="padding-block:clamp(48px,7vw,96px)">
      <div class="wrap postcard class-postcard">
        <a href="/en/free-practices.html" class="class-banner" aria-label="Watch the free class: Mind Body Medicine 101">
          <img src="{up}assets/mbm101-banner.png" alt="Banner for Mind Body Medicine 101, a free 50-minute class with Leyla Fıratlı. It lists what the class covers. 01 My story. 02 How to know if your pain is mind-body. 03 A roadmap to freedom from pain." width="1600" height="864" loading="lazy">
        </a>
        <div>
          <p class="eyebrow">Free 50-minute class</p>
          <h2>Start with the free class</h2>
          <p>{CLASS_TEXT}</p>
          <div class="btn-row"><a href="/en/free-practices.html" class="btn btn-primary btn-lg">Get instant access</a></div>
        </div>
      </div>
    </section>
'''


# ---------- article pages ----------
os.makedirs('en/writing', exist_ok=True)
for i, a in enumerate(ARTICLES):
    url = f"{SITE}/en/writing/{a['slug']}.html"
    qa = [(a['title'], a['answer'])] + [(q, ' '.join(ans)) for q, ans in a['related']]
    ld = [
        {"@context": "https://schema.org", "@type": "Article", "headline": a['title'], "description": a['desc'],
         "author": PERSON, "publisher": PERSON, "datePublished": a['date'], "dateModified": a.get('updated', a['date']),
         "inLanguage": "en", "articleSection": a['topic'], "mainEntityOfPage": url, "image": f"{SITE}/assets/{a['image']}.jpg"},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": plain(q), "acceptedAnswer": {"@type": "Answer", "text": plain(t)}} for q, t in qa]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/en/"},
            {"@type": "ListItem", "position": 2, "name": "Writing", "item": f"{SITE}/en/writing.html"},
            {"@type": "ListItem", "position": 3, "name": a['title'], "item": url}]},
    ]
    body = ''.join(f'            {b}\n' for b in a['body'])
    toc = ''
    if a['sections']:
        toc = ('              <p class="eyebrow">In this piece</p>\n              <ul class="post-toc">\n'
               + ''.join(f'                <li><a href="#{anchor(s)}">{inline(s)}</a></li>\n' for s in a['sections'])
               + '              </ul>\n')
    related = ''
    if a['related']:
        related = ('          <div class="post-end-qa">\n            <h2 class="post-rule">Related questions</h2>\n            <div class="post-qa">\n'
                   + ''.join(f'              <div>\n                <h3>{q}</h3>\n' + ''.join(f'                {p}\n' for p in ans) + '              </div>\n' for q, ans in a['related'])
                   + '            </div>\n          </div>\n')
    nxt = [ARTICLES[(i + k) % len(ARTICLES)] for k in (1, 2, 3, 4) if len(ARTICLES) > k][:4]
    others = ''.join(f'''            <li>
              <a href="/en/writing/{o["slug"]}.html" class="other-tile">
                <span class="photo">
                  <picture>
                    <source srcset="../../assets/{o["image"]}.webp" type="image/webp">
                    <img src="../../assets/{o["image"]}.jpg" alt="" width="{o["w"]}" height="{o["h"]}" loading="lazy"{focus(o)}>
                  </picture>
                </span>
                <span class="other-title">{o["title"]}</span>
              </a>
            </li>
''' for o in nxt)
    main = f'''
  <main id="main">

    <!-- ARTICLE (ecru) -->
    <article class="section bg-ecru post">
      <div class="wrap">
        <div class="post-grid">
          <div class="post-head">
            <p class="eyebrow"><a href="/en/writing.html">Writing</a> <span aria-hidden="true">/</span> <a href="/en/writing.html#{anchor(a['topic'])}" class="no-arrow">{a['topic']}</a></p>
            <h1>{a['title']}</h1>
            <p class="post-meta">By <a href="/en/about.html">Leyla Fıratlı</a> <span aria-hidden="true">·</span> <time datetime="{a['date']}">{a['date_text']}</time> <span aria-hidden="true">·</span> {a['minutes']} min read</p>
            <p class="lede post-answer">{a['answer']}</p>
          </div>
          <div class="post-side">
            <figure class="photo photo-tall">
              {picture(a, '../../', '              ', lazy=False)}
            </figure>
            <aside class="post-aside">
{toc}              <p><a href="https://calendly.com/leylafiratli/introduction-call" target="_blank" rel="noopener" class="btn btn-outline">Book a free intro call</a></p>
              <p class="post-note">This work is educational and not a substitute for medical care.</p>
            </aside>
          </div>
          <div class="post-body">
{body}          </div>
        </div>

        <!-- related questions on the left, keep reading on the right -->
        <div class="post-end">
{related}          <div class="post-end-more">
            <h2 class="post-rule">Keep reading</h2>
            <ul class="post-others">
{others}            </ul>
          </div>
        </div>
      </div>
    </article>

{class_band('../../')}
'''
    page = head(f"{a['title']} | Leyla Fıratlı", a['desc'], url, '../../', 'article', ld, a['image']) + header + main + footer.replace('src="../site.js"', 'src="../../site.js"')
    open(f"en/writing/{a['slug']}.html", 'w', encoding='utf-8').write(page)

# ---------- Substack: latest posts, read from the public feed at build time ----------
def substack_posts(limit=4):
    """Newest Substack posts as dicts. Returns [] when offline or when there are no posts yet."""
    import urllib.request, xml.etree.ElementTree as ET, email.utils
    try:
        req = urllib.request.Request(SUBSTACK + 'feed', headers={'User-Agent': 'Mozilla/5.0'})
        root = ET.fromstring(urllib.request.urlopen(req, timeout=15).read())
    except Exception as e:
        print(f'  (could not read the Substack feed: {e}; building without it)')
        return []
    posts = []
    for item in root.iter('item'):
        enc = item.find('enclosure')
        try:
            d = email.utils.parsedate_to_datetime(item.findtext('pubDate', '')).date()
            date_text = f'{d.day} {d.strftime("%B %Y")}'
        except Exception:
            date_text = ''
        posts.append({'title': item.findtext('title', '').strip(), 'link': item.findtext('link', '').strip(),
                      'sub': plain(item.findtext('description', '') or '').strip(),
                      'image': enc.get('url') if enc is not None else '', 'date': date_text})
    return posts[:limit]


SS = substack_posts()


def subscribe_form(size=''):
    # Posts to the same address Substack's own embed uses; the confirmation opens in a new tab.
    return f'''<form class="ss-form {size}" action="{SUBSTACK}api/v1/free?nojs=true" method="post" target="_blank">
              <label class="sr-only" for="ss-email-{size or 'sm'}">Your email</label>
              <input type="email" id="ss-email-{size or 'sm'}" name="email" placeholder="Your email" autocomplete="email" required>
              <input type="hidden" name="source" value="embed">
              <button type="submit" class="btn btn-primary">Subscribe</button>
            </form>'''


def ss_list(posts, big=False):
    out = ''
    for p in posts:
        img = (f'<span class="ss-img"><img src="{html.escape(p["image"])}" alt="" loading="lazy"></span>' if p['image'] else '')
        sub = f'<span class="ss-sub">{html.escape(p["sub"])}</span>' if (big and p['sub']) else ''
        out += (f'              <li><a href="{html.escape(p["link"])}" target="_blank" rel="noopener" class="ss-post">'
                f'{img if big else ""}<span class="ss-text"><span class="ss-date">{p["date"]}</span>'
                f'<span class="ss-title">{html.escape(p["title"])}</span>{sub}</span></a></li>\n')
    return out


# ---------- the Writing page: common questions, topic pills filter the list, + sidebar ----------
TOPIC_ORDER = ['Understanding pain', 'Symptoms', 'Breath']
TOPICS = [t for t in TOPIC_ORDER if any(a['topic'] == t for a in ARTICLES)]
TOPICS += [t for t in dict.fromkeys(a['topic'] for a in ARTICLES) if t not in TOPICS]  # any new topic goes last


def post_row(a, up, lazy=True):
    href = f"/en/writing/{a['slug']}.html"
    return f'''          <li class="blog-post" data-topic="{anchor(a['topic'])}">
            <a href="{href}" class="blog-thumb photo" tabindex="-1" aria-hidden="true">
              {picture(a, up, '              ', lazy=lazy)}
            </a>
            <div>
              <p class="blog-topic">{a['topic']}</p>
              <h4><a href="{href}">{a['title']}</a></h4>
              <p class="blog-excerpt">{first_sentence(a['answer'])}</p>
              <p class="blog-meta"><time datetime="{a['date']}">{a['date_text']}</time> <span aria-hidden="true">·</span> {a['minutes']} min read</p>
            </div>
          </li>
'''


def sidebar(up):
    return f'''        <aside class="blog-side">
          <div class="side-block side-me">
            <img class="side-photo" src="{up}assets/portrait-small.jpg" alt="Leyla Fıratlı" width="440" height="440" loading="lazy">
            <!-- TODO: Leyla to rewrite these two lines in her voice. -->
            <p>I'm Leyla, a breathwork therapist and mind-body practitioner in Akyaka, Türkiye. I write about chronic pain, breath and freedom.</p>
            <a href="/en/about.html" class="post-more">More about me</a>
          </div>
          <div class="side-block side-ss">
            <p class="eyebrow">Substack</p>
            <p class="side-ss-title">Get my essays by email</p>
            {subscribe_form()}
          </div>
        </aside>'''


def ss_band():
    """Indigo band: the newest Substack post large, with the sign-up form under its text.
    Older posts (up to two) sit in a small row below. Before the first post, just the form."""
    form = f'''<div class="ss-signup">
              <p class="eyebrow">Subscribe on Substack</p>
              {subscribe_form('lg')}
            </div>'''
    if not SS:
        inner = f'''        <div class="ss-feature ss-feature-empty">
          <div class="ss-feature-text">
            {form}
          </div>
        </div>'''
    else:
        p = SS[0]
        img = (f'<a href="{html.escape(p["link"])}" target="_blank" rel="noopener" class="ss-img" tabindex="-1" aria-hidden="true">'
               f'<img src="{html.escape(p["image"])}" alt="" loading="lazy"></a>') if p['image'] else ''
        sub = f'<p class="ss-sub">{html.escape(p["sub"])}</p>' if p['sub'] else ''
        more = ''
        if len(SS) > 1:
            more = f'''
        <ul class="ss-more">
{ss_list(SS[1:3])}        </ul>'''
        inner = f'''        <div class="ss-feature">
          {img}
          <div class="ss-feature-text">
            <p class="eyebrow">Latest on Substack <span aria-hidden="true">·</span> {p['date']}</p>
            <h2><a href="{html.escape(p['link'])}" target="_blank" rel="noopener">{html.escape(p['title'])}</a></h2>
            {sub}
            <a href="{html.escape(p['link'])}" target="_blank" rel="noopener" class="post-more">Read the essay</a>
            {form}
          </div>
        </div>{more}'''
    return f'''
    <!-- SUBSTACK (indigo): newest essay and sign-up -->
    <section class="section bg-indigo ss-band">
      <div class="wrap">
{inner}
      </div>
    </section>
'''


def filter_css():
    """One rule per topic: when its radio is checked, hide the other posts and fill in its pill."""
    rules = [f'.blog:has(#topic-{k}:checked) .blog-post:not([data-topic="{k}"]) {{ display: none; }}' for k in map(anchor, TOPICS)]
    for k in ['all'] + [anchor(t) for t in TOPICS]:
        rules.append(f'.blog:has(#topic-{k}:checked) .topic-pills label[for="topic-{k}"] {{ background: var(--indigo); color: var(--ecru); }}')
        rules.append(f'.blog:has(#topic-{k}:focus-visible) .topic-pills label[for="topic-{k}"] {{ outline: 2px solid var(--indigo); outline-offset: 3px; }}')
    return '  <style>\n    ' + '\n    '.join(rules) + '\n  </style>\n'


# Keeps the address in step with the filter, so /en/writing.html#symptoms opens filtered
# and the topic link at the top of each article works. The filtering itself is CSS.
FILTER_JS = '''  <script>
  (function () {
    function fromHash() {
      var el = document.getElementById('topic-' + (location.hash.slice(1) || 'all'));
      if (!el || el.name !== 'topic') return;
      el.checked = true;
      if (location.hash) document.getElementById('common-questions').scrollIntoView();
    }
    document.querySelectorAll('input[name="topic"]').forEach(function (r) {
      r.addEventListener('change', function () {
        history.replaceState(null, '', r.id === 'topic-all' ? location.pathname : '#' + r.id.slice(6));
      });
    });
    window.addEventListener('hashchange', fromHash);
    fromHash();
  })();
  </script>
'''


def podcast_section():
    """The homepage's "Hear from me" podcast block, so both stay identical."""
    home = open('en/index.html', encoding='utf-8').read()
    a = home.index('    <!-- 3. PODCAST (ecru-deep) -->')
    b = home.index('    </section>\n', a) + len('    </section>\n')
    return '\n' + (home[a:b]
                   .replace('<!-- 3. PODCAST (ecru-deep) -->', '<!-- PODCAST (ecru), copied from the homepage -->')
                   .replace('class="section bg-ecru-deep"', 'class="section bg-ecru"')
                   .replace('<iframe style="border-radius:16px"', '<iframe style="border-radius:16px" loading="lazy"'))

def blog_page(title_h1, lede, posts, up):
    rows = ''.join(post_row(a, up, lazy=i > 1) for i, a in enumerate(posts))
    pills = [('all', 'All', len(posts))] + [(anchor(t), t, sum(a['topic'] == t for a in posts)) for t in TOPICS]
    radios = ''.join(f'\n          <input type="radio" name="topic" id="topic-{k}"{" checked" if k == "all" else ""}><label for="topic-{k}">{name}</label>' for k, name, n in pills)
    chips = ''.join(f'<label for="topic-{k}">{name} <span>{n}</span></label>' for k, name, n in pills)
    band = ss_band()
    return f'''
  <main id="main">

    <!-- HERO (ecru) -->
    <section class="section bg-ecru writing-hero">
      <div class="wrap reveal in">
        {title_h1}
        {lede}
      </div>
    </section>
{band if SS else ''}
    <!-- COMMON QUESTIONS + SIDEBAR (ecru-deep) -->
    <!-- Topic radios filter the list in CSS (see filter_css); the pills are their visible labels. -->
    <section class="section bg-ecru-deep blog" id="common-questions" aria-labelledby="common-questions-title">
      <fieldset class="sr-only">
        <legend>Show questions about</legend>{radios}
      </fieldset>
      <div class="wrap blog-grid">
        <div>
          <h2 class="blog-list-title" id="common-questions-title">The questions that come up most</h2>
          <p class="topic-pills" aria-hidden="true">{chips}</p>
          <ol class="blog-list">
{rows}          </ol>
        </div>
{sidebar(up)}
      </div>
    </section>
{'' if SS else band}
{podcast_section()}
{class_band(up)}'''


url = f"{SITE}/en/writing.html"
desc = "Writing on chronic pain, breath and the mind-body approach by Leyla Fıratlı, with longer essays on Substack."
ld = [
    {"@context": "https://schema.org", "@type": "Blog", "name": "Writing by Leyla Fıratlı", "url": url, "description": desc,
     "author": PERSON, "inLanguage": "en",
     "blogPost": [{"@type": "BlogPosting", "headline": a['title'], "url": f"{SITE}/en/writing/{a['slug']}.html",
                   "datePublished": a['date'], "author": PERSON, "articleSection": a['topic']} for a in ARTICLES]},
    {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/en/"},
        {"@type": "ListItem", "position": 2, "name": "Writing", "item": url}]},
]
main = blog_page(
    f'<h1><span class="mark">Writing{SQUIGGLE}</span></h1>',
    '<p class="lede">Answers to the questions I get asked most about this work.<br>My longer thoughts are on Substack.</p>',
    ARTICLES, '../')
page_head = head('Writing on chronic pain and the mind-body approach | Leyla Fıratlı', desc, url, '../', 'website', ld)
page_head = page_head.replace('</head>', filter_css() + '</head>')
open('en/writing.html', 'w', encoding='utf-8').write(
    page_head + header + main + footer.replace('</body>', FILTER_JS + '</body>'))

# topic pages from an earlier version are no longer built
for old in glob.glob('en/writing/topic-*.html'):
    os.remove(old)

# ---------- sitemap ----------
s = open('sitemap.xml', encoding='utf-8').read()
today = datetime.date.today().isoformat()
add = ''
for u, pr in [('writing.html', '0.8')] + [(f"writing/{a['slug']}.html", '0.7') for a in ARTICLES]:
    if f'/en/{u}<' not in s:
        add += f'  <url>\n    <loc>{SITE}/en/{u}</loc>\n    <lastmod>{today}</lastmod>\n    <priority>{pr}</priority>\n  </url>\n'
if add:
    open('sitemap.xml', 'w', encoding='utf-8').write(s.replace('</urlset>', add + '</urlset>'))

print(f'Built the Writing page and {len(ARTICLES)} articles.')
