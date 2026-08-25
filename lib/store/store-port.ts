import type {
  AdrkClassId,
  DraftCritiqueSchema,
  RulebookTemplate,
} from "@/lib/domain/adrk-template";
import type { DogSex } from "@/lib/domain/class-division";
import type {
  CatalogClassId,
  CatalogEventKind,
} from "@/lib/domain/catalog-competition";
import type { CritiqueStatus } from "@/lib/domain/critique-status";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";
import type { DogHealthClearances } from "@/lib/domain/health-clearances";
import type { DogDocumentRecord } from "@/lib/domain/dog-document";
import type { AppStore } from "@/lib/types";

/** Postgres `shows` row. */
export interface ShowRow {
  id: string;
  name: string;
  date: string;
  venue: string;
  judge: string;
  judges: string[] | string | null;
  rulebook: RulebookTemplate;
  logo_url: string | null;
  created_at: string;
  results_published_at?: string | null;
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
  sex: DogSex;
  class_id: AdrkClassId;
  event_kind?: CatalogEventKind | null;
  competition_day?: string | null;
  catalog_class?: CatalogClassId | "standard-evaluation" | null;
  photo_path: string | null;
  sire?: string | null;
  dam?: string | null;
  breeder?: string | null;
  address?: string | null;
  hd_ed_jlpp?: string | null;
  dog_id?: string | null;
  date_of_birth?: string | null;
  prefix_titles?: string | null;
  suffix_titles?: string | null;
  microchip?: string | null;
  registration_club?: string | null;
  co_owner?: string | null;
  kennel_name?: string | null;
  health?: DogHealthClearances | string | null;
}

/** Postgres `critiques` row. */
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
  judge: string | null;
}

/** Postgres `placements` row. */
export interface PlacementRow {
  id: string;
  show_id: string;
  class_id: AdrkClassId;
  sex: DogSex;
  competition_day?: string | null;
  catalog_class?: CatalogClassId | null;
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

/** Postgres `dog_documents` row. */
export type DogDocumentRow = DogDocumentRecord;

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
