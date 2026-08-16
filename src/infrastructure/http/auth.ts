import { http } from './client';
import type { AuthMeResponse, User } from '../../types';

export const authApi = {
  login: (email: string, password: string) =>
    http.post<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      email,
      password,
    }),

  signup: (data: {
    email: string;
    password: string;
    name: string;
    language: 'ko' | 'en';
    timezone: string;
  }) => http.post<User>('/auth/signup', data),

  me: () => http.get<AuthMeResponse>('/auth/me'),
};
