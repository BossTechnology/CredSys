// CredSys — Database Types (aligned with 003_tables.sql spec schema)

export type UserRole = "startup" | "evaluator" | "accelerator" | "investor" | "admin";

export type AccreditationStatus =
  | "pending_evaluator_assignment"
  | "evaluator_assigned"
  | "meeting_scheduled"
  | "chass1s_shared"
  | "implementation_in_progress"
  | "ready_for_verification"
  | "verification_in_progress"
  | "accredited"
  | "rejected"
  | "expired";

export type CompetitionStatus = "draft" | "active" | "scoring" | "completed";

// Human-readable labels for the accreditation workflow steps
export const ACCREDITATION_STATUS_LABELS: Record<AccreditationStatus, string> = {
  pending_evaluator_assignment: "Pending Assignment",
  evaluator_assigned:           "Evaluator Assigned",
  meeting_scheduled:            "Meeting Scheduled",
  chass1s_shared:               "CHASS1S Shared",
  implementation_in_progress:   "Implementation",
  ready_for_verification:       "Ready for Verification",
  verification_in_progress:     "Verification",
  accredited:                   "Accredited",
  rejected:                     "Rejected",
  expired:                      "Expired",
};

export const ACCREDITATION_STATUS_ORDER: AccreditationStatus[] = [
  "pending_evaluator_assignment",
  "evaluator_assigned",
  "meeting_scheduled",
  "chass1s_shared",
  "implementation_in_progress",
  "ready_for_verification",
  "verification_in_progress",
  "accredited",
];

// ============================================================
// Entity Types
// ============================================================

export interface Startup {
  id:          string;
  org_name:    string;
  email:       string;
  industry?:   string;
  country?:    string;
  website?:    string;
  description?: string;
  stage?:      string;
  team_size?:  number;
  created_at:  string;
  updated_at:  string;
}

export interface Evaluator {
  id:          string;
  org_name:    string;
  email:       string;
  industry?:   string;
  country?:    string;
  website?:    string;
  description?: string;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
}

export interface Accelerator {
  id:          string;
  org_name:    string;
  email:       string;
  industry?:   string;
  country?:    string;
  website?:    string;
  description?: string;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
}

export interface UserProfile {
  id:         string;
  user_id:    string;
  role:       UserRole;
  entity_id:  string;
  created_at: string;
}

export interface AccountSetupToken {
  id:         string;
  token:      string;
  email:      string;
  role:       UserRole;
  entity_id:  string;
  used_at?:   string;
  expires_at: string;
  created_at: string;
}

// ============================================================
// Competition Types
// ============================================================

export interface Competition {
  id:             string;
  name:           string;
  description?:   string;
  industry?:      string;
  status:         CompetitionStatus;
  start_date?:    string;
  end_date?:      string;
  accelerator_id?: string;
  created_by?:    string;
  created_at:     string;
  updated_at:     string;
  // Joined
  accelerator?:   Accelerator;
}

export interface CompetitionStartup {
  id:                       string;
  competition_id:           string;
  startup_id:               string;
  accreditation_request_id?: string;
  entered_at:               string;
  // Joined
  startup?:                 Startup;
  competition?:             Competition;
}

export interface CompetitionEvaluator {
  id:             string;
  competition_id: string;
  evaluator_id:   string;
  assigned_at:    string;
  // Joined
  evaluator?:     Evaluator;
}

export interface CompetitionScore {
  id:             string;
  competition_id: string;
  startup_id:     string;
  evaluator_id:   string;
  score:          number;
  notes?:         string;
  scored_at:      string;
  // Joined
  startup?:       Startup;
  evaluator?:     Evaluator;
}

// ============================================================
// Accreditation Types
// ============================================================

export interface BLIPSVerification {
  b?: boolean;  // Business model validated
  l?: boolean;  // Legal compliance confirmed
  i?: boolean;  // Impact measurable
  p?: boolean;  // Product demonstrated
  s?: boolean;  // Scalability assessed
}

export interface ADDISVerification {
  a?: boolean;  // Addressable market validated
  d?: boolean;  // Data/metrics reviewed
  d2?: boolean; // Differentiation confirmed
  i?: boolean;  // Investment readiness
  s?: boolean;  // Stage-appropriate
}

export interface AccreditationRequest {
  id:              string;
  startup_id:      string;
  evaluator_id?:   string;
  competition_id?: string;
  status:          AccreditationStatus;

  // Startup snapshot
  startup_name:      string;
  startup_email:     string;
  industry:          string;
  stage?:            string;
  country?:          string;
  website?:          string;
  description?:      string;
  problem?:          string;
  traction?:         string;
  demo_url?:         string;
  pitch_deck_url?:   string;
  team_size?:        number;
  additional_notes?: string;

  // Verification
  blips_verification: BLIPSVerification;
  addis_verification: ADDISVerification;

  // Credential
  unique_code?:   string;
  accredited_at?: string;
  expires_at?:    string;

  // Email tracking
  e4_sent: boolean;
  e5_sent: boolean;

  // Notes
  evaluator_notes?:  string;
  rejection_reason?: string;
  notes?:            string;
  deadline?:         string;

  created_at: string;
  updated_at: string;

  // Joined
  startup?:   Startup;
  evaluator?: Evaluator;
}

// ============================================================
// Credential Types
// ============================================================

export interface Investor {
  id:               string;
  org_name:         string;
  email:            string;
  contact_person:   string | null;
  phone_whatsapp:   string | null;
  website:          string | null;
  investment_focus: string | null;
  country:          string | null;
  description:      string | null;
  is_active:        boolean;
  created_at:       string;
  updated_at:       string;
}

export interface InvestorWatchlistEntry {
  id:                           string;
  investor_id:                  string;
  startup_id:                   string;
  added_at:                     string;
  notify_on_accredited:         boolean;
  notify_on_evaluator_assigned: boolean;
  notify_on_status_change:      boolean;
}

export type SponsorshipStatus = "pending_startup_acceptance" | "accepted" | "declined" | "cancelled" | "completed";

export interface AccreditationSponsorship {
  id:                       string;
  sponsor_type:             "investor" | "accelerator";
  sponsor_investor_id:      string | null;
  sponsor_accelerator_id:   string | null;
  billing_contact_name:     string;
  billing_contact_email:    string;
  billing_contact_phone:    string | null;
  billing_contact_address:  string | null;
  startup_id:               string | null;
  startup_name_input:       string;
  startup_email_input:      string;
  accreditation_request_id: string | null;
  status:                   SponsorshipStatus;
  accepted_at:              string | null;
  declined_at:              string | null;
  completed_at:             string | null;
  notes:                    string | null;
  created_at:               string;
  updated_at:               string;
}

export interface CredPage {
  id:                       string;
  startup_id:               string;
  accreditation_request_id: string;
  unique_code:              string;
  is_active:                boolean;
  accredited_at:            string;
  expires_at?:              string;
  created_at:               string;
  updated_at:               string;
  // Joined
  startup?:                 Startup;
}
