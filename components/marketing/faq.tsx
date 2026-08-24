import { ChevronDown } from "lucide-react";
import { Reveal } from "./motion-primitives";

/**
 * FAQ entries are the AEO surface: question-formatted, with standalone
 * answers. Rendered with native <details> so every answer is always in the
 * DOM for crawlers, and mirrored verbatim in the FAQPage JSON-LD.
 */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "What is a Sieger show?",
    answer:
      "A Sieger show is a German-style conformation show. Dogs are presented naturally rather than hand-stacked, every dog is critiqued aloud by the judge, and each receives a written critique and a rating (such as V or SG) plus a placement of 1–4 within its class. Titles such as Sieger and Siegerin go to the top-rated adults.",
  },
  {
    question: "What is a Richterbericht?",
    answer:
      "A Richterbericht is the judge's written report on a dog — the critique. It describes the dog's conformation, movement, and temperament against the breed standard. Under ADRK rules, judge reports with V or SG ratings are required documents when a dog is presented for a Körung (breed survey).",
  },
  {
    question: "What does a rating like V1 mean?",
    answer:
      "The letter is the rating and the number is the placement — they are separate. V (vorzüglich) means the judge rated the dog Excellent against the standard; the 1 means it also placed first in its class that day. Many dogs at one show can earn a V rating, but only four place.",
  },
  {
    question: "What is an SE (Standard Evaluation)?",
    answer:
      "An SE is a structured evaluation of a single dog: measurements such as height, weight, and chest depth; bite and dentition; temperament and gun-sureness; and a final pass or fail with a Formwert rating. Show Desk captures the full SE form digitally, seeded from the show catalog.",
  },
  {
    question: "Does the judge have to change how they work?",
    answer:
      "No. The judge dictates the critique aloud exactly as at any German-style show. Show Desk records and transcribes at ringside; the review and paperwork happen at the secretary's desk. Judges already dictate — historically into a ring secretary's notebook or a pocket recorder.",
  },
  {
    question: "Does it work without internet?",
    answer:
      "Yes. Recording and SE capture work fully offline. Recordings queue on the device with the live transcript attached and sync automatically when the connection returns. Show grounds lose Wi-Fi routinely; the paperwork survives it.",
  },
  {
    question: "How do owners get their critiques?",
    answer:
      "By email, the same day. When the secretary approves and releases a critique, Show Desk generates the official certificate PDF and sends it to the owner's address from the show catalog, with delivery tracked and a retry if an address bounces.",
  },
  {
    question: "Which formats does it support?",
    answer:
      "Show Desk is built for German-style events: Sieger shows, SE evaluations, and breed-survey-style paperwork, with ADRK-style classes, rating codes, and titles. Placements are kept in separate pools per class, sex, and show day.",
  },
  {
    question: "Is critique data public?",
    answer:
      "No. Critiques belong to the club and the owner. Nothing is published without the club's release and the owner's consent; results pages are opt-in.",
  },
  {
    question: "How do we get started?",
    answer:
      "Try the live demo and bring your last show's catalog. Run it end to end — import, ringside recording, review, and delivery — so your committee sees the actual workflow before committing to anything.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" aria-label="Frequently asked questions" className="mx-auto max-w-3xl px-6 py-24">
      <Reveal>
        <h2 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-[#f7f4ed] sm:text-4xl">
          Frequently asked questions
        </h2>
      </Reveal>
      <div className="mt-10 space-y-3">
        {FAQ_ITEMS.map((item, i) => (
          <Reveal key={item.question} delay={Math.min(i * 0.05, 0.3)}>
            <details className="group rounded-xl border border-white/8 bg-white/[0.02] transition-colors open:border-[#c4a35a]/30 open:bg-white/[0.04]">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-base font-semibold text-[#f7f4ed] [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-[#c4a35a] transition-transform duration-300 group-open:rotate-180"
                />
              </summary>
              <p className="px-6 pb-6 text-sm leading-relaxed text-[#f7f4ed]/60">
                {item.answer}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
