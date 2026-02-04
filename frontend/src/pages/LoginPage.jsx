/**
 * ログイン画面
 * メール・パスワードでログイン。成功後は CalendarPage へ遷移
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField } from '../components/InputForm';
import { login } from '../services/auth';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/calendar', { replace: true });
    } catch (err) {
      const code = err?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('メールアドレスまたはパスワードが正しくありません。');
      } else if (code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません。');
      } else {
        setError(err?.message ?? 'ログインに失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-login auth-page">
      <div className="auth-header">
        <h1 className="auth-app-title">診療予約</h1>
        <p className="auth-app-lead">日付を選んで、かんたん予約</p>
      </div>
      <div className="auth-card">
        <h2 className="auth-card-title">ログイン</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="page-error auth-error" role="alert">{error}</p>}
          <TextField
            label="メールアドレス"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="example@email.com"
            autoComplete="email"
            required
          />
          <TextField
            label="パスワード"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="パスワード"
            autoComplete="current-password"
            required
          />
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>
        <p className="auth-switch">
          アカウントをお持ちでない方は <Link to="/signup">新規登録</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
