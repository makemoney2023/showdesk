# Show Desk — Marketing Page Concept & Copy (SEO / AEO / GEO)

The public landing page. Companion to `content-strategy.md` (what we publish) and
`facebook-playbook.md` (how it travels). This document contains the page concept, the complete
copy, and the technical spec, ready to implement.

---

## 1. Concept

**One page, three search audiences:**

| Audience | Arrives from | Wants |
|---|---|---|
| Club secretary / organizer | Referral, "sieger show secretary software", "dog show critique software" | Proof we understand their show format, then a call |
| Breeder / exhibitor | "what is a sieger show", "what does V1 mean", "richterbericht", shared Facebook link | An answer, then curiosity about the certificate email |
| Answer engines (Google AI Overviews, ChatGPT, Perplexity) | Retrieval for niche entity queries | Clean, citable definitions |

The third audience is the strategic one. Generative engines currently have thin, scattered
coverage of this niche — the best sources are 2010-era kennel pages and untranslated German PDFs.
A page that defines *Sieger show*, *Richterbericht*, *Formwert*, and *SE evaluation* in clean,
extractable English has a realistic chance of becoming the source AI answers cite. That is a
much bigger prize here than ranking #1 for a 50-searches-a-month keyword, and it compounds with
the content hub from `content-strategy.md`.

**Positioning line (used everywhere, verbatim, so engines learn the entity):**

> Show Desk is show secretary software for German-style breed shows. It records the judge's
> spoken critique ringside, transcribes it live, and delivers the official critique certificate
> to the owner's inbox the same day.

**Writing rules applied throughout:**

- Every H2 is either a question or an entity name; the first paragraph under it is a direct,
  standalone answer of roughly 40–60 words that survives being quoted out of context (AEO).
- Definitions are stated as "X is Y" sentences with consistent entity naming (GEO).
- Concrete numbers wherever they exist — engines and readers both prefer citable specifics.
- No marketing filler ("revolutionary", "seamless", "game-changing"). This audience is allergic
  to it and it carries zero retrieval value.

---

## 2. Page architecture

```
/                     Public marketing page (this document)
/login                Existing auth (unchanged)
/blog/*               Content hub (content-strategy.md)
/results/*            Public archive (future; the compounding asset)
```

Section order, chosen so the answer-bait sits high and the sales content sits where a
secretary who is already convinced will scroll:

1. Hero — positioning + primary CTA
2. The problem — the paper trail, with the breeding-document fact
3. What is Show Desk — the definitional block engines retrieve
4. How it works — three steps (HowTo schema)
5. Feature grid — six entities, one card each
6. Built for the ring — offline reality
7. Paper vs. Show Desk — comparison table
8. Who it serves — clubs, judges, secretaries
9. FAQ — the AEO engine (FAQPage schema, visible in the DOM)
10. Final CTA + footer links into the content hub

---

## 3. Copy

Everything below is final copy, not placeholder.

### 3.1 Metadata

- **Title tag** (55 chars): `Show Desk — Sieger Show Secretary & Critique Software`
- **Meta description** (152 chars): `Show secretary software for German-style breed shows. The judge's spoken critique becomes an official certificate in the owner's inbox the same day.`
- **Canonical:** the production root URL
- **OG title:** `The judge speaks. The certificate arrives the same day.`
- **OG description:** reuse the meta description
- **OG image:** the paperwork before-and-after (handwritten critique sheet beside the generated
  certificate), 1200×630 — the same image identified in `facebook-playbook.md` as the most
  persuasive asset we can produce

### 3.2 Hero

**Eyebrow:** SHOW DESK

**H1:** The judge speaks. The certificate arrives the same day.

**Subhead:**
Show Desk is show secretary software for German-style breed shows — Sieger shows, SE
evaluations, and breed surveys. It records the judge's spoken critique ringside, transcribes it
live, and emails the official critique certificate to the owner before they leave the grounds.

**Primary CTA:** Book a show walkthrough
**Secondary CTA:** See how it works ↓

**Hero visual:** split image — left, a ring secretary's clipboard with a handwritten critique;
right, the finished TNRK certificate PDF on a phone, timestamped the same afternoon.

### 3.3 The problem

**H2: The critique is the whole point of the show — and it's the last thing owners get**

At a German-style show, every dog is critiqued aloud by the judge and the critique is recorded
in writing for the exhibitor. That written critique is not a souvenir: under ADRK rules, judge
reports rated V or SG are required documents for a Körung, the breed survey that approves a dog
for breeding.

Yet at most shows the critique still travels by hand: a ring secretary writes longhand while the
judge dictates, the sheets are collected, deciphered, retyped, and mailed — weeks later, if at
all. A lost or illegible critique can cost a dog its breeding paperwork.

**Pull-stat row (three items):**
- **60+** critiques dictated by a judge on a typical show day
- **V or SG** — the judge-report ratings the ADRK Körordnung requires for a breed survey
- **Same day** — when Show Desk delivers the signed certificate instead

### 3.4 Definition block

**H2: What is Show Desk?**

