export type Role = 'answerer' | 'asker';
export type MemberStatus = 'active' | 'left';
export type Language = 'ko' | 'en';
export type Grade = 'green' | 'yellow' | 'red';
export type QuestionStatus = 'processing' | 'answered' | 'held' | 'failed';
export type AnswerState = 'draft' | 'verified' | 'under_review' | 'expired' | 'rejected';
export type CardReason = 'green' | 'yellow' | 'red' | 'feedback' | 'doc_update' | 'failed';
export type CardStatus = 'pending' | 'resolved';
export type IngestStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface User {
  id: string;
  email: string;
  name: string;
  language: Language;
  timezone: string;
}

export interface UserProjectSummary {
  id: string;
  name: string;
  role: Role;
  member_status: MemberStatus;
  away_mode: boolean;
  unread_notifications: number;
  pending_cards: number;
}

export interface AuthMeResponse {
  user: User;
  projects: UserProjectSummary[];
  unread_notifications_total: number;
}

export interface ProjectSettings {
  green_threshold: number;
  yellow_threshold: number;
  grounding_min: number;
  s_floor: number;
  s_ceil: number;
  similarity_floor: number;
  reuse_threshold: number;
  similar_threshold: number;
  draft_expire_hours: number;
  max_lessons: number;
  retrieval_top_k: number;
  daily_llm_call_limit: number;
  saved_wait_assumption_hours: number;
  briefing_hour: number;
  dnd_start: string;
  dnd_end: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  answerer_id: string;
  invite_code?: string;
  away_mode: boolean;
  my_role: Role;
  settings: ProjectSettings;
}

export interface Citation {
  document_id: string;
  document_version_id: string;
  document_title: string;
  heading_path?: string;
  quote: string;
}

export interface Answer {
  id: string;
  question_id: string;
  content_ko: string;
  content_en: string;
  disclaimer?: string;
  grade: Grade;
  state: AnswerState;
  source: 'generated' | 'reused';
  citations: Citation[];
  created_at: string;
}

export interface Question {
  id: string;
  project_id: string;
  asker_id: string;
  asker_name?: string;
  content_ko: string;
  content_en: string;
  is_urgent: boolean;
  status: QuestionStatus;
  created_at: string;
  answer?: Answer;
}

export interface InboxCard {
  id: string;
  project_id: string;
  question_id: string;
  answer_id?: string;
  reason: CardReason;
  card_status: CardStatus;
  grade?: Grade;
  question_summary?: string;
  question_content?: string;
  draft_answer?: string;
  citations?: Citation[];
  missing_info?: string;
  recommend_approve?: boolean;
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  version_no: number;
  ingest_status: IngestStatus;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  project_id: string;
  title: string;
  active_version?: number;
  versions: DocumentVersion[];
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
