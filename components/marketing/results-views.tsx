import Link from "next/link";
import { ShareButtons } from "./share-buttons";
import type {
  PublicDogResult,
  PublicShowResults,
  PublicShowSummary,
} from "@/lib/domain/public-results";

export function ResultsIndexView({ shows }: { shows: PublicShowSummary[] }) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <p className="text-xs font-semibold tracking-[0.2em] text-[#c4a35a] uppercase">
        Official archive
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#f7f4ed] sm:text-5xl">
        Sieger show results
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#f7f4ed]/65">
        Official German-style (Sieger) show results from clubs using Show Desk.
        Each listing includes Formwert ratings, class placements 1–4, and the
        judge&rsquo;s written critique (Richterbericht). The letter is the
        rating; the number is the placement — they are separate.
      </p>
      {shows.length === 0 ? (
        <p className="mt-12 text-sm text-[#f7f4ed]/50">
          No published show results yet. Clubs release results from Show Desk
          Settings after the last class.
        </p>
      ) : (
        <ul className="mt-12 space-y-4">
          {shows.map((show) => (
            <li key={show.id}>
              <Link
                href={show.href}
                className="block rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors hover:border-[#c4a35a]/40"
              >
                <p className="text-xs tracking-wide text-[#c4a35a]">
                  {show.displayDate}
                  {show.venue ? ` · ${show.venue}` : ""}
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#f7f4ed]">
                  {show.name}
                </h2>
                <p className="mt-2 text-sm text-[#f7f4ed]/50">
                  {show.dogCount} judged · {show.placedCount} placed
                  {show.judges.length ? ` · ${show.judges.join(", ")}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export function ShowResultsView({
  show,
  pageUrl,
  shareText,
  groupUrl,
}: {
  show: PublicShowResults;
  pageUrl: string;
  shareText: string;
  groupUrl?: string | null;
}) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <nav className="text-sm text-[#f7f4ed]/45">
        <Link href="/results" className="hover:text-[#c4a35a]">
          Results
        </Link>
        <span aria-hidden> / </span>
        <span className="text-[#f7f4ed]/70">{show.name}</span>
      </nav>
      <h1 className="mt-5 font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#f7f4ed] sm:text-5xl">
        {show.name} results
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#f7f4ed]/65">
        {show.definition}
      </p>
      <p className="mt-3 text-sm text-[#f7f4ed]/45">
        {show.displayDate}
        {show.venue ? ` · ${show.venue}` : ""}
        {show.judges.length ? ` · Judge${show.judges.length > 1 ? "s" : ""} ${show.judges.join(", ")}` : ""}
      </p>
      <div className="mt-8">
        <ShareButtons
          url={pageUrl}
          title={`${show.name} results`}
          text={shareText}
          groupUrl={groupUrl}
        />
      </div>

      <div className="mt-14 space-y-12">
        {show.divisions.map((division) => (
          <section key={division.key} aria-labelledby={`div-${division.key}`}>
            <h2
              id={`div-${division.key}`}
              className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#f7f4ed]"
            >
              {division.classLabel} — {division.sexLabel}
            </h2>
            <ol className="mt-4 divide-y divide-white/8 rounded-2xl border border-white/8">
              {division.dogs.map((dog) => (
                <li key={dog.slug}>
                  <Link
                    href={dog.href}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      {dog.photoHref ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dog.photoHref}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-semibold text-[#f7f4ed]">
                          <span className="mr-2 text-[#f7f4ed]/40">
                            #{dog.armband}
                          </span>
                          {dog.dogName}
                        </p>
                        <p className="mt-0.5 text-sm text-[#f7f4ed]/45">
                          {dog.judge ? `Judge ${dog.judge}` : dog.classLabel}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#c4a35a] px-3 py-1 font-[family-name:var(--font-fraunces)] text-sm font-bold text-[#141210]">
                      {dog.ratingPlacement ?? "Result"}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section className="mt-16 border-t border-white/8 pt-10">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-[#f7f4ed]">
          How to read these results
        </h2>
        <dl className="mt-6 space-y-5 text-sm leading-relaxed">
          <div>
            <dt className="font-semibold text-[#f7f4ed]">What does V1 mean?</dt>
            <dd className="mt-1 text-[#f7f4ed]/60">
              The letter is the Formwert rating and the number is the class
              placement — they are separate. V (vorzüglich) means Excellent; 1
              means the dog also placed first. Many dogs can earn a V; only
              four place.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-[#f7f4ed]">
              What is a Richterbericht?
            </dt>
            <dd className="mt-1 text-[#f7f4ed]/60">
              The judge&rsquo;s written critique of the dog. Under ADRK rules,
              critiques rated V or SG are required documents for a Körung
              (breed survey).
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export function DogResultView({
  show,
  dog,
  pageUrl,
  shareText,
  groupUrl,
}: {
  show: PublicShowResults;
  dog: PublicDogResult;
  pageUrl: string;
  shareText: string;
  groupUrl?: string | null;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <nav className="text-sm text-[#f7f4ed]/45">
        <Link href="/results" className="hover:text-[#c4a35a]">
          Results
        </Link>
        <span aria-hidden> / </span>
        <Link href={show.href} className="hover:text-[#c4a35a]">
          {show.name}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-[#f7f4ed]/70">{dog.dogName}</span>
      </nav>

      {dog.photoHref ? (
        <figure className="relative mt-6 overflow-hidden rounded-3xl border border-white/8 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dog.photoHref}
            alt={dog.dogName}
            className="aspect-[16/10] w-full object-cover object-[center_28%]"
          />
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-5 pt-20 sm:px-7 sm:pb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-[#c4a35a] uppercase">
                #{dog.armband} · {dog.classLabel} — {dog.sexLabel}
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed] sm:text-5xl">
                {dog.dogName}
              </h1>
            </div>
            <span className="shrink-0 rounded-full bg-[#c4a35a] px-4 py-2 font-[family-name:var(--font-fraunces)] text-xl font-bold text-[#141210]">
              {dog.ratingPlacement ?? dog.formwert ?? "Result"}
            </span>
          </figcaption>
        </figure>
      ) : (
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#c4a35a] uppercase">
              #{dog.armband} · {dog.classLabel} — {dog.sexLabel}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl font-semibold text-[#f7f4ed] sm:text-5xl">
              {dog.dogName}
            </h1>
          </div>
          <span className="rounded-full bg-[#c4a35a] px-4 py-2 font-[family-name:var(--font-fraunces)] text-xl font-bold text-[#141210]">
            {dog.ratingPlacement ?? dog.formwert ?? "Result"}
          </span>
        </div>
      )}

      <p className="mt-6 text-base leading-relaxed text-[#f7f4ed]/65">
        {dog.ratingPlacement
          ? `${dog.dogName} earned ${dog.ratingPlacement} at ${show.name} on ${show.displayDate}. The letter is the Formwert rating (${dog.formwertLabel ?? dog.formwert}); the number is the class placement — they are separate.`
          : `${dog.dogName} was judged in ${dog.classLabel} at ${show.name} on ${show.displayDate}.`}
      </p>

      <div className="mt-8">
        <ShareButtons
          url={pageUrl}
          title={`${dog.dogName} ${dog.ratingPlacement ?? ""}`.trim()}
          text={shareText}
          groupUrl={groupUrl}
        />
      </div>

      {dog.narrative ? (
        <section className="mt-12 rounded-2xl border border-white/8 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-[#c4a35a] uppercase">
            Richterbericht — judge&rsquo;s critique
          </h2>
          <p className="mt-4 font-[family-name:var(--font-fraunces)] text-lg leading-relaxed text-[#f7f4ed]">
            {dog.narrative}
          </p>
          {dog.judge ? (
            <p className="mt-6 text-sm text-[#f7f4ed]/45">Judge {dog.judge}</p>
          ) : null}
        </section>
      ) : null}

      <dl className="mt-10 grid gap-4 text-sm sm:grid-cols-2">
        {[
          ["Class", `${dog.classLabel} — ${dog.sexLabel}`],
          ["Formwert", dog.formwert ? `${dog.formwert} (${dog.formwertLabel})` : "—"],
          ["Placement", dog.placement ? String(dog.placement) : "—"],
          ["Owner", dog.owner ?? "—"],
          ["Sire", dog.sire ?? "—"],
          ["Dam", dog.dam ?? "—"],
          ["Breeder", dog.breeder ?? "—"],
          ["Registration", dog.zbNumber ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/8 px-4 py-3">
            <dt className="text-xs tracking-wide text-[#f7f4ed]/40">{label}</dt>
            <dd className="mt-1 text-[#f7f4ed]">{value}</dd>
          </div>
        ))}
      </dl>

      {dog.titles.length > 0 ? (
        <p className="mt-6 text-sm text-[#f7f4ed]/55">
          Titles: {dog.titles.join(", ")}
        </p>
      ) : null}
    </main>
  );
}
