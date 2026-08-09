import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../infrastructure/http/auth';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { AuthShell, authInput } from '../components/auth/AuthShell';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      await login(res.access_token, res.refresh_token, res.user);
      navigate('/');
    } catch {
      // error.message 는 개발자용이다 — 사용자에게는 프론트 문안을 보여준다 (§1.5)
      setError('이메일 또는 비밀번호를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="로그인" caption="담당자를 기다리지 않고, 먼저 답을 받는 곳">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          autoComplete="email"
          required
          className={authInput}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoComplete="current-password"
          required
          className={authInput}
        />
        {error && <p className="text-[12px] font-bold text-danger">{error}</p>}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy && <Loader2 className="size-3.5 animate-spin" />} 로그인
        </Button>
      </form>
      <p className="mt-4 text-center text-[12px] text-ink-muted">
        계정이 없으신가요?{' '}
        <Link to="/signup" className="font-bold text-brand-deep">
          가입하기
        </Link>
      </p>
    </AuthShell>
  );
}
