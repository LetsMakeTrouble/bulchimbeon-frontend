/**
 * bulchimbeon-backend `docs/05-api-contract.md` 와 1:1 대응.
 * 계약이 바뀌면 이 파일을 먼저 고친다.
 */

export type Role = 'answerer' | 'asker';
export type MemberStatus = 'active' | 'left';
export type Language = 'ko' | 'en';
export type Urgency = 'normal' | 'urgent';

/** §1.3 */
export type Grade = 'green' | 'yellow' | 'red';
export type AnswerState = 'draft' | 'verified' | 'under_review' | 'expired' | 'rejected';
export type QuestionStatus = 'processing' | 'answered' | 'held' | 'failed';

/** §7 카드 reason — 액션 매트릭스의 키 */
export type CardReason = 'green' | 'yellow' | 'red' | 'feedback' | 'doc_update' | 'failed';
export type CardStatus = 'pending' | 'deferred' | 'resolved';

export type HeldReason =
  | 'conflict'
  | 'no_evidence'
  | 'low_confidence'
  | 'schema_failed'
  | 'quota_exceeded';

export type IngestStatus = 'pending' | 'processing' | 'ready' | 'failed';

/** §1.2 페이지네이션 봉투 */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** 프로젝트·문서·멤버 목록은 total/limit/offset 없이 items 만 내려온다 */
export interface Listed<T> {
  items: T[];
}

// ── §2 인증 ────────────────────────────────────────────────

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
  /** asker 에게는 항상 0 */
  pending_cards: number;
}

export interface AuthMeResponse {
  user: User;
  projects: UserProjectSummary[];
  unread_notifications_total: number;
}

// ── §3 프로젝트 ────────────────────────────────────────────

/** PATCH /projects/{id}/settings 허용 키 전체 (목록 밖 키는 400) */
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
  /** "HH:MM" */
  dnd_start: string;
  dnd_end: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  role: Role;
  member_status: MemberStatus;
  away_mode: boolean;
  settings: ProjectSettings;
  /** 담당자에게만 내려온다 */
  invite_code: string | null;
  created_at: string;
}

export interface ProjectMember {
  user_id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  joined_at: string;
}

// ── §4 문서 ────────────────────────────────────────────────

export interface DocumentVersion {
  id: string;
  version_no: number;
  original_filename: string;
  mime: string;
  is_active: boolean;
  ingest_status: IngestStatus;
  ingest_error: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  /** "upload" | "notion" | "github" */
  source_type: string;
  source_ref: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  /** 활성 버전 요약 — 순번이 아니라 객체다 */
  active_version: DocumentVersion | null;
}

/** 상세 = 목록 아이템 + 버전 목록. 업로드/새 버전 201 응답도 같은 shape */
export interface DocumentDetail extends DocumentItem {
  versions: DocumentVersion[];
}

export interface DocumentContent {
  document_id: string;
  version_id: string;
  version_no: number;
  title: string;
  mime: string;
  content: string;
}

export interface ActivateVersionResponse {
  document_id: string;
  active_version: number;
  review_cascade_count: number;
  message: string;
}

// ── §5 연동 ────────────────────────────────────────────────

export type IntegrationProvider = 'notion' | 'github';

export interface Integration {
  id: string;
  provider: IntegrationProvider;
  status: string;
  last_synced_at?: string | null;
  config: Record<string, unknown>;
}

// ── §6 질문 / 답변 ─────────────────────────────────────────

export interface Citation {
  id: string;
  chunk_id: string;
  /** 원문 열람 URL 구성용 */
  document_id: string;
  document_version_id: string;
  doc_title: string;
  version_no: number;
  heading_path: string[];
  page_no: number | null;
  quote: string;
  /** 원시 코사인 — % 로 표시하지 말 것 */
  similarity: number;
}

export interface FeedbackSummary {
  correct: number;
  different: number;
  my_feedback: 'correct' | 'different' | null;
}

