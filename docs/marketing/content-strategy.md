# Show Desk — Blog & Content Strategy

High-level content concepts for Show Desk (Sieger Show Secretary), based on research into
the ADRK/German-style show world, the existing competitive landscape, and where this
audience actually spends its time.

---

## 1. What we are actually selling

Show Desk is a critique secretary for German-style (ADRK/FCI) breed shows. The workflow it
replaces is a human ring secretary writing longhand while the judge dictates:

- Roster CSV import by armband, class, and sex
- Ringside voice capture with live speech-to-text, offline-queued so it survives a dead ring Wi-Fi
- Standard Evaluation (SE) form capture — measurements, bite, behavior, gun-sureness, Formwert
- A review queue that turns the dictation into an editable draft critique
- Official PDFs: TNRK critique certificate, SE form, ADRK Richterbericht draft, award certificate
- Placements 1–4 per day/class/sex pool
- Approve and email the certificate to the owner before they leave the grounds

The one-sentence value proposition: **the judge's spoken critique becomes a finished, official
certificate in the owner's inbox the same day, instead of a handwritten sheet that arrives weeks
later or never.**

## 2. Who the content is for

| Segment | Rough size (North America) | Why they click | What they convert to |
|---|---|---|---|
| Club / show secretaries | A few dozen active event secretaries across URKA, USRC, ARC, RCC/TNRK, plus GSD, Doberman, and Boxer equivalents | They are drowning in paperwork and have no playbook | The actual buyers |
| Judges | Very small, extremely well-networked | Professional pride, workflow curiosity | Kingmakers — a judge who likes the tool sells it to every club they visit |
| Breeders / kennels | Hundreds to low thousands | Ratings and critiques are marketing and breeding currency | Advocates who pressure clubs; future licensees |
| Newcomer exhibitors and owners | The bulk of search volume | Total confusion about German terminology | Traffic, shares, backlinks, email list |

## 3. Strategic reality check

Three things should shape the plan before we write a word.

**The buyer market is too small for SEO to be the acquisition channel.** URKA alone lists roughly
half a dozen Sieger shows a year; add USRC's local, regional, and national shows, ARK/Canadian
events, and the GSD, Doberman, and Boxer equivalents and you get a few dozen buying decisions per
year. No keyword volume will move that number. Blog content's job for the B2B sale is
**credibility on arrival** — when a secretary is referred by a judge or another club, the content
is what convinces them we understand a Körung and not just CRUD apps.

**The distribution channel is Facebook, not Google.** This community lives in breed groups
(Rottweiler World, Rottweiler Mania, club pages, regional klub groups) and at ringside. Content
has to be built to be screenshotted and shared into a group, which means visual, opinionated,
and self-contained — not 2,000-word SEO filler with the answer in paragraph nine.

**The compounding asset is not the blog, it is the archive.** Every show Show Desk runs generates
critiques, ratings, placements, and judge records. The UK Kennel Club already proved that
exhibitors search critiques by dog name, judge, and show for years afterward. A public, opt-in
critique and results archive turns each event we run into permanently indexable pages that
existing clubs publish today as scanned PDFs and JPEGs. That is both an SEO engine and a
competitive moat, and it should be treated as a product surface, not a marketing afterthought.

There is also a genuine content void to exploit. The best current English-language resources on
Formwert ratings, the Körung path, and reading a Richterbericht are 2010-era kennel pages,
forum posts, and untranslated German PDFs from adrk.de. A clean, accurate, well-designed
reference would take those searches with very little competition.

## 4. Content engine 1 — The decoder (top of funnel, highest volume)

The niche's terminology is genuinely opaque and nobody owns the explanation.

- **"V1, SG2, VV, Ggd: Every ADRK Formwert Rating Explained"** — and specifically that the number
  is placement, not part of the rating, which is the single most common misunderstanding in the
  breed. Build it as a filterable table plus a chart of which ratings gate which titles. We
  already have the canonical code list and English glosses in `lib/domain/adrk-template.ts`.
