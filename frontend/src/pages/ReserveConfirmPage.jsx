/**
 * 予約確認画面
 * 内容確認後、Firestore に予約を保存し、完了メッセージを表示
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
    doctorName,
    slot,
  } = state;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    if (!user?.uid || !selectedDate || !slot) {
      setError('予約情報が不足しています。');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createReservation({
        userId: user.uid,
        date: selectedDate,
        slot,
        category: category ?? '',
        department: department ?? '',
        purpose: purpose ?? '',
        doctorName: doctorName ?? '',
      });
      setDone(true);
    } catch (err) {
      setError(err?.message ?? '予約の保存に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDate || !slot) {
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
        <h1 className="page-title">予約が完了しました</h1>
        <div className="confirm-summary">
          <p><strong>日付:</strong> {selectedDate}</p>
          <p><strong>時間:</strong> {slot}</p>
          <p><strong>大分類:</strong> {category}</p>
          <p><strong>診療科:</strong> {department}</p>
          <p><strong>目的:</strong> {purpose}</p>
          <p><strong>担当医:</strong> {doctorName}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/calendar')}>
          カレンダーに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="page page-reserve-confirm">
      <h1 className="page-title">予約内容の確認</h1>
      <div className="confirm-summary">
        <p><strong>日付:</strong> {selectedDate}</p>
        <p><strong>時間:</strong> {slot}</p>
        <p><strong>大分類:</strong> {category}</p>
        <p><strong>診療科:</strong> {department}</p>
        <p><strong>目的:</strong> {purpose}</p>
        <p><strong>担当医:</strong> {doctorName}</p>
      </div>
      {error && <p className="page-error" role="alert">{error}</p>}
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleConfirm}
        disabled={loading}
      >
        {loading ? '保存中…' : '予約を確定する'}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => navigate(-1)}
        disabled={loading}
      >
        戻る
      </button>
    </div>
  );
}

export default ReserveConfirmPage;
