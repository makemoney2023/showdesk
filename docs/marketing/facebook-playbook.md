# Show Desk — Facebook Playbook

How to win the channel where this community actually lives. Companion to
`content-strategy.md`, which established that Facebook breed groups — not Google — are the real
distribution channel for German-style show content.

---

## 1. The strategy in one sentence

**Become the results wire for German-style shows, and let the clubs distribute for us.**

Not "post blog links in breed groups." That approach is wrong here for two reasons: nearly every
breed group bans self-promotion outright, and this community is small enough that everyone knows
everyone. One person perceived as spamming a group of 500 breeders does reputational damage that
outlasts any traffic it earns. We have something far better than links.

## 2. Why this works: the ShowScene precedent

In the AKC world, **ShowScene** and **The Canine Chronicle** built large, genuinely engaged
Facebook followings doing one thing: posting results fast, in a consistent format, with photos.
Clubs post links to real-time results from services like Onofrio, and the aggregators built
audiences on top of that data.

Two things make this a bigger opportunity for us than it was for them.

**Nobody does it in the German-style world.** Sieger show results surface days or weeks later as
scanned PDFs and JPEGs on club websites — URKA's results page is literally a list of image links.
Meanwhile exhibitors sit at the show refreshing Facebook, and breeders who could not travel refresh
from home.

**We sit at the source.** ShowScene aggregates data someone else published. Show Desk *creates*
the data at the moment the judge speaks it. At the instant a class closes we already hold the
armband, dog name, kennel, class, sex, judge, rating, placement, and in many cases the dog's photo.
Nobody can be faster than the system the results are entered into.

## 3. The core asset: results cards

Auto-generate a branded image per class the moment placements are saved:

```
YOUTH CLASS I — MALE
Judge: [name]
V1  [dog]  —  [kennel]
V2  [dog]  —  [kennel]
SG3 [dog]  —  [kennel]
SG4 [dog]  —  [kennel]
```

Post within minutes of the class closing. Then the weekend's money post: the Sieger and Siegerin
announcement graphic.

And the one that sells the product without mentioning it:

> Every dog judged today has its critique certificate already in its owner's inbox.

That single sentence does more selling than any article, because exhibitors will take it to their
own club and ask why they are still waiting six weeks for a handwritten sheet.

**Build item.** This is a product feature, not a design task. We already generate PDFs with
`pdf-lib`; a card generator can reuse the same record shapes that feed
`lib/pdf/tnrk-critique-from-records.ts`, or use Next's `ImageResponse` for social-optimized PNGs.
Sized for feed (1080×1350) and story/Reel (1080×1920).

## 4. The distribution unlock: let the clubs post them

This is the most important idea in this document.

We will never out-reach a club page organically. But every club has the same problem: an audience
that wants content and no capacity to produce it. So we manufacture their content for free.

Give each club its results cards **branded as the club's own**, with a small "Results by Show Desk"
credit line. The club posts them because they want them. We reach audiences we could never earn,
carried by the one voice in this niche that has more credibility than ours, and the credit line
does the marketing. Every club we run a show for becomes a distribution channel that keeps working
after the weekend ends.

This also solves the promotion problem cleanly. We are not promoting inside groups; the club is
posting its own results, and we are the reason they arrived same-day.

## 5. Who posts what

| Surface | Role | Reality |
|---|---|---|
| Show Desk Page | Home base and canonical archive of results posts; required for ads | Organic Page reach is poor — do not expect it to carry the strategy |
| Club Pages | The primary distribution channel, via section 4 | Borrowed credibility, real reach |
| Breed groups | Where the audience is, but broadcasting is banned | Participation by individual humans only, never the brand |
| Personal profiles | The heaviest lever | In dog sport, trust is personal — a post from a known breeder or club officer outperforms a brand page by an order of magnitude |
| Judges' profiles | The kingmaker | See section 7 |

Do **not** start a competing breed group. The groups that matter already exist and have years of
accumulated membership. Being a good guest beats being a lonely host.

Where individuals do participate in groups, the standard rules apply and are worth respecting
rather than gaming: read the pinned rules, keep links out of the post body, contribute far more
often than you promote, and never cold-DM members.

## 6. Formats that actually travel

Ordered by leverage, not by effort.

