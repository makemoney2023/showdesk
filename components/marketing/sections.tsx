"use client";

import Link from "next/link";
import {
  AudioLines,
  ClipboardCheck,
  FileText,
  ListOrdered,
  Mail,
  Table2,
  WifiOff,
} from "lucide-react";
import { Reveal, TiltCard } from "./motion-primitives";

export function MarketingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[#070707]/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] text-lg font-semibold tracking-tight text-[#f7f4ed]"
        >
          Show Desk
          <span className="ml-2 align-middle text-[10px] font-bold tracking-[0.2em] text-[#c4a35a] uppercase">
            Sieger
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/results"
            className="hidden text-sm text-[#f7f4ed]/60 transition-colors hover:text-[#f7f4ed] sm:block"
          >
            Results
          </Link>
          <Link
            href="/#demo"
            className="hidden text-sm text-[#f7f4ed]/60 transition-colors hover:text-[#f7f4ed] sm:block"
          >
            Demo
          </Link>
          <Link
            href="/#how-it-works"
            className="hidden text-sm text-[#f7f4ed]/60 transition-colors hover:text-[#f7f4ed] sm:block"
          >
            How it works
          </Link>
          <Link
            href="/#faq"
            className="hidden text-sm text-[#f7f4ed]/60 transition-colors hover:text-[#f7f4ed] sm:block"
          >
            FAQ
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[#c4a35a]/50 px-5 py-2 text-sm font-semibold text-[#d4b87a] transition-colors hover:bg-[#c4a35a] hover:text-[#141210]"
          >
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function ProblemSection() {
  return (
    <section aria-label="The problem" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal>
        <h2 className="max-w-3xl font-[family-name:var(--font-fraunces)] text-3xl leading-tight font-semibold text-[#f7f4ed] sm:text-4xl">
          The critique is the whole point of the show —{" "}
          <span className="text-[#c4a35a]">
            and it&rsquo;s the last thing owners get
          </span>
        </h2>
      </Reveal>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <Reveal delay={0.1}>
          <p className="text-base leading-relaxed text-[#f7f4ed]/65">
            At a German-style show, every dog is critiqued aloud by the judge
            and the critique is recorded in writing for the exhibitor. That
            written critique is not a souvenir: under ADRK rules, judge reports
            rated V or SG are required documents for a Körung — the breed
            survey that approves a dog for breeding.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="text-base leading-relaxed text-[#f7f4ed]/65">
            Yet at most shows the critique still travels by hand: a ring
            secretary writes longhand while the judge dictates, the sheets are
            collected, deciphered, retyped, and mailed — weeks later, if at
            all. A lost or illegible critique can cost a dog its breeding
            paperwork.
          </p>
        </Reveal>
      </div>
      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          {
            stat: "60+",
            label: "critiques dictated by a judge on a typical show day",
          },
          {
            stat: "V / SG",
            label:
              "the judge-report ratings the ADRK Körordnung requires for a breed survey",
          },
          {
            stat: "Same day",
            label: "when Show Desk delivers the signed certificate instead",
          },
        ].map((item, i) => (
          <Reveal key={item.stat} delay={i * 0.12}>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-7">
              <p className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#c4a35a]">
                {item.stat}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#f7f4ed]/55">
                {item.label}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function DefinitionSection() {
  return (
    <section aria-label="What is Show Desk" className="relative py-24 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(196,163,90,0.07),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed] sm:text-4xl">
            What is Show Desk?
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-7 text-lg leading-relaxed text-[#f7f4ed]/75">
            Show Desk is a critique secretary for German-style breed shows. It
            replaces the handwritten ring paperwork at Sieger shows, SE
            (Standard Evaluation) events, ZTP-style suitability tests, and
            breed surveys. The judge dictates exactly as they always have; Show
            Desk captures the audio, transcribes it live, and produces the
            official documents — critique certificates, SE forms, award
            certificates, and placements — from one roster.
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <p className="mt-5 text-base leading-relaxed text-[#f7f4ed]/50">
            It is built ringside-first: recording works with no internet
            connection and syncs when coverage returns, because show grounds
            lose Wi-Fi and the paperwork cannot.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: AudioLines,
    title: "Ringside critique recording",
    body: "Live speech-to-text while the judge dictates, with the full audio kept as backup. Every recording is tied to an armband, a class, and a day.",
  },
  {
    icon: ClipboardCheck,
    title: "SE and breed survey forms",
    body: "The complete Standard Evaluation on a tablet: measurements, bite, behavior, gun-sureness, and final result, seeded from the catalog so nothing is typed twice.",
  },
  {
    icon: ListOrdered,
    title: "Formwert ratings and placements",
    body: "Official rating codes — V, SG, G and the rest — with placements 1–4 kept in separate pools per class, sex, and show day, the way the format requires.",
  },
  {
    icon: FileText,
    title: "Official PDFs",
    body: "Critique certificates, SE forms, award certificates, and judge-report drafts, generated from the approved record and rendered for signature.",
  },
  {
    icon: Mail,
    title: "Owner delivery",
    body: "Approved critiques are emailed to the owner in the catalog automatically, with delivery status tracked and retry built in.",
  },
  {
    icon: Table2,
    title: "The catalog as the source of truth",
    body: "Import the roster once from CSV — armband, dog, registration number, class, sex, owner, email — and every document above draws from it.",
  },
];

export function FeatureGrid() {
  return (
    <section aria-label="Features" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <Reveal>
        <h2 className="max-w-2xl font-[family-name:var(--font-fraunces)] text-3xl leading-tight font-semibold text-[#f7f4ed] sm:text-4xl">
          Everything a show secretary produces,{" "}
          <span className="text-[#c4a35a]">from one roster</span>
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={(i % 3) * 0.1}>
            <TiltCard className="h-full rounded-2xl border border-white/8 bg-white/[0.03] p-7 transition-colors duration-300 hover:border-[#c4a35a]/30">
              <feature.icon
                aria-hidden
                className="h-6 w-6 text-[#c4a35a]"
                strokeWidth={1.6}
              />
              <h3 className="mt-5 font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#f7f4ed]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#f7f4ed]/55">
                {feature.body}
              </p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function OfflineSection() {
  return (
    <section aria-label="Offline capability" className="mx-auto max-w-6xl px-6 pb-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-white/[0.05] to-transparent p-10 sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(196,163,90,0.12),transparent_65%)]"
          />
          <WifiOff aria-hidden className="h-7 w-7 text-[#c4a35a]" strokeWidth={1.6} />
          <h2 className="mt-5 max-w-xl font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed]">
            Built for rings that lose Wi-Fi
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#f7f4ed]/60">
            Show grounds are barns, fields, and fairground halls. Show Desk
            assumes the connection will drop: recordings and SE drafts queue on
            the device, the queue is visible and recallable, and everything
            syncs when coverage returns. The judge never waits on a signal bar.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

const COMPARISON: [string, string, string][] = [
  [
    "Critique capture",
    "Ring secretary writes longhand while the judge dictates",
    "Live transcription of the judge's own words, audio retained",
  ],
  ["Legibility", "Depends on handwriting and weather", "Typed, reviewed, and signed"],
  [
    "Owner receives critique",
    "Weeks later by mail, or never",
    "Emailed the same day",
  ],
  [
    "SE forms",
    "Filled by hand from scratch",
    "Seeded from the catalog, completed on a tablet",
  ],
  [
    "Placements",
    "Reconciled on paper across class, sex, and day",
    "Enforced pools — one rank per class, sex, and day",
  ],
  [
    "Körung documentation",
    "Owner must keep and resubmit paper originals",
    "A permanent record, reprintable on demand",
  ],
  ["Lost paperwork", "Gone", "Nothing to lose"],
];

export function ComparisonSection() {
  return (
    <section aria-label="Comparison" className="mx-auto max-w-5xl px-6 py-24">
      <Reveal>
        <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed] sm:text-4xl">
          The paper trail, before and after
        </h2>
      </Reveal>
      <Reveal delay={0.15}>
        <div className="mt-12 overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th scope="col" className="px-5 py-4 font-semibold text-[#f7f4ed]/45">
                  &nbsp;
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-[#f7f4ed]/60">
                  Handwritten ring paperwork
                </th>
                <th scope="col" className="px-5 py-4 font-semibold text-[#c4a35a]">
                  Show Desk
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([label, paper, desk]) => (
                <tr key={label} className="border-b border-white/5 last:border-0">
                  <th
                    scope="row"
                    className="px-5 py-4 align-top font-semibold whitespace-nowrap text-[#f7f4ed]"
                  >
                    {label}
                  </th>
                  <td className="px-5 py-4 align-top leading-relaxed text-[#f7f4ed]/45">
                    {paper}
                  </td>
                  <td className="px-5 py-4 align-top leading-relaxed text-[#f7f4ed]/80">
                    {desk}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </section>
  );
}

const AUDIENCES = [
  {
    title: "Clubs and show organizers",
    body: "Run the whole event — catalog, critiques, SE, placements, awards, owner delivery — without recruiting a team of volunteers who can decipher dictation in two languages.",
  },
  {
    title: "Judges",
    body: "Dictate exactly as always. Every word is kept, transcribed, and turned into a legible report that carries the judge's name well.",
  },
  {
    title: "Show secretaries",
    body: "Stop retyping. Review drafts instead of deciphering sheets, and finish the show's paperwork before the show ends.",
  },
];

export function AudienceSection() {
  return (
    <section aria-label="Who uses Show Desk" className="mx-auto max-w-6xl px-6 pb-24">
      <Reveal>
        <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed] sm:text-4xl">
          Who uses Show Desk?
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {AUDIENCES.map((audience, i) => (
          <Reveal key={audience.title} delay={i * 0.12}>
            <div className="h-full rounded-2xl border-l-2 border-[#c4a35a]/60 bg-white/[0.02] p-7">
              <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#f7f4ed]">
                {audience.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#f7f4ed]/55">
                {audience.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-label="Get started" className="relative overflow-hidden px-6 py-28 sm:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_50%_100%,rgba(196,163,90,0.14),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-fraunces)] text-4xl leading-tight font-semibold text-[#f7f4ed] sm:text-5xl">
            Run your next show on Show Desk
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-6 text-lg leading-relaxed text-[#f7f4ed]/60">
            Bring your catalog. Run the whole weekend — from CSV import to the
            last certificate in the last owner&rsquo;s inbox.
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <div className="mt-10">
            <Link
              href="/login"
              className="group relative inline-block rounded-full bg-[#c4a35a] px-10 py-4 text-base font-bold text-[#141210] transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98]"
            >
              Try the live demo
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-full bg-[#c4a35a] opacity-50 blur-2xl transition-opacity group-hover:opacity-80"
              />
            </Link>
            <p className="mt-5 text-sm text-[#f7f4ed]/40">
              Judges and club officers: ask about the judge program.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/8 px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div>
          <p className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#f7f4ed]">
            Show Desk
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#f7f4ed]/40">
            Show secretary software for German-style breed shows — Sieger
            shows, SE evaluations, and breed surveys. The judge&rsquo;s spoken
            critique becomes the official certificate, delivered the same day.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-[#f7f4ed]/50">
          <Link href="/results" className="transition-colors hover:text-[#f7f4ed]">
            Results
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-[#f7f4ed]">
            How it works
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-[#f7f4ed]">
            FAQ
          </Link>
          <Link href="/login" className="transition-colors hover:text-[#f7f4ed]">
            Sign in
          </Link>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-[#f7f4ed]/25">
        © {new Date().getFullYear()} Show Desk. Formwert codes and title
        abbreviations follow the official forms.
      </p>
    </footer>
  );
}
