import type { AppStore } from "@/lib/types";

function inShow<T extends { show_id: string }>(
  rows: T[] | undefined,
  showIds: Set<string>,
): T[] {
  return (rows ?? []).filter((row) => showIds.has(row.show_id));
}

/**
 * Keep one club's shows and child rows. Legacy stores without org_id on
 * shows stay unfiltered so demo / pre-migration snapshots still load.
 */
export function scopeStoreToOrg(store: AppStore, orgId: string): AppStore {
  const anyScoped = store.shows.some((show) => show.org_id);
  const shows = anyScoped
    ? store.shows.filter((show) => show.org_id === orgId)
    : store.shows;
  const showIds = new Set(shows.map((show) => show.id));

  return {
    ...store,
    shows,
    entries: inShow(store.entries, showIds),
    critiques: inShow(store.critiques, showIds),
    placements: inShow(store.placements, showIds),
    se_evaluations: inShow(store.se_evaluations, showIds),
    dog_documents: inShow(store.dog_documents, showIds),
    active_show_id:
      store.active_show_id && showIds.has(store.active_show_id)
        ? store.active_show_id
        : null,
    organizations: (store.organizations ?? []).filter((org) => org.id === orgId),
    memberships: (store.memberships ?? []).filter(
      (membership) => membership.org_id === orgId,
    ),
  };
}

/** Write a scoped club snapshot back into a multi-club file store. */
export function mergeOrgStore(
  full: AppStore,
  scopedNext: AppStore,
  orgId: string,
): AppStore {
  const otherShows = full.shows.filter(
    (show) => show.org_id && show.org_id !== orgId,
  );
  const keepShowIds = new Set(otherShows.map((show) => show.id));
  const otherRows = <T extends { show_id: string }>(rows: T[] | undefined) =>
    (rows ?? []).filter((row) => keepShowIds.has(row.show_id));

  return {
    ...full,
    shows: [...otherShows, ...scopedNext.shows],
    entries: [...otherRows(full.entries), ...scopedNext.entries],
    critiques: [...otherRows(full.critiques), ...scopedNext.critiques],
    placements: [...otherRows(full.placements), ...scopedNext.placements],
    se_evaluations: [
      ...otherRows(full.se_evaluations),
      ...(scopedNext.se_evaluations ?? []),
    ],
    dog_documents: [
      ...otherRows(full.dog_documents),
      ...(scopedNext.dog_documents ?? []),
    ],
    active_show_id: scopedNext.active_show_id,
    organizations: [
      ...(full.organizations ?? []).filter((org) => org.id !== orgId),
      ...(scopedNext.organizations ?? []),
    ],
    memberships: [
      ...(full.memberships ?? []).filter(
        (membership) => membership.org_id !== orgId,
      ),
      ...(scopedNext.memberships ?? []),
    ],
    demo_users: scopedNext.demo_users ?? full.demo_users,
  };
}
