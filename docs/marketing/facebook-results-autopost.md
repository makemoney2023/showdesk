# Auto-posting Sieger results to Facebook

Companion to `facebook-playbook.md` and the public `/results` archive.

**Recommended group name:** Global Sieger Show Results

---

## 1. What we can and cannot automate

Meta removed the Facebook Groups API on 22 April 2024 (`publish_to_groups` and
`groups_access_member_info` are gone on every Graph API version). Third-party apps
cannot post into a member group via an access token anymore.

What still works:

| Channel | Automatable? | How |
|---|---|---|
| Facebook **Page** (e.g. Show Desk Results) | Yes | Graph API `POST /{page-id}/feed` with a Page token |
| Facebook **Group** (Global Sieger Show Results) | No (API) | Human posts, or share-dialog + copy-ready text |
| Share dialog / WhatsApp / X | Yes (user-initiated) | Buttons on every public results page |
| Native share sheet on phones | Yes (user-initiated) | Web Share API |

So the working system is a **Page that auto-posts + a Group that the community
lives in**, with the public `/results` URL as the canonical object both point at.

## 2. Stand up the surfaces (one-time)

1. Create a Facebook **Page** named **Show Desk Results** (or the club's name for
   a single-club rollout). This is the only surface Graph API can write to.
2. Create a Facebook **Group** named **Global Sieger Show Results**.
   - Privacy: Public (so exhibitors who are not members can still find it)
   - Description: "Official, same-day Sieger / German-style show results — ratings,
     placements, and critiques. Posted from Show Desk."
   - Rules: results only; no puppy ads; no arguing the judge
   - Add the Page as a group admin if Facebook still offers Page-as-admin, so the
     Page's posts can be shared into the group from Business Suite
3. Put the group URL in `NEXT_PUBLIC_FACEBOOK_GROUP_URL` so every results page
   shows a **Post to group** button that opens the group composer.

## 3. Page auto-post (implemented)

Env (server only — never `NEXT_PUBLIC_`):

```
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=
```

Token setup:

1. Create a Meta app in [developers.facebook.com](https://developers.facebook.com)
2. Add the Facebook Login product and request `pages_manage_posts` +
   `pages_read_engagement`
3. Generate a Page access token for Show Desk Results
4. Exchange it for a long-lived token and store it on Vercel

On **Settings → Public results → Publish & post to Facebook Page**, Show Desk:

1. Sets `shows.results_published_at` (the club approval gate)
2. Builds the same copy-ready post as the share button
3. `POST https://graph.facebook.com/v21.0/{page-id}/feed` with `message` + `link`

The post looks like:

```
TNRK / RCC National Sieger Show — official Sieger show results
Sep 4, 2026 · Rolling Gait Canine Center

Youth Class I — Male
V1  Rex vom Blacksage
Sg2  Axel vom Nordwald

Open Class — Female
V1  Bella von Ostsee

Full results and critiques: https://…/results/…

Results by Show Desk
```

Weekend money post (manual or a later cron): the Sieger / Siegerin graphic, then
the line *every dog judged today has its critique certificate already in its
owner's inbox.*

## 4. Getting that post into the Group

Because the Groups API is gone, pick one of these — in order of reliability:

1. **Business Suite / Meta native scheduler** — from the Page, share the
   auto-posted result into Global Sieger Show Results. One extra tap, still
   official, still fast.
2. **Copy post** on the public results page — secretary (or any exhibitor) opens
   the group and pastes. The share buttons already generate the exact text.
3. **Share dialog** — Facebook sharer opens with the OG card (dog name + V1)
   pre-filled. Best for exhibitors sharing their own dog.
4. **Do not** scrape facebook.com or drive a headless browser as a "bot account."
   That violates Meta's terms and will get the Page banned.

There is no supported cron that writes directly to the group. Anyone selling
"auto post to 50 groups" in 2026 is using a browser extension in a logged-in
session, not the Graph API.

## 5. Show-weekend rhythm

- Class closes → secretary saves placements → **do not post yet**
- Last class of the session → secretary hits **Publish results**
- Page auto-posts the full card
- Secretary (or a volunteer admin) shares that Page post into
  **Global Sieger Show Results**
- Exhibitors use **Share results** on their dog page; tags do the rest

Never post before the club has published. Scooping an official announcement
burns the only relationships that matter in this niche.

## 6. Guardrails (unchanged from the playbook)

- Only **approved** critiques and saved placements appear
- Emails, addresses, audio, and photos stay private
- Unpublish takes the pages off the sitemap and returns 404
- Judge stats stay descriptive; never frame them as bias
- No puppy-sales language on the Page or in the Group — Facebook's animal
  commerce policies will take the account down
