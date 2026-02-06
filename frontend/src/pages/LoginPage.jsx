/**
 * ログイン画面
 * メール・パスワードでログイン。成功後は MenuPage（予約メニュー）へ遷移
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import ReservationStepHeader from '../components/ReservationStepHeader';
import { TextField } from '../components/InputForm';
import { syncMe } from '../services/backend';
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
      // Firebase Auth でログイン（認証は Firebase に一本化）
      const cred = await login(email.trim(), password);
      // バックエンドへ「ログイン済みユーザー情報」を同期（失敗してもログインは継続）
      try {
        const token = await cred.user.getIdToken();
        await syncMe(token);
      } catch {
        // バックエンド未起動/管理者SDK未設定でも、ログインは継続する
      }
      navigate('/menu', { replace: true });
    } catch (err) {
      const code = err?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('メールアドレスかパスワードが違います。');
      } else if (code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません。');
      } else {
        setError('ログインできませんでした。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-login auth-page">
      <Breadcrumb
        items={[
          { label: 'Top', to: '/' },
          { label: 'ログイン' },
        ]}
      />
      <ReservationStepHeader currentStep={2} />
      <span className="page-hero-icon" aria-hidden>🏥</span>
      <div className="auth-header">
        <h1 className="auth-app-title">診療予約</h1>
        <p className="auth-app-lead">ログイン後、予約の入力・確認ができます</p>
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
          <div className="auth-submit-wrap">
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </div>
        </form>
        <p className="auth-switch">アカウントをお持ちでない方は<p></p><Link to="/signup">新規登録</Link></p>
      </div>
    </div>
  );
}

export default LoginPage;
