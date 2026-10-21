This is the website of Leyla Fıratlı, breathwork therapist and mind-body practitioner. I work with people living with chronic pain, drawing on Dr. John Sarno's work, breath, and somatic awareness, with a decolonial and political lens. I live and work in Türkiye. Domain: https://leylafiratli.com

Read this before you write any code or copy for this site. The design and the voice matter as much as the code working.

## Who the site is for

People with chronic pain who have been dismissed by doctors, who have tried everything, and who are tired of healing spaces that ask them to leave their politics at the door. Many are queer, trans, organizers, people carrying political grief. They are smart and they notice when something is fake. Write and design for them.

## How to work with me

- Before big changes, look at the shared stylesheet and components first, then give me a short plan.
- When I ask you to redesign a page or section, always give me a few design options to choose from first (a short menu with small previews), before you build anything.
- Work on a branch.
- Keep all SEO work intact: titles, meta descriptions, canonical URLs, Open Graph tags, JSON-LD, alt text, sitemap. Every page has a unique title and description.
- The site is English only. The home page is leylafiratli.com and pages live at the top level (leylafiratli.com/about.html). The old /en/ and /tr/ addresses are redirect pages. Don't add language switchers or hreflang back.
- When you finish, tell me what changed and give me a list of TODOs. Keep the summary plain and short.
- If you're not sure about copy, leave a clear TODO: Leyla to write instead of inventing text in my name.

## Design principles

The brand is called "Indigo and rose." It should feel calm, warm, handmade, and grounded. Not clinical, not glossy, not "women's wellness."

### The feeling

- Warm, never medical. No pure white, no gray backgrounds, no cool clinical blues, no stock photos, no gradients, no glossy effects.
- Handmade over polished. Slightly imperfect lines, marker highlights, stamp labels, paper texture.
- Rooted in place. Aegean arches, the sea, pine trees, the Azmak river, the sun over Gökova, breath, roots. Use my real photos from /assets.
- No spiritual clichés. No lotus poses, chakras, monks, or borrowed sacred imagery.
- Bodies in illustrations are gender-neutral, varied skin tones, real and non-idealized.
- Lots of breathing room. When in doubt, add space, remove things.

### Colors

```
--indigo:      #23285E   night sections, main text on light, primary buttons on light
--indigo-soft: #343A7A   hover for indigo buttons
--ecru:        #EFE7DA   main day background, light text on indigo
--ecru-deep:   #E4D9C6   alternate day background, cards
--rose:        #E5A3AE   quote bands, highlights, accent text and buttons on indigo
--rose-light:  #EDB9C2   hover for rose buttons
--rose-wash:   #F5E1E3   soft card backgrounds, testimonials
--periwinkle:  #6E7BC4   DECORATIVE ONLY: lines, dividers, icons, illustrations
```

Contrast rules (must pass WCAG AA):

- On ecru, ecru-deep, rose-wash: indigo text, indigo buttons with ecru text, indigo underlined links.
- On indigo: ecru text, rose accent text, rose buttons with indigo text, ecru outline buttons.
- On rose: indigo text only.
- Never use rose or periwinkle as text on light backgrounds. Never use periwinkle for anything someone has to read.

### Typography

- Headings: Fraunces, weight 600, optical size on, SOFT axis around 50 to 100 so the curves feel round and human.
- Pull quotes and testimonials: Fraunces italic, weight 400.
- Body, nav, buttons, labels: DM Sans 400/500.
- H1 clamp(2.4rem, 6vw, 4.5rem) line height 1.08. H2 clamp(1.8rem, 4vw, 3rem) line height 1.15. H3 1.4rem.
- Body 18px, line height 1.65. Reading width max 680px.
- Eyebrows and labels: DM Sans 500, 13px, uppercase, letter-spacing 0.12em.
- The "ı" in Fıratlı must render correctly. Always write my name with the ı.

### Layout and rhythm

- Four background types: ecru, ecru-deep, indigo, rose. Never put two sections with the same background next to each other.
- Section padding clamp(64px, 10vw, 128px). Container max 1200px.
- Asymmetric layouts. Alternate image and text sides between sections.
- Soft curved SVG edges (like a slow wave, a breath) only after the hero and before the footer. Straight edges everywhere else so the curves feel special.

### Images

- Portraits of me: arch shape (rounded top, flat bottom), like Aegean and Anatolian architecture.
- Landscapes and secondary images: organic pebble shapes. Reuse 2 or 3 variations.
- Small images and avatars: circles.
- Key images get a thin offset outline: same shape, shifted 12px down and right, 1.5px periwinkle line.
- object-fit cover, real alt text, lazy load below the fold, WebP with fallbacks.

### Details

- Highlighter: `<mark class="hl">` with a rose marker stroke, slightly uneven, rotated about -1deg. Light backgrounds only, max 1 or 2 per section.
- Hand-drawn squiggle underline under one word in some headings. Max one per heading.
- Stamp labels: small pills rotated -4deg, outlined, uppercase DM Sans 12px ("free practice", "decolonial", "coming soon").
- Breath lines: flowing hand-drawn SVG lines in periwinkle or rose, low visual weight, behind content.
- Optional paper grain on ecru. Skip it if it hurts performance or readability.

### Components

