/**
 * バックエンド API 呼び出し
 * 新規登録・ログイン照合をバックエンド DB に対して行う
 */
const getBaseUrl = () => import.meta.env.VITE_API_BASE ?? 'http://localhost:8001';

/**
 * 新規登録（バックエンド DB にユーザーを格納）
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ id: number, email: string }>}
 */
export async function backendSignup(email, password) {
  const res = await fetch(`${getBaseUrl()}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail ?? '登録に失敗しました。');
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data;
}

/**
 * ログイン照合（バックエンド DB でメール・パスワードを検証）
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ id: number, email: string }>}
 */
export async function backendLogin(email, password) {
  const res = await fetch(`${getBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail ?? 'ログインに失敗しました。');
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data;
}
