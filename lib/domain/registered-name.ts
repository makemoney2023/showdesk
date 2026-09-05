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
  "AM CH",
  "CAN CH",
  "INT CH",
  "UKC CH",
  "AKC CH",
  "GRAND CH",
  "MULTI CH",
  "WORLD CH",
  "NAT CH",
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
] as const;

export interface RegisteredNameParts {
  dog_name: string;
  prefix_titles: string;
  suffix_titles: string;
}

function titleMatcher(token: string, at: "start" | "end"): RegExp {
  const escaped = token
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return at === "start"
    ? new RegExp(`^${escaped}\\.?\\b`, "i")
    : new RegExp(`\\b${escaped}\\.?$`, "i");
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
    rest =
      at === "start"
        ? rest.replace(titleMatcher(token, "start"), "").trim()
        : rest.replace(titleMatcher(token, "end"), "").trim();
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
  const original = input.dog_name.trim().replace(/,/g, " ").replace(/\s+/g, " ");
  const leading = consumeTitles(original, PREFIX_TITLES, "start");
  const trailing = consumeTitles(leading.rest, SUFFIX_TITLES, "end");
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
    prefix_titles: joinTitles(input.prefix_titles, leading.titles.join(" ")),
    suffix_titles: joinTitles(input.suffix_titles, trailing.titles.join(" ")),
  };
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
