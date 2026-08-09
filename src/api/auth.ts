import { apiClient } from './client';
import type { AuthMeResponse, User } from '../types';

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>('/auth/login', { email, password });
    return res.data;
  },

  signup: async (data: {
    email: string;
    password: string;
    name: string;
    language: 'ko' | 'en';
    timezone: string;
  }) => {
    const res = await apiClient.post<User>('/auth/signup', data);
    return res.data;
  },

  me: async () => {
    const res = await apiClient.get<AuthMeResponse>('/auth/me');
    return res.data;
  },
};
