/**
 * 新規ユーザー登録画面
 * メール・パスワードで登録。成功後はログイン状態になるため CalendarPage へ遷移
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextField } from '../components/InputForm';
import { signup } from '../services/auth';

function SignupPage() {
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
    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください。');
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim(), password);
      navigate('/calendar', { replace: true });
    } catch (err) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています。');
      } else if (code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません。');
      } else if (code === 'auth/weak-password') {
        setError('パスワードは6文字以上にしてください。');
      } else {
        setError(err?.message ?? '登録に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page page-signup">
      <h1 className="page-title">新規登録</h1>
      <form onSubmit={handleSubmit} className="page-form">
        {error && <p className="page-error" role="alert">{error}</p>}
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
          placeholder="6文字以上"
          autoComplete="new-password"
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '登録中…' : '登録'}
        </button>
      </form>
      <p className="page-link">
        <Link to="/login">ログインはこちら</Link>
      </p>
    </div>
  );
}

export default SignupPage;
