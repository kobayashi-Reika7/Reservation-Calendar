/**
 * バックエンド API 呼び出し
 * 認証は Firebase に一本化し、バックエンドには「ログイン済みユーザー情報」を同期する
 */
const getBaseUrl = () => import.meta.env.VITE_API_BASE ?? 'http://localhost:8001';

/**
 * Firebase IDトークンを使って /users/me を呼び、バックエンドへユーザー情報を同期する
 * @param {string} idToken
 * @returns {Promise<{ uid: string, email: string }>}
 */
export async function syncMe(idToken) {
  const res = await fetch(`${getBaseUrl()}/users/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail ?? 'ユーザー同期に失敗しました。');
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return data;
}
