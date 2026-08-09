import { apiClient } from './client';

export const sseApi = {
  /**
   * §12.1 1회용 스트림 티켓.
   *
   * EventSource 가 헤더를 못 실어서 쿼리로 인증해야 하는데, access token 을 URL 에 실으면
   * 프록시·히스토리·리퍼러·액세스 로그에 평문으로 남는다. 그래서 TTL 60초 · 1회용 ·
   * SSE 전용 티켓을 쓴다. **소진(연결 성립) 즉시 폐기되므로 재연결마다 새로 발급한다.**
   *
   * 401 이면 client.ts 의 인터셉터가 refresh 를 시도하고, 그마저 실패하면 토큰을 비우고
   * 로그인 화면으로 보낸다 (§12.2 4번).
   */
  ticket: async () => {
    const res = await apiClient.post<{ ticket: string; expires_in: number }>('/sse/ticket');
    return res.data;
  },
};