- **"Read Your Critique Like a Judge: A Line-by-Line Breakdown of a Richterbericht"** — take one
  anonymized certificate and annotate every phrase, including the polite-fault dictionary
  ("would like to see better reach and drive" = a fault, stated kindly). This is the single most
  screenshot-worthy thing we could publish.
- **"Title Soup: How to Read a Rottweiler's Full Show Name"** — parse something like
  `V1, KS, Anw.Dt.Ch.VDH, IGP3, Gekört` left to right. Newcomers hit this on every breeder site
  and there is no reference for it. Our `ADRK_TITLE_OPTIONS` list is the source material.
- **The German-to-English show glossary** — Zuchtschau, Körung, ZTP, Formwert, Richterbericht,
  Ahnentafel, Leistungsheft, Anwartschaft, Rüde/Hündin, Gekört. Evergreen, linkable, becomes the
  page everyone cites.
- **"Sieger Show vs. AKC Conformation: Same Dog, Two Different Sports"** — no hand-stacking,
  baited from outside the ring, every dog critiqued aloud, rating separate from placement. Strong
  crossover search intent from the AKC side.
- **"Which class does my dog enter?"** — an interactive date-of-birth to class calculator across
  Baby through Veteran. Tools earn links and repeat visits in a way articles do not, and the age
  bands are already encoded in `ADRK_CLASSES`.

## 5. Content engine 2 — The breeding credential path (highest commercial intent)

This is where confusion turns into money for readers, which makes it the most valuable
non-product content we can write.

- **"From BH to Gekört: The Complete ADRK Breeding Path, In Order"** — BH, then ZTP at 18 months
  with HD/ED, DNA, and JLPP, then the required show ratings, then IGP, then the Körung. Assembling
  this today requires reading the Zuchtordnung and Körordnung in German. Publishing it in clean
  English is an authority play with real backlink potential.
- **"Your Judge's Critique Is a Breeding Document, Not a Souvenir"** — the Körordnung requires
  submitting *die erforderlichen Richterberichte* with V or SG ratings. A lost, illegible, or
  never-delivered critique can block a Körung. This is the strongest possible bridge from
  education straight to the product, and it is true rather than manufactured.
- **"What the SE Actually Measures On Your Dog, and Why"** — walk the real form: height, chest
  depth and circumference, body length, muzzle length, skull, eye color, tattoo legibility, bite,
  gun-sureness, behavior. We have the exact field set in `lib/domain/tnrk-se-form.ts`, so we can
  be more precise than anyone else writing about it.
- **"JLPP, HD, ED, and the Health Testing Alphabet"** — high general search volume in the breed,
  and these are fields we already collect.
- **"ADRK Is Going Digital"** — the 2026 Beiratshauptsitzung motions move Körung submissions to
  digital, explicitly justified as *Maßnahme zur Digitalisierung*. A news hook that makes our
  entire thesis look inevitable rather than pushy.

## 6. Content engine 3 — The operator playbook (small audience, near-total intent)

Low traffic, but nearly every reader is a buyer. This is the content that closes.

- **"How to Run a Sieger Show: The Complete Secretary's Playbook"** — the pillar piece nobody has
  written. Sanctioning through results, every role, every document, every deadline.
- **"Every Piece of Paper a Sieger Show Has to Produce"** — catalog, Richterbericht, SE/ZTP forms,
  award certificates, results, owner delivery. Show Desk happens to produce exactly this set.
- **"Your Roster CSV, Done Right"** — a downloadable template using our real headers
  (`armband,dog_name,zb_number,wt,owner,sex,class_id,email` plus the optional pedigree columns),
  with the sex-alias and class-validation rules explained. Utility content earns email addresses.
- **"The Ring Always Loses Wi-Fi"** — field notes on why show venues have no connectivity and what
  it costs when your paperwork tool assumes otherwise. Our offline queue and PWA are the answer.
  This is the specific, credible post that makes a skeptical secretary trust us.
