/**
 * トップページ（ログイン前の公開ページ）
 * さくら総合病院の案内・診療科・診療時間・Web予約入口
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { CATEGORIES, DEPARTMENTS_BY_CATEGORY, getTimeSlots } from '../constants/masterData';
import appHero from '../assets/app-hero.svg';

const HOSPITAL_NAME = 'さくら総合病院';
const CATCH_COPY = '地域の皆様の健やかな暮らしを支えます';
const INTRO = '内科からリハビリまで幅広い診療科を備えた総合病院です。安心してご来院ください。';
const TOP_LEAD = '診療科・日時を選んで、かんたんにWeb予約ができます。';

function formatTime(t) {
  return String(t || '').replace(/^0/, '');
}

function addMinutes(timeStr, minutes) {
  const m = String(timeStr || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return timeStr;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  const total = h * 60 + mm + minutes;
  const hh2 = Math.floor(total / 60);
  const mm2 = total % 60;
  return `${String(hh2).padStart(2, '0')}:${String(mm2).padStart(2, '0')}`;
}

function TopPage() {
  const navigate = useNavigate();
  const user = useAuth();

  const timeSlots = getTimeSlots();
  const firstSlot = timeSlots[0] ?? '09:00';
  const lastSlot = timeSlots[timeSlots.length - 1] ?? '16:45';
  const endTime = addMinutes(lastSlot, 15);
  const WEB_HOURS = `${formatTime(firstSlot)}〜${formatTime(endTime)}`;

  const HOURS = [
    { label: 'Web予約枠', time: WEB_HOURS },
    { label: '休診日', time: '土日祝' },
    { label: '備考', time: '診療科・担当医の勤務状況により、表示される枠が異なります。' },
  ];

  const handleReserve = () => {
    // 「Web予約はこちら」→ 未ログインはログイン画面へ、ログイン済みはメニューへ
    if (user) {
      navigate('/menu', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  const departmentsList = CATEGORIES.flatMap((c) =>
    (DEPARTMENTS_BY_CATEGORY[c.id] || []).map((d) => ({ category: c.label, name: d.label }))
  );

  return (
    <div className="page top-page">
      <header className="top-header">
        <div className="top-hero">
          <img src={appHero} alt="" className="top-hero-img app-hero-img" width="160" height="80" />
        </div>
        <h1 className="top-title">{HOSPITAL_NAME}</h1>
        <p className="top-catch">{CATCH_COPY}</p>
        <p className="top-lead">{TOP_LEAD}</p>
      </header>

      <section className="top-intro">
        <p className="top-intro-text">{INTRO}</p>
      </section>

      <section className="top-section">
        <h2 className="top-section-title">
          <span className="top-section-icon" aria-hidden>📋</span>
          診療科一覧
        </h2>
        <ul className="top-dept-list">
          {departmentsList.map((d, i) => (
            <li key={i} className="top-dept-item">
              <span className="top-dept-cat">{d.category}</span>
              <span className="top-dept-name">{d.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="top-section">
        <h2 className="top-section-title">
          <span className="top-section-icon" aria-hidden>⏰</span>
          診療時間
        </h2>
        <dl className="top-hours">
          {HOURS.map((h) => (
            <React.Fragment key={h.label}>
              <dt className="top-hours-dt">{h.label}</dt>
              <dd className="top-hours-dd">{h.time}</dd>
            </React.Fragment>
          ))}
        </dl>
      </section>

      <footer className="top-footer">
        <button
          type="button"
          className="btn btn-primary btn-nav top-reserve-btn"
          onClick={handleReserve}
        >
          {user ? '予約メニューへ' : 'Web予約はこちら（ログイン）'}
        </button>
      </footer>
    </div>
  );
}

export default TopPage;
