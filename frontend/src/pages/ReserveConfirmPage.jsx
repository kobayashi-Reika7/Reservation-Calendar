/**
 * 予約確認画面
 * 「この内容で予約しますか？」が一目で分かるカード表示。
 * 担当医は表示しない。変更時は元の予約を削除してからバックエンドAPIで新規作成（安全設計）。
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import Breadcrumb from '../components/Breadcrumb';
import ReservationStepHeader from '../components/ReservationStepHeader';
import { createReservationApi } from '../services/backend';
import { deleteReservation } from '../services/reservation';

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
    time,
    isEditing,
    editingReservationId,
  } = state;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    if (!user?.uid || !selectedDate || !time || !department) {
      setError('予約情報が不足しています。');
      return;
    }
    const payload = {
      department: department ?? '',
      date: selectedDate,
      time,
    };
    // 調査用: 確定時のペイロード（本番では削除可）
    if (typeof console !== 'undefined' && console.log) {
      console.log('confirm payload', payload);
    }
    setError('');
    setLoading(true);
    try {
      if (isEditing && editingReservationId) {
        await deleteReservation(user.uid, editingReservationId);
      }
      const idToken = await user.getIdToken();
      await createReservationApi(idToken, payload);
      setDone(true);
    } catch (err) {
      setError(err?.message ?? '予約を確定できませんでした。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDate || !time) {
    return (
      <div className="page">
        <ReservationStepHeader currentStep={3} />
        <Breadcrumb
          items={[
            { label: 'Top', to: '/' },
            { label: 'メニュー', to: '/menu' },
            { label: '診察予約', to: '/reserve/form' },
            { label: '予約確認' },
          ]}
        />
        <p className="page-error">予約内容がありません。</p>
        <div className="btn-wrap-center">
          <button type="button" className="btn btn-secondary btn-nav" onClick={() => navigate('/reserve/form')}>
            診察予約に戻る
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="page page-confirm-done">
        <Breadcrumb
          items={[
            { label: 'Top', to: '/' },
            { label: 'メニュー', to: '/menu' },
            { label: isEditing ? '予約一覧' : '診察予約', to: isEditing ? '/reservations' : '/reserve/form' },
            { label: '完了' },
          ]}
        />
        <ReservationStepHeader currentStep={3} />
        <h1 className="page-title confirm-done-title">
          {isEditing ? '変更が完了しました' : '予約が完了しました'}
        </h1>
        <div className="confirm-card">
          <p><span className="confirm-label">日付</span> {selectedDate}</p>
          <p><span className="confirm-label">時間</span> {time}</p>
          <p><span className="confirm-label">診療科</span> {department}</p>
          <p><span className="confirm-label">種別</span> {purpose}</p>
          <p className="confirm-note">担当医は自動で割り当てられます。</p>
        </div>
        <div className="btn-wrap-center">
          <button
            type="button"
            className="btn btn-primary btn-nav"
            onClick={() => navigate(isEditing ? '/reservations' : '/reserve/form')}
          >
            {isEditing ? '予約一覧へ' : '診察予約に戻る'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-reserve-confirm">
      <Breadcrumb
        items={[
          { label: 'Top', to: '/' },
          { label: 'メニュー', to: '/menu' },
          { label: isEditing ? '予約一覧' : '診察予約', to: isEditing ? '/reservations' : '/reserve/form' },
          { label: '予約確認' },
        ]}
      />
      <ReservationStepHeader currentStep={3} />
      <h1 className="page-title confirm-question">この内容で予約しますか？</h1>

      <div className="confirm-card">
        <p><span className="confirm-label">日付</span> {selectedDate}</p>
        <p><span className="confirm-label">時間</span> {time}</p>
        {category ? <p><span className="confirm-label">大分類</span> {category}</p> : null}
        <p><span className="confirm-label">診療科</span> {department}</p>
        <p><span className="confirm-label">種別</span> {purpose}</p>
        <p className="confirm-note">担当医は自動で割り当てられます。</p>
      </div>

      {error && (
        <div className="confirm-error-wrap" role="alert">
          <p className="page-error">{error}</p>
        </div>
      )}

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
            className="btn btn-secondary btn-nav"
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