Show Desk is a critique secretary for German-style breed shows. It replaces the handwritten
ring paperwork at Sieger shows, SE (Standard Evaluation) events, ZTP-style suitability tests,
and breed surveys. The judge dictates exactly as they always have; Show Desk captures the audio,
transcribes it live, and produces the official documents — critique certificates, SE forms,
award certificates, and placements — from one roster.

It is built ringside-first: recording works with no internet connection and syncs when coverage
returns, because show grounds lose Wi-Fi and the paperwork cannot.

### 3.5 How it works

**H2: How Show Desk works**

**Step 1 — Speak.**
The judge critiques the dog aloud, as at any Sieger show. Show Desk records at ringside and
transcribes the dictation live, dog by dog, keyed to the armband number. No connection? The
recording queues on the device and syncs later.

**Step 2 — Review.**
The show secretary sees each transcript as an editable draft — narrative, Formwert rating, and
placement — beside the dog's catalog entry. Approve it, and the draft becomes the official
critique. SE evaluations flow into the same queue, with the announced Formwert carried onto the
placement sheet automatically.

**Step 3 — Deliver.**
On release, Show Desk generates the signed critique certificate as a PDF and emails it to the
owner on file — the same document, the same day, for every dog in the catalog. Placements,
award certificates, and SE forms are ready to print or send from the same screen.

### 3.6 Feature grid

**H2: Everything a show secretary produces, from one roster**

**Ringside critique recording.**
Live speech-to-text while the judge dictates, with the full audio kept as backup. Every
recording is tied to an armband, a class, and a day.

**SE and breed survey forms.**
The complete Standard Evaluation on a tablet: measurements, bite, behavior, gun-sureness, and
final result, seeded from the catalog so nothing is typed twice.

**Formwert ratings and placements.**
Official rating codes — V, SG, G and the rest — with placements 1–4 kept in separate pools per
class, sex, and show day, the way the format requires.

**Official PDFs.**
Critique certificates, SE forms, award certificates, and judge-report drafts, generated from the
approved record and rendered for signature.

**Owner delivery.**
Approved critiques are emailed to the owner in the catalog automatically, with delivery status
tracked and retry built in.

**The catalog as the source of truth.**
Import the roster once from CSV — armband, dog, registration number, class, sex, owner, email —
and every document above draws from it.

### 3.7 Offline

**H2: Built for rings that lose Wi-Fi**

Show grounds are barns, fields, and fairground halls. Show Desk assumes the connection will
drop: recordings and SE drafts queue on the device, the queue is visible and recallable, and
everything syncs when coverage returns. The judge never waits on a signal bar.

### 3.8 Comparison

**H2: The paper trail, before and after**

| | Handwritten ring paperwork | Show Desk |
|---|---|---|
| Critique capture | Ring secretary writes longhand while the judge dictates | Live transcription of the judge's own words, audio retained |
| Legibility | Depends on handwriting and weather | Typed, reviewed, and signed |
| Owner receives critique | Weeks later by mail, or never | Emailed the same day |
| SE forms | Filled by hand from scratch | Seeded from the catalog, completed on a tablet |
| Placements | Reconciled on paper across class, sex, and day | Enforced pools — one rank per class, sex, and day |
| Körung documentation | Owner must keep and resubmit paper originals | A permanent record, reprintable on demand |
| Lost paperwork | Gone | Nothing to lose |

### 3.9 Who it serves

**H2: Who uses Show Desk?**

**Clubs and show organizers.** Run the whole event — catalog, critiques, SE, placements, awards,
owner delivery — without recruiting a team of volunteers who can decipher dictation in two
languages.

**Judges.** Dictate exactly as always. Every word is kept, transcribed, and turned into a
legible report that carries the judge's name well.

**Show secretaries.** Stop retyping. Review drafts instead of deciphering sheets, and finish the
show's paperwork before the show ends.

### 3.10 FAQ

**H2: Frequently asked questions**

**What is a Sieger show?**
A Sieger show is a German-style conformation show. Dogs are presented naturally rather than
hand-stacked, every dog is critiqued aloud by the judge, and each receives a written critique
and a rating (such as V or SG) plus a placement of 1–4 within its class. Titles such as Sieger
and Siegerin go to the top-rated adults.

**What is a Richterbericht?**
A Richterbericht is the judge's written report on a dog — the critique. It describes the dog's
conformation, movement, and temperament against the breed standard. Under ADRK rules, judge
reports with V or SG ratings are required documents when a dog is presented for a Körung
(breed survey).

**What does a rating like V1 mean?**
The letter is the rating and the number is the placement — they are separate. V (vorzüglich)
means the judge rated the dog Excellent against the standard; the 1 means it also placed first
in its class that day. Many dogs at one show can earn a V rating, but only four place.

**What is an SE (Standard Evaluation)?**
An SE is a structured evaluation of a single dog: measurements such as height, weight, and chest
depth; bite and dentition; temperament and gun-sureness; and a final pass or fail with a
Formwert rating. Show Desk captures the full SE form digitally, seeded from the show catalog.

