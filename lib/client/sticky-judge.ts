"use client";

import {
  canRecordWithJudge,
  judgeStorageKey,
} from "@/lib/domain/show-judges";

export function readStickyJudge(showId: string): string | null {
  try {
    return sessionStorage.getItem(judgeStorageKey(showId));
  } catch {
    return null;
  }
}

export function writeStickyJudge(showId: string, name: string) {
  try {
    if (!name) sessionStorage.removeItem(judgeStorageKey(showId));
    else sessionStorage.setItem(judgeStorageKey(showId), name);
  } catch {
    /* private mode / quota */
  }
}

export function stickyJudgeForShow(
  showId: string,
  judges: Iterable<string>,
): string | null {
  const stored = readStickyJudge(showId);
  if (!canRecordWithJudge(stored, judges)) {
    if (stored) writeStickyJudge(showId, "");
    return null;
  }
  return stored;
}
