/**
 * Registered name is the dog's name without titles.
 * Prefix (conformation) and suffix (performance) titles are stored separately.
 */

const PREFIX_TITLES = [
  "Anw.Dt.Jgd.-Ch.VDH",
  "Res.Anw.Dt.Jgd.-Ch.VDH",
  "Anw.Dt.Vet.-Ch.VDH",
  "Res.Anw.Dt.Vet.-Ch.VDH",
  "Anw.Dt.Ch.VDH",
  "Res.Anw.Dt.Ch.VDH",
  "YOUTH CH",
  "YOUTHCH",
  "JUNIOR CH",
  "JUNIORCH",
  "JR CH",
  "JGD CH",
  "JUGEND CH",
  "AM CH",
  "CAN CH",
  "INT CH",
  "UKC CH",
  "AKC CH",
  "GRAND CH",
  "MULTI CH",
  "WORLD CH",
  "NAT CH",
  "GR CH",
  "GRCHB",
  "GRCHS",
  "GRCHG",
  "GRCH",
  "GCHB",
  "GCHS",
  "GCHG",
  "GCHP",
  "GCHC",
  "GCH",
  "CH",
  "KLUBSIEGERIN",
  "KLUBSIEGER",
  "SIEGERIN",
  "SIEGER",
  "CACIB",
  "KS",
] as const;

const SUFFIX_TITLES = [
  "FRENCH RING",
  "BH-VT",
  "IGP3",
  "IGP2",
  "IGP1",
  "IPO3",
  "IPO2",
  "IPO1",
  "SCHH3",
  "SCHH2",
  "SCHH1",
  "VPG3",
  "VPG2",
  "VPG1",
  "FH2",
  "FH1",
  "IGP",
  "IPO",
  "SCHH",
  "MONDIO",
  "ZVV",
  "ZTP",
  "PSA",
  "BH",
  "FH",
  "AD",
  "CGCA",
  "CGCU",
  "CGN",
  "CGC",
  "SDIN",
  "SDE",
  "SDB",
  "SDI",
  "FDC",
  "ATT",
  "RACH",
  "RAE",
  "RN",
  "RA",
  "RE",
  "RM",
  "CDX",
  "UDX",
  "OTCH",
  "CD",
  "UD",
  "BN",
  "THDN",
  "THDX",
  "THDA",
  "THD",
  "BCAT",
  "DCAT",
  "FCAT",
  "TKN",
  "TKI",
  "TKA",
  "TKP",
  "WAC",
  "TT",
  "QUALIFIER",
] as const;

