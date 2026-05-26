export type UserRole = "startup" | "evaluator" | "accelerator" | "admin";

export type AccreditationStatus =
  | "draft"
  | "submitted"
  | "assigned"
  | "interview"
  | "implementing"
  | "verifying"
  | "accredited"
  | "rejected"
  | "expired";

export type CompetitionStatus = "draft" | "active" | "scoring" | "completed";

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  org_name: string;
  email: string;
  industry?: string;
  country?: string;
  website?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccreditationRequest {
  id: string;
  startup_id: string;
  evaluator_id?: string;
  status: AccreditationStatus;
  industry: string;
  startup_name: string;
  startup_email: string;
  startup_org_name: string;
  unique_code?: string;
  accredited_at?: string;
  expires_at?: string;
  deadline?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  evaluator?: Profile;
}

export interface Competition {
  id: string;
  title: string;
  description?: string;
  industry?: string;
  status: CompetitionStatus;
  start_date?: string;
  end_date?: string;
  created_by: string;
  created_at: string;
}

export interface CompetitionEntry {
  id: string;
  competition_id: string;
  startup_id: string;
  evaluator_id?: string;
  score?: number;
  rank?: number;
  submitted_at?: string;
  scored_at?: string;
  created_at: string;
  startup?: Profile;
  evaluator?: Profile;
  competition?: Competition;
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  template_code: string;
  payload: Record<string, unknown>;
  status: "pending" | "sent" | "failed";
  sent_at?: string;
  created_at: string;
}
