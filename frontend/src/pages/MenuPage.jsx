/**
 * 予約メニュー画面（ログイン後の最初の画面）
 * 「予約する」「予約確認」の2択で迷いを防ぐ。ログアウト可能。
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import { logout } from '../services/auth';

const HOSPITAL_NAME = 'さくら総合病院';

function MenuPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="page page-menu">
      <Breadcrumb
        items={[
          { label: 'Top', to: '/' },
          { label: 'メニュー' },
        ]}
      />

      <header className="menu-header">
        <span className="page-hero-icon" aria-hidden>🏥</span>
        <h1 className="page-title menu-title">{HOSPITAL_NAME}｜診察予約</h1>
        <p className="menu-lead">
          新規予約・予約確認ができます。
        </p>
      </header>

      <div className="menu-buttons">
        <button
          type="button"
          className="menu-btn menu-btn-primary"
          onClick={() => navigate('/reserve/form')}
        >
          <span className="menu-btn-icon" aria-hidden>1️⃣</span>
          <span className="menu-btn-text">予約する</span>
          <span className="menu-btn-sub">新規予約を行う</span>
        </button>
        <button
          type="button"
          className="menu-btn menu-btn-secondary"
          onClick={() => navigate('/reservations')}
        >
          <span className="menu-btn-icon" aria-hidden>2️⃣</span>
          <span className="menu-btn-text">予約を確認する</span>
          <span className="menu-btn-sub">自分の予約一覧を確認</span>
        </button>
      </div>
      <div className="menu-logout">
        <button type="button" className="btn btn-text" onClick={handleLogout}>
          ログアウト
        </button>
      </div>
    </div>
  );
}

export default MenuPage;
