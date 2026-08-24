import type { AdrkClassId } from "@/lib/domain/adrk-template";
import type { DraftCritiqueSchema } from "@/lib/domain/adrk-template";
import type { CritiqueStatus } from "@/lib/domain/critique-status";
import type { RulebookTemplate } from "@/lib/domain/adrk-template";
import type { DeskRole } from "@/lib/auth/roles";
import type { DogSex } from "@/lib/domain/class-division";
import type {
  CatalogClassId,
  CatalogEventKind,
} from "@/lib/domain/catalog-competition";
import type { TnrkSeForm } from "@/lib/domain/tnrk-se-form";

export interface Show {
  id: string;
  name: string;
  date: string;
  venue: string;
  judge: string;
  judges?: string[];
  rulebook: RulebookTemplate;
  logo_url?: string;
  created_at: string;
  /** ISO timestamp set when the club releases results to the public archive. */
  results_published_at?: string;
}

export interface RosterEntryRecord {
  id: string;
  show_id: string;
  armband: string;
  dog_name: string;
  zb_number: string;
  wt: string;
  owner: string;
  sex: DogSex;
  class_id: AdrkClassId;
  event_kind?: CatalogEventKind;
  competition_day?: string;
  catalog_class?: CatalogClassId | "standard-evaluation";
  email: string;
  photo_path?: string;
  /** Catalog pedigree / SE seed fields (optional for older imports). */
  sire?: string;
  dam?: string;
  breeder?: string;
  address?: string;
  hd_ed_jlpp?: string;
}

export interface CritiqueRecord {
  id: string;
  show_id: string;
  entry_id: string;
  status: CritiqueStatus;
  transcript: string;
  draft: DraftCritiqueSchema;
  audio_path?: string;
  delivery_status: "pending" | "sent" | "failed" | "blocked";
  error_message?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  judge?: string;
}

export interface PlacementRecord {
  id: string;
  show_id: string;
  class_id: AdrkClassId;
  sex: DogSex;
  competition_day?: string;
  catalog_class?: CatalogClassId;
  entry_id: string;
  placement: 1 | 2 | 3 | 4;
}

/** Ring-steward TNRK Standard Evaluation (SE) evaluation. */
export interface SeEvaluationRecord {
  id: string;
  show_id: string;
  entry_id: string;
  form: TnrkSeForm;
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
}

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role?: DeskRole;
}

export interface AppStore {
  shows: Show[];
  entries: RosterEntryRecord[];
  critiques: CritiqueRecord[];
  placements: PlacementRecord[];
  se_evaluations: SeEvaluationRecord[];
  active_show_id: string | null;
  demo_users: DemoUser[];
}

export const EMPTY_STORE: AppStore = {
  shows: [],
  entries: [],
  critiques: [],
  placements: [],
  se_evaluations: [],
  active_show_id: null,
  demo_users: [
    {
      id: "demo-secretary",
      email: "secretary@demo.local",
      password: "demo1234",
      name: "Demo Secretary",
      role: "secretary",
    },
    {
      id: "demo-steward",
      email: "steward@demo.local",
      password: "demo1234",
      name: "Demo Steward",
      role: "steward",
    },
  ],
};