**Does the judge have to change how they work?**
No. The judge dictates the critique aloud exactly as at any German-style show. Show Desk records
and transcribes at ringside; the review and paperwork happen at the secretary's desk. Judges
already dictate — historically into a ring secretary's notebook or a pocket recorder.

**Does it work without internet?**
Yes. Recording and SE capture work fully offline. Recordings queue on the device with the live
transcript attached and sync automatically when the connection returns. Show grounds lose Wi-Fi
routinely; the paperwork survives it.

**How do owners get their critiques?**
By email, the same day. When the secretary approves and releases a critique, Show Desk generates
the official certificate PDF and sends it to the owner's address from the show catalog, with
delivery tracked and a retry if an address bounces.

**Which formats does it support?**
Show Desk is built for German-style events: Sieger shows, SE evaluations, and breed-survey-style
paperwork, with ADRK-style classes, rating codes, and titles. Placements are kept in separate
pools per class, sex, and show day.

**Is critique data public?**
No. Critiques belong to the club and the owner. Nothing is published without the club's release
and the owner's consent; results pages are opt-in.

**How do we get started?**
Book a walkthrough and bring your last show's catalog. We'll run it end to end — import, ringside
recording, review, and delivery — so your committee sees the actual workflow before committing
to anything.

### 3.11 Final CTA

**H2: Run your next show on Show Desk**

Bring your catalog. We'll show you the whole weekend — from CSV import to the last certificate
in the last owner's inbox.

**CTA:** Book a show walkthrough
**Sub-line:** Judges and club officers: ask about the judge program.

### 3.12 Footer content-hub links

Link the decoder and operator pieces from `content-strategy.md` as they ship, with exact-match
anchors (these anchors are themselves retrieval targets):

- Every ADRK Formwert rating, explained
- How to read a Richterbericht, line by line
- From BH to Gekört: the ADRK breeding path in order
- The Sieger show secretary's playbook
- Which class does my dog enter? (calculator)

---

## 4. Technical spec

### 4.1 Rendering and routing

- Statically rendered (the page must not depend on client JS for its content — engines and
  scrapers read HTML). Next.js static rendering on the marketing route.
- `middleware.ts` currently protects `/` and redirects to `/login`; the marketing page requires
  either moving the desk off `/` or excluding the marketing route from the matcher.
- FAQ content rendered in the DOM even if visually collapsed — hidden-from-DOM accordions are
  invisible to retrieval.
- `sitemap.xml` and `robots.txt` via the App Router metadata routes.
- Optional but cheap: `llms.txt` at the root with the positioning line, the definition block,
  and links to the content hub — a directory for generative crawlers.

### 4.2 Structured data (JSON-LD)

Three blocks on the page:

**SoftwareApplication**

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Show Desk",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "Show secretary software for German-style breed shows. Records the judge's spoken critique ringside, transcribes it live, and delivers the official critique certificate to the owner's inbox the same day.",
  "audience": { "@type": "Audience", "audienceType": "Dog show clubs, show secretaries, conformation judges" },
  "featureList": [
    "Ringside critique recording with live transcription",
    "SE (Standard Evaluation) digital forms",
    "Formwert ratings and class placements",
    "Official critique certificate, SE, and award PDFs",
    "Same-day owner email delivery",
    "Offline-first recording with sync"
  ]
}
```

**FAQPage** — every Q&A from section 3.10, verbatim. This is the AEO workhorse.

**Organization** — name, logo, `sameAs` pointing at the Facebook Page from
`facebook-playbook.md`.

Add `HowTo` markup on the three-step section only if it renders as visible steps (it does).

### 4.3 Keyword and entity targets

| Priority | Target | Where it lives on the page |
|---|---|---|
| 1 | sieger show secretary software / dog show critique software | Title, H1 subhead, definition block |
| 2 | what is a sieger show | FAQ 1 |
| 3 | richterbericht / judge critique | Problem section, FAQ 2 |
| 4 | formwert / V1 rating meaning | FAQ 3, feature grid |
| 5 | SE evaluation / breed survey software | FAQ 4, feature grid |
| 6 | dog show software offline | Offline section, FAQ 6 |

The homepage answers each once, concisely, and links to the dedicated hub article for depth —
homepage for the definition, hub for the ranking.

### 4.4 Performance and hygiene

- Hero image as optimized `next/image` with explicit dimensions; no layout shift on the stat row.
- One page goal: LCP under 2 s on mid-range mobile — this audience is on phones at ringside.
- Descriptive alt text on every image using entity names ("handwritten Richterbericht beside the
  generated critique certificate"), which is retrieval surface, not decoration.
- Internal links use descriptive anchors, never "click here".

### 4.5 What to measure

- Impressions and click-through on the niche entity queries in Search Console (expect low volume,
  high CTR; CTR is the signal).
- Whether AI engines begin citing the page for "sieger show", "richterbericht", "formwert"
  queries — check monthly by asking the engines directly.
- Walkthrough bookings attributed to the page, which is the only conversion that matters.