- **"We Timed Every Step of Critique Paperwork at a Real Show"** — original research: minutes per
  dog from dictation to certificate, by hand versus with Show Desk. Original data is the most
  linkable format available in a niche that has none.
- **"Judges Already Dictate — Into Tape Recorders"** — published judging guides openly describe
  recording critiques on handheld recorders and transcribing them later. We are not asking judges
  to change their habits; we are removing the transcription step. Reframes the product as
  evolution rather than disruption.

## 7. Content engine 4 — Programmatic and data (the compounding asset)

Product surfaces that behave like content. This is where the durable traffic is.

- **A public critique and results archive**, opt-in per owner: one page per show, per class, per
  dog. Exhibitors search their own dogs' names for years. Existing clubs publish this as scanned
  images, which is unsearchable.
- **Judge pages** — every show a judge officiated, their rating distribution, their characteristic
  phrasing. Exhibitors research judges obsessively before entering, so this would likely be the
  most-visited thing we ever ship. Keep it strictly descriptive; never imply bias.
- **A German-style show calendar for North America**, aggregated across URKA, USRC, ARC, RCC/TNRK
  and the GSD, Doberman, and Boxer clubs. Nobody aggregates this today; it is scattered across
  club sites. Recurring annual search demand, and it puts us in front of every organizer.
- **Kennel and dog profile pages** assembled from accumulated critiques. Breeders will link to
  these themselves, which is free authority.

## 8. Content engine 5 — Social and community (where the clicks actually are)

Built for sharing into breed groups rather than for ranking.

- Critique teardowns and "name that fault" photo quizzes
- Show recaps with photos, published same-day because we already hold the results
- Judge quote roundups from the season's critiques
- **"What 500 Critiques Say About the Breed Right Now"** — once we have volume, aggregate the
  language across critiques to report real trends in pigment, pastern strength, bite faults, and
  temperament. Judges already make these observations anecdotally; nobody has ever had the data.
  Breed magazines would reprint this.

## 9. Where to start

First wave, in order, chosen for maximum authority per unit of effort:

1. The Formwert rating explainer (highest-volume confusion, weakest competition)
2. The Richterbericht line-by-line teardown (most shareable, best product bridge)
3. "Your critique is a breeding document" (converts education into urgency)
4. The Sieger show secretary's playbook (the piece that closes club deals)
5. The glossary and the class calculator (evergreen infrastructure everything else links to)

Then ship the archive, because from that point every show we run adds indexable pages on its own.

## 10. The expansion that matters

The largest lever is not more Rottweiler content — it is writing the German-style critique
material breed-agnostically. USCA and GSDCA-WDA run substantially larger Sieger shows than any
Rottweiler club, and Doberman and Boxer clubs run the same format. The same articles about how
critique shows work, what ratings mean, and how breed surveys gate breeding reach several times
the audience with no additional research.

Further out: every FCI show on earth uses a ring secretary transcribing a dictated critique. The
transcription problem is universal even though our forms are ADRK-specific.

## 11. What we need to build first

The app currently has no public surface. `middleware.ts` protects `/`, `/admin`, and `/ringside`,
and `/` renders the logged-in desk, so there is nowhere for a blog to live today. Before any of
the above ships we need a public marketing route group with a static, indexable blog (MDX is
sufficient), a sitemap, Open Graph images tuned for Facebook shares since that is the real
distribution channel, and an email capture tied to the downloadable templates.

## 12. How to measure it

Given the market size, ranking reports are close to meaningless here. Track instead:

- Referral traffic from Facebook groups, and how often posts get shared into them unprompted
- Template downloads and email signups from the operator content
- Inbound club and judge conversations that cite a specific article
- Archive page views per show run, which is the compounding metric that matters most
- Backlinks from club and kennel sites, which is how authority is actually earned in this niche
