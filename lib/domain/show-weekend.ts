/** Friday SE + Sat/Sun conformation window around a show's listed date. */

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export interface ShowWeekend {
  se: string;
  saturday: string;
  sunday: string;
}

/**
 * Map a show's listed date onto the standard three-day Sieger weekend.
 * Friday is SE-only; Saturday and Sunday are conformation.
 */
export function showWeekendDays(showDate: string): ShowWeekend {
  const parsed = parseIsoDate(showDate);
  if (!parsed) {
    return { se: showDate, saturday: showDate, sunday: showDate };
  }
  const weekday = parsed.getDay();
  const saturday =
    weekday === 6
      ? parsed
      : weekday === 0
        ? addDays(parsed, -1)
        : weekday === 5
          ? addDays(parsed, 1)
          : addDays(parsed, 6 - weekday);
  return {
    se: toIso(addDays(saturday, -1)),
    saturday: toIso(saturday),
    sunday: toIso(addDays(saturday, 1)),
  };
}

export function weekendDayKind(
  weekend: ShowWeekend,
  day: string | undefined,
): "se" | "saturday" | "sunday" | null {
  if (!day) return null;
  if (day === weekend.se) return "se";
  if (day === weekend.saturday) return "saturday";
  if (day === weekend.sunday) return "sunday";
  return null;
}