/** Event tags such as "2025 GRUETS QUALIFIER" sit after performance titles. */
const QUALIFIER_SUFFIX =
  /(?:\d{4}\s+)?(?:[A-Za-z][A-Za-z0-9'’-]*\s+)?QUALIFIER\.?$/i;

const LEADING_PREFIX_WINDOW = 10;

export interface RegisteredNameParts {
  dog_name: string;
  prefix_titles: string;
  suffix_titles: string;
}

function escapeTitle(token: string): string {
  return token
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "[\\s._-]*");
}

function titleMatcher(token: string, at: "start" | "end"): RegExp {
  const escaped = escapeTitle(token);
  return at === "start"
    ? new RegExp(`^${escaped}\\.?\\b`, "i")
    : new RegExp(`\\b${escaped}\\.?$`, "i");
}

function tidyName(name: string): string {
  return name
    .replace(/^[.\s,;:–-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function consumeTitles(
  name: string,
  titles: readonly string[],
  at: "start" | "end",
): { titles: string[]; rest: string } {
  const sorted = [...titles].sort((a, b) => b.length - a.length);
  const found: string[] = [];
  let rest = name;
  while (rest) {
    const token = sorted.find((title) => titleMatcher(title, at).test(rest));
    if (!token) break;
    found.push(token);
    rest = tidyName(
      at === "start"
        ? rest.replace(titleMatcher(token, "start"), "")
        : rest.replace(titleMatcher(token, "end"), ""),
    );
  }
  return { titles: found, rest };
}

function normalizeNameText(value: string): string {
  return value.trim().replace(/,/g, " ").replace(/\s+/g, " ");
}

function stripStoredAffix(
  name: string,
  affix: string | undefined,
  at: "start" | "end",
): string {
  const token = normalizeNameText(affix ?? "");
  if (!token) return name;
  const escaped = escapeTitle(token);
  const re =
    at === "start"
      ? new RegExp(`^${escaped}\\s*`, "i")
      : new RegExp(`\\s*${escaped}$`, "i");
  return tidyName(name.replace(re, ""));
}

function consumeQualifierSuffix(name: string): {
  titles: string[];
  rest: string;
} {
  const match = QUALIFIER_SUFFIX.exec(name);
  if (!match || match[0].length >= name.length) {
    return { titles: [], rest: name };
  }
  return {
    titles: [match[0].trim()],
    rest: name.slice(0, -match[0].length).trim(),
  };
}

/**
 * Catalog names sometimes put a kennel or "Inc." phrase in front of Youth CH.
 * If a known prefix title sits in the first few tokens, drop everything
 * through that title.
 */
function stripThroughEmbeddedPrefix(name: string): {
  titles: string[];
  rest: string;
} {
  const tokens = name.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return { titles: [], rest: name };

  const window = tokens.slice(0, LEADING_PREFIX_WINDOW);
  const windowText = window.join(" ");
  const sorted = [...PREFIX_TITLES].sort((a, b) => b.length - a.length);
  let best: { title: string; end: number } | null = null;

  for (const title of sorted) {
    // Consume a trailing period without requiring \\b after it ("Ch." + space).
    const re = new RegExp(`^(.*?)(${escapeTitle(title)})\\.?(?=\\s|$)`, "i");
    const match = re.exec(windowText);
    if (!match) continue;
    const end = match[0].length;
    if (end === 0 || end >= windowText.length) continue;
    if (!best || end > best.end) best = { title, end };
  }

  if (!best) return { titles: [], rest: name };

  const cut = windowText.slice(0, best.end).trim();
  const afterWindow = tidyName(windowText.slice(best.end));
  const rest = tidyName(
    [afterWindow, ...tokens.slice(LEADING_PREFIX_WINDOW)]
      .filter(Boolean)
      .join(" "),
  );
  if (!rest) return { titles: [], rest: name };
  return { titles: [cut], rest };
}

/** Catalog rows sometimes repeat a compacted prefix, then the spaced form. */
function stripEmbeddedPrefixes(name: string): {
  titles: string[];
  rest: string;
} {
  const found: string[] = [];
  let rest = name;
  for (let i = 0; i < 4; i += 1) {
    const next = stripThroughEmbeddedPrefix(rest);
    if (!next.titles.length || next.rest === rest) break;
    found.push(...next.titles);
    rest = next.rest;
  }
  return { titles: found, rest };
}

function joinTitles(...groups: Array<string | undefined>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    if (!group?.trim()) continue;
    for (const part of group.split(/\s{2,}|,/).flatMap((chunk) => {
      const trimmed = chunk.trim();
      return trimmed ? [trimmed] : [];
    })) {
      const key = part.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(part.replace(/\s+/g, " "));
    }
  }
  return out.join(" ");
}

/** Registered name only, lowercased, for matching weekend appearances. */
export function normalizeRegisteredName(name?: string): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "";
  return splitRegisteredName({ dog_name: trimmed })
    .dog_name.trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Move leading/trailing title tokens out of the registered name. */
export function splitRegisteredName(input: {
  dog_name: string;
  prefix_titles?: string;
  suffix_titles?: string;
}): RegisteredNameParts {
  const original = normalizeNameText(input.dog_name);
  const afterStoredPrefix = stripStoredAffix(
    original,
    input.prefix_titles,
    "start",
  );
  const afterStoredSuffix = stripStoredAffix(
    afterStoredPrefix,
    input.suffix_titles,
    "end",
  );
  const leading = consumeTitles(afterStoredSuffix, PREFIX_TITLES, "start");
  const embedded = stripEmbeddedPrefixes(leading.rest);
  const qualifier = consumeQualifierSuffix(embedded.rest);
  const trailing = consumeTitles(qualifier.rest, SUFFIX_TITLES, "end");
  const registered = trailing.rest.trim();
  if (!registered) {
    return {
      dog_name: original,
      prefix_titles: joinTitles(input.prefix_titles),
      suffix_titles: joinTitles(input.suffix_titles),
    };
  }
  return {
    dog_name: registered,
    prefix_titles: joinTitles(
      input.prefix_titles,
      leading.titles.join(" "),
      embedded.titles.join(" "),
    ),
    suffix_titles: joinTitles(
      input.suffix_titles,
      qualifier.titles.join(" "),
      trailing.titles.join(" "),
    ),
  };
}

/** Certificate / critique header: registered name only, never titles. */
export function registeredDogName(input: {
  dog_name?: string | null;
  prefix_titles?: string | null;
  suffix_titles?: string | null;
}): string {
  const raw = input.dog_name?.trim() ?? "";
  if (!raw) return "";
  return splitRegisteredName({
    dog_name: raw,
    prefix_titles: input.prefix_titles ?? "",
    suffix_titles: input.suffix_titles ?? "",
  }).dog_name;
}

export function formatTitlesLine(input: {
  prefix_titles?: string;
  suffix_titles?: string;
}): string {
  return [input.prefix_titles, input.suffix_titles]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");
}
