import { errorCode, http } from './client';
import type {
  AskQuestionResponse,
  FeedbackResponse,
  Paginated,
  QuestionDetail,
  QuestionListItem,
  QuestionMode,
  Urgency,
} from '../../types';
import type { Feedback } from '../../domain/feedback/feedbackPolicy';
import { FeedbackNotAllowedError } from '../../domain/errors';

export const questionsApi = {
  /** §6 목록. 질문자는 기본 자기 것, 담당자는 전체 */
  list: (
    projectId: string,
    params: { mine?: boolean; status?: string; grade?: string; limit?: number; offset?: number } = {}
  ) =>
    http.get<Paginated<QuestionListItem>>(`/projects/${projectId}/questions`, {
      params: { limit: 20, offset: 0, ...params },
    }),

  /**
   * 질문과 대화가 같은 엔드포인트를 쓴다.
   *
   * D17 은 원래 "담당자가 호출하면 403 FORBIDDEN_ROLE" 이었다. mode="conversation" 에도
   * 그 제한이 그대로 걸리는지는 **명세에 적혀 있지 않다**. 걸린다면 담당자는 대화도 못 보내고
   * 양방향 채팅이 성립하지 않는다 — 화면은 403 을 삼키지 말고 그대로 사용자에게 보여준다.
   */
  ask: (
    projectId: string,
    contentKo: string,
    urgency: Urgency = 'normal',
    mode: QuestionMode = 'question'
  ) =>
    http.post<AskQuestionResponse>(`/projects/${projectId}/questions`, {
      content_ko: contentKo,
      urgency,
      mode,
    }),

  detail: (questionId: string) => http.get<QuestionDetail>(`/questions/${questionId}`),

  /** 긴급도 변경 — status="processing" 동안만 허용, 이후 409 PIPELINE_IN_PROGRESS */
  setUrgency: (questionId: string, urgency: Urgency) =>
    http.patch(`/questions/${questionId}`, { urgency }),

  /**
   * 크로스체크(§6). Feedback VO 를 받는다 — "different 인데 note 없음"은
   * 도메인 계층에서 이미 만들어지지 않으므로 여기서 다시 검사하지 않는다.
   */
  feedback: async (answerId: string, feedback: Feedback): Promise<FeedbackResponse> => {
    try {
      return await http.post<FeedbackResponse>(`/answers/${answerId}/feedback`, feedback);
    } catch (err) {
      if (errorCode(err) === 'FEEDBACK_NOT_ALLOWED') throw new FeedbackNotAllowedError();
      throw err;
    }
  },
};