- Buttons: pill shape, DM Sans 500, 15px, padding 14px 26px, small arrow after the label. Labels speak in the reader's voice ("Send me the practice", "I'm ready"), not tasks ("Learn more", "Submit").
- Cards: 24px radius, no borders, rose-wash or ecru-deep, 28 to 32px padding.
- Testimonials: big rose quotation mark, Fraunces italic quote, first name as an uppercase eyebrow.
- FAQ: native `<details>`/`<summary>`, plus icon that rotates into an X.
- Nav: name on the left in Fraunces, uppercase DM Sans links on the right, "Work with me" dropdown, "Free practice" pill button at the far right. Sticky on ecru. Full-screen indigo menu on mobile, keyboard accessible with focus trapping.
- Footer includes: "This work is educational and not a substitute for medical care."

### Motion

Slow, soft, breath-like. Nothing bouncy or flashy.

- Buttons lift 2px, arrow slides 4px, 200ms.
- Link underlines grow left to right, 250ms.
- Cards lift 4px with a soft indigo-tinted shadow, 300ms.
- Images scale to 1.03 inside their frame, 600ms.
- Sections fade in and rise 16px once, 700ms.
- Breathing circle in the closing CTA: scales 0.92 to 1.0 on a 10 second loop, 5 in, 5 out.
- Respect prefers-reduced-motion. Turn off all movement.
- Visible focus states on everything interactive.

### Technical

- Mobile first. Check 375, 768, 1024, 1440.
- Preload the two fonts with font-display: swap.
- CSS for animation where possible. JS only for IntersectionObserver and the mobile menu.
- Run Lighthouse and fix accessibility, contrast, and performance issues.

## My voice

When you write or edit copy, it should sound like me, not like a wellness brand and not like AI.

How I actually write:

- Direct, no hedging. "The world around us is alive." Not "perhaps we might consider."
- Long loose sentences joined with "and," then a short one that lands. The rhythm is uneven, and that's fine. Don't smooth it out.
- I repeat things on purpose when they matter.
- I speak from "I think" and "for me." I share what I believe, I don't lecture.
- The spiritual and the political sit together in the same sentence without me explaining the link.
- Plain words. "Really," "actually," "basically." Not polished vocabulary.
- I don't tie everything up neatly. Not every paragraph needs a takeaway.

On the site specifically:

- Speak to the reader as "you." Use "I" mostly in the Meet Leyla and About sections.
- Warm, direct, hopeful, politically clear. Never preachy.
- Use "freedom" as the core frame word. Use "healing" sparingly.
- My title: Breathwork Therapist & Mind-Body Practitioner. (TODO: confirm against my SarnoXSachs certificate before changing it.)
- Mind-body medicine is the field my work comes from. Don't call what I offer "medicine."

### Words I use

People, you, freedom, your body has more to say, paying attention, protection, breath, nervous system, decolonial, collective, liberation, political grief, burnout, queer- and trans-affirming.

### Words I never use

- "Women." Say "you" or "people." My audience includes queer, trans, and nonbinary folks.
- Medical claims: cure, fix, guarantee, treat, diagnose.
- "Pain reprocessing." It's someone else's trademarked method.
- "JournalSpeak." Nicole Sachs' trademark. Describe my journaling work in my own words.
- Vague borrowed wisdom: "the wisdom of indigenous cultures," "ancient practices." Name what I draw from, or speak from my own lineage.
- Wellness filler: journey, transformative, holistic, empower, unlock, embrace, nurture, sacred space, show up, hold space, self-love, your best self, thrive, elevate.

## Do not write like AI

This is a hard rule for all copy, headings, alt text, meta descriptions, and comments a visitor could see.

No em dashes. Ever. Not in copy, not in titles, not in meta descriptions. Also no en dashes used as dashes. Use a period, a comma, a colon, or parentheses, or rewrite the sentence. Check the final output for the characters — and – before you hand anything back, and remove them.

Also avoid these patterns:

- Lists of three for rhythm ("pain, anxiety, and exhaustion"). If there are really two things, say two. If there are five, say five.
- "It's not X, it's Y" and "not just X, but Y" constructions. Maybe once on the whole site, and only if it's mine.
- Short punchy sentence at the end of every paragraph. Let paragraphs end however they end.
- Perfectly balanced sentences and parallel structures that sound too tidy.
- Fake-intimate openers: "Let's be honest," "Here's the thing," "I want to be honest," "The truth is."
- Rhetorical question then answer: "So what does this mean? It means..."
- Big abstract words: journey, landscape, tapestry, realm, delve, navigate, foster, leverage, robust, seamless, profound, testament, intricate, ever-evolving, in today's world.
- Over-reassuring tone: "You are not alone," "It's okay to," "You deserve," stacked one after another.
- Colons in every heading ("Breath: A Path to Freedom"). Write headings like a person would say them.
- Title Case Headings. Use sentence case.
- Emojis and exclamation marks in body copy.
- Summarizing what you just said at the end of a section.

A quick test before you hand copy back: read it out loud. If it sounds like a LinkedIn post or a wellness app, rewrite it plainer. If it sounds like I'm talking to a friend over tea, it's right.

When you can't make something sound like me, write it short and plain, and mark it TODO: Leyla to rewrite in my voice. Plain and short is always better than polished and fake.