- **Photo albums with exhibitors tagged.** The single best organic reach mechanism Facebook still
  offers. A tag pushes the album into that person's feed and their friends' feeds. Fifty tagged
  exhibitors is fifty distribution nodes we did not pay for.
- **Results cards.** Section 3.
- **Reels of movement and gaiting.** Short video massively over-indexes on reach, and the gaiting
  portion of a Sieger show is inherently watchable — dogs running as a group is unusual footage to
  anyone outside the format.
- **The paperwork before-and-after.** A photo of a handwritten critique sheet beside the generated
  certificate. No copy required. This is the most persuasive image we can produce.
- **Critique teardown carousels.** The Richterbericht line-by-line piece from the content strategy,
  rebuilt as native swipeable images with no link. Screenshot-friendly by construction.
- **"Name that fault" quiz posts.** Comment bait in the good sense — comments drive reach harder
  than reactions, and this audience genuinely enjoys arguing about structure.
- **Judge quotes from the weekend.** Short, attributed, flattering. Judges share these.

## 7. The judge play

Judges are the kingmakers. They travel between clubs, they are trusted implicitly, and they talk to
every organizer. A judge posting *"I dictated sixty critiques this weekend and every owner had a
signed certificate before dinner"* is worth more than a year of our own content.

So: comp the tool entirely for judges, make the tool make them look good — legible, thorough,
fast — and make it trivially easy for them to post about it. Send them the shareable assets
unprompted after the show. Never ask for the post; earn it.

## 8. The show-weekend rhythm

Content should follow the event, because that is when attention peaks.

- **Before** — entries closing, judge announcements, the catalog, "who's coming" posts
- **During** — results cards per class, photo albums, gaiting Reels, the Sieger/Siegerin graphic
- **After** — recap album, the certificates-delivered post, the critique teardown using (consented)
  material from the weekend, and the season-standings angle once we have multiple shows

The archive from `content-strategy.md` compounds with this: every Facebook post can point at a
permanent results page, which is where the SEO value accrues.

## 9. Paid: small budget, surgical targeting

The audience is tiny, which is normally a problem and here is an advantage — reaching all of it
costs very little.

- **Geo-fence the showgrounds on show weekends.** Radius targeting on the venue reaches literally
  the exhibitors and spectators present, for pennies. This is the sharpest paid play available and
  almost nobody in dog sport uses it.
- **Custom audiences from exhibitor emails** we already collect, with consent.
- **Interest and engagement targeting** on the breed plus club page engagement. Skip lookalikes;
  the seed audiences are too small to model usefully.
- **Retarget blog readers** with the operator playbook content — that is the sequence that turns a
  curious breeder into a club officer who books a call.

## 10. Consent and guardrails

These are not legal boilerplate; getting any of them wrong ends the strategy.

- **Critiques require owner opt-in.** A critique can be unflattering, and publishing a poor rating
  without permission would be a serious breach of trust in a community this tight. **Build item:**
  the roster CSV and entry form need a consent field; today the headers are
  `armband,dog_name,zb_number,wt,owner,sex,class_id,email` with no consent column.
- **Never post results before the club and judge have announced them.** Scooping an official
  announcement is the fastest way to lose every club relationship at once. Results cards need a
  club-approval gate before anything publishes.
- **Judge statistics stay descriptive.** Report what happened; never frame it as bias.
- **Avoid anything resembling puppy sales.** Facebook's animal commerce policies are enforced
  aggressively and a violation can take an account down.

## 11. What to measure

Follower counts are vanity at this scale. Track:

- **How many club pages reposted our cards** — the single best indicator the strategy is working
- Tags per photo album, and reach attributable to tagging
- Shares and comments per format, so we learn which of section 6 actually travels
- Inbound club and judge conversations that reference a specific post
- Archive page views driven from Facebook, which is where the durable value lands

## 12. What to build to make this possible

In priority order:

1. **Results card generator** — branded per club, feed and story sizes, produced from existing records
2. **Club approval gate** — nothing publishes before the club releases it
3. **Owner consent field** — on roster import and the entry form, gating any public use
4. **Public results and critique archive pages** — the link destination every post needs
5. **Open Graph images** tuned for Facebook link previews on those pages