export interface AccuracyContext {
  grade: Grade;
  verified_rate: number | null;
  sample: number;
  window_days: number;
  sufficient: boolean;
  message: string | null;
}

export interface Answer {
  id: string;
  grade: Grade;
  state: AnswerState;
  /** held·processing·재사용이면 null */
  matching_rate: number | null;
  search_score: number | null;
  grounding_score: number | null;
  content_ko: string;
  content_en: string;
  source: 'generated' | 'reused';
  degraded_from_red: boolean;
  expires_at: string | null;
  disclaimer: string | null;
  citations: Citation[];
  feedback_summary: FeedbackSummary;
  official_qa: { id: string; question_ko: string; reuse_count: number } | null;
  accuracy_context: AccuracyContext | null;
}

export interface HeldInfo {
  reason: HeldReason;
  message: string;
  card_status: CardStatus;
}

export interface FailureInfo {
  reason: string;
  message: string;
  card_status: CardStatus;
}

export interface QuestionDetail {
  id: string;
  content_ko: string;
  content_en: string | null;
  urgency: Urgency;
  status: QuestionStatus;
  asked_by: { id: string; name: string };
  answer: Answer | null;
  similar_official_qa?: {
    id: string;
    question_ko: string;
    answer_ko: string;
    similarity: number;
  } | null;
  held_info: HeldInfo | null;
  failure_info: FailureInfo | null;
}

/** §6 목록 아이템 — 이것만으로 목록 화면이 완성된다 (상세 호출 불필요) */
export interface QuestionListItem {
  id: string;
  content_ko: string;
  status: QuestionStatus;
  grade: Grade | null;
  matching_rate: number | null;
  state: AnswerState | null;
  created_at: string;
  feedback_summary: FeedbackSummary | null;
}

export interface AskQuestionResponse {
  question_id: string;
  status: QuestionStatus;
  suggest_urgent: boolean;
  created_at: string;
}

export interface FeedbackResponse {
  answer_id: string;
  answer_state: AnswerState;
  message: string;
  feedback_summary: FeedbackSummary;
  recommend_approve: boolean;
}

// ── §7 확인 카드 큐 ────────────────────────────────────────

/** 큐 목록 아이템 — 큐 화면의 렌더 계약 */
export interface ReviewCardListItem {
  id: string;
  reason: CardReason;
  status: CardStatus;
  is_urgent: boolean;
  /** 정렬 1순위 */
  recommend_approve: boolean;
  /** reason="failed" 면 null */
  grade: Grade | null;
  question_preview_en: string | null;
  question_preview_ko: string;
  created_at: string;
  /** null 이면 "NEW" 뱃지 */
  first_viewed_at: string | null;
  /** 브리핑 recommend_approve[] 에만 붙는다 */
  correct_count?: number;
}

export interface QuestionStruct {
  background: string;
  question: string;
  options: string[];
}

export interface PendingFeedback {
  id: string;
  verdict: 'correct' | 'different';
  note: string | null;
  user: { id: string; name: string };
  created_at: string;
}

export interface ReviewCardDetail extends Omit<ReviewCardListItem, 'question_preview_en' | 'question_preview_ko'> {
  deferred_until: string | null;
  answer_id: string | null;
  question: { id: string; content_en: string | null; content_ko: string };
  /** reason="red" 에만 채워진다 */
  question_struct: QuestionStruct | null;
  /** reason="failed" 면 null */
  draft_answer: { content_en: string; citations: Citation[] } | null;
  pending_feedbacks: PendingFeedback[];
}

// ── §11 알림 ───────────────────────────────────────────────

export type NotificationType =
  | 'answer.completed'
  | 'answer.failed'
  | 'answer.verified'
  | 'answer.corrected'
  | 'answer.kept'
  | 'answer.rejected'
  | 'card.created'
  | 'briefing.ready'
  | 'doc.review_needed'
  | 'feedback.different'
  | 'sync.completed'
  | 'sync.failed';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: { project_id: string; question_id?: string; card_id?: string };
  read_at: string | null;
  created_at: string;
}
