import type {
  AdrkClassId,
  DraftCritiqueSchema,
  RulebookTemplate,
} from "@/lib/domain/adrk-template";
import type { CritiqueStatus } from "@/lib/domain/critique-status";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";
import type { AppStore } from "@/lib/types";

/** Postgres `shows` row — schema columns only (no app-only `judges`). */
export interface ShowRow {
  id: string;
  name: string;
  date: string;
  venue: string;
  judge: string;
  rulebook: RulebookTemplate;
  logo_url: string | null;
  created_at: string;
}

/** Postgres `entries` row. */
export interface EntryRow {
  id: string;
  show_id: string;
  armband: string;
  dog_name: string;
  zb_number: string;
  wt: string;
  owner: string;
  email: string;
  sex: "R" | "H";
  class_id: AdrkClassId;
}

/** Postgres `critiques` row — schema columns only (no app-only `judge`). */
export interface CritiqueRow {
  id: string;
  show_id: string;
  entry_id: string;
  status: CritiqueStatus;
  transcript: string;
  draft: DraftCritiqueSchema | string;
  audio_path: string | null;
  delivery_status: "pending" | "sent" | "failed" | "blocked";
  error_message: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

/** Postgres `placements` row. */
export interface PlacementRow {
  id: string;
  show_id: string;
  class_id: AdrkClassId;
  entry_id: string;
  placement: 1 | 2 | 3 | 4;
}

/** Postgres `se_evaluations` row. */
export interface SeEvaluationRow {
  id: string;
  show_id: string;
  entry_id: string;
  form: TnrkSeForm | string;
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
}

/** Singleton `app_state` row (`id = 1`). */
export interface AppStateRow {
  id: 1;
  active_show_id: string | null;
}

/** Persistence surface shared by file-store and supabase-store. */
export interface StorePort {
  readStore(): Promise<AppStore>;
  writeStore(store: AppStore): Promise<void>;
  updateStore(updater: (store: AppStore) => AppStore | void): Promise<AppStore>;
  purgeShowData(showId: string): Promise<AppStore>;
}
