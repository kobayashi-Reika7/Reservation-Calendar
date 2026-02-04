/**
 * 予約確認画面
 * 「この内容で予約しますか？」が一目で分かるカード表示。
 * 修正する / 予約を確定する を明確に分け、保存中はローディング表示。
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { createReservation } from '../services/reservation';

function ReserveConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth();
  const state = location.state ?? {};
  const {
    selectedDate,
    category,
    department,
    purpose,
    doctor,
    time,
  } = state;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    if (!user?.uid || !selectedDate || !time) {
      setError('予約情報が不足しています。');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createReservation(user.uid, {
        date: selectedDate,
        time,
        category: category ?? '',
        department: department ?? '',
        purpose: purpose ?? '',
        doctor: doctor ?? '',
      });
      setDone(true);
    } catch (err) {
      setError(err?.message ?? '予約の保存に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDate || !time) {
    return (
      <div className="page">
        <p className="page-error">予約内容がありません。</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/calendar')}>
          カレンダーに戻る
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="page page-confirm-done">
        <h1 className="page-title confirm-done-title">予約が完了しました</h1>
        <div className="confirm-card">
          <p><span className="confirm-label">日付</span> {selectedDate}</p>
          <p><span className="confirm-label">時間</span> {time}</p>
          <p><span className="confirm-label">診療科</span> {department}</p>
          <p><span className="confirm-label">目的</span> {purpose}</p>
          <p><span className="confirm-label">担当医</span> {doctor}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/calendar')}>
          カレンダーに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="page page-reserve-confirm">
      <h1 className="page-title confirm-question">この内容で予約しますか？</h1>

      <div className="confirm-card">
        <p><span className="confirm-label">日付</span> {selectedDate}</p>
        <p><span className="confirm-label">時間</span> {time}</p>
        <p><span className="confirm-label">大分類</span> {category}</p>
        <p><span className="confirm-label">診療科</span> {department}</p>
        <p><span className="confirm-label">目的</span> {purpose}</p>
        <p><span className="confirm-label">担当医</span> {doctor}</p>
      </div>

      {error && <p className="page-error" role="alert">{error}</p>}

      {loading ? (
        <div className="confirm-loading" aria-live="polite">
          <span className="confirm-loading-spinner" aria-hidden="true" />
          <span>保存中…</span>
        </div>
      ) : (
        <div className="confirm-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
          >
            予約を確定する
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            修正する
          </button>
        </div>
      )}
    </div>
  );
}

export default ReserveConfirmPage;
