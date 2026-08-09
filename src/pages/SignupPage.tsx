import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { AuthShell, authInput } from '../components/auth/AuthShell';

export function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authApi.signup({
        ...form,
        language: 'ko',
        // 브리핑·방해금지 판정이 담당자 타임존을 따르므로 실제 타임존을 그대로 보낸다.
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const res = await authApi.login(form.email, form.password);
      await login(res.access_token, res.refresh_token, res.user);
      navigate('/projects/new');
    } catch {
      setError('가입에 실패했습니다. 이미 사용 중인 이메일인지 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="가입하기" caption="질문은 남기고, 답은 AI가 먼저 준비합니다">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          value={form.name}
          onChange={set('name')}
          placeholder="이름"
          required
          maxLength={100}
          className={authInput}
        />
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="이메일"
          autoComplete="email"
          required
          className={authInput}
        />
        <input
          type="password"
          value={form.password}
          onChange={set('password')}
          placeholder="비밀번호 (8자 이상)"
          autoComplete="new-password"
          required
          minLength={8}
          className={authInput}
        />
        {error && <p className="text-[12px] font-bold text-danger">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy && <Loader2 className="size-3.5 animate-spin" />} 가입하기
        </Button>
      </form>
      <p className="mt-4 text-center text-[12px] text-ink-muted">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-bold text-brand-deep">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
