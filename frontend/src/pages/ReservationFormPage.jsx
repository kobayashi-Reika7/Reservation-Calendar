/**
 * 診察予約入力（Step1）
 * - 大分類なし → 診療科目のみ
 * - 種別：初診 / 再診
 * - 予約表：1週間 × 15分刻み（9:00〜17:00）
 * - ○：予約可能 / ×：予約不可
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import ReservationStepHeader from '../components/ReservationStepHeader';
import { CATEGORIES, DEPARTMENTS_BY_CATEGORY } from '../constants/masterData';
import { getDepartmentAvailabilityForDate } from '../services/availability';

const HOSPITAL_NAME = 'さくら総合病院';
const TYPES = ['初診', '再診'];

function toDateStr(d) {
  return d.getFullYear()
    + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];

function formatMd(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function getAllDepartments() {
  return CATEGORIES.flatMap((c) => (DEPARTMENTS_BY_CATEGORY[c.id] ?? []).map((d) => d.label));
}

export default function ReservationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const editingReservation = location.state?.editingReservation ?? null;
  const editingReservationId = location.state?.editingReservationId ?? null;
  const isEditing = !!location.state?.isEditing;

  const departmentInitial = (editingReservation?.department ?? '').trim();
  const typeInitial = (editingReservation?.purpose ?? '').trim(); // 既存データ互換: purpose に種別を入れる
  const dateInitial = (editingReservation?.date ?? '').trim();
  const timeInitial = (editingReservation?.time ?? '').trim();

  const [department, setDepartment] = useState(departmentInitial);
  const [type, setType] = useState(TYPES.includes(typeInitial) ? typeInitial : '');
  const [selectedDate, setSelectedDate] = useState(dateInitial);
  const [selectedTime, setSelectedTime] = useState(timeInitial);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availByDate, setAvailByDate] = useState({});

  const departments = useMemo(() => getAllDepartments(), []);

  const startDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)),
    [startDate]
  );

  // 診療科が決まったら、今週（今日〜7日）の空き状況を取得
  useEffect(() => {
    let canceled = false;
    setError('');
    setAvailByDate({});
    setSelectedDate((d) => d); // keep
    setSelectedTime((t) => t); // keep

    if (!department) return;
    setLoading(true);

    const dates = weekDates.map((d) => toDateStr(d));
    Promise.all(
      dates.map((dateStr) => getDepartmentAvailabilityForDate(department, dateStr).then((r) => ({ dateStr, ...r })))
    )
      .then((rows) => {
        if (canceled) return;
        const next = {};
        rows.forEach((r) => { next[r.dateStr] = r; });
        setAvailByDate(next);
      })
      .catch(() => {
        if (canceled) return;
        setError('空き状況の取得に失敗しました。しばらくしてから再度お試しください。');
      })
      .finally(() => {
        if (canceled) return;
        setLoading(false);
      });

    return () => { canceled = true; };
  }, [department, weekDates]);

  const timeSlots = useMemo(() => {
    const first = weekDates[0] ? toDateStr(weekDates[0]) : '';
    const fromFirst = first && availByDate[first]?.timeSlots;
    if (Array.isArray(fromFirst) && fromFirst.length > 0) return fromFirst;
    // 取得前でも「表の骨格」を見せる（9:00〜17:00 15分刻みを想定）
    const slots = [];
    for (let h = 9; h < 17; h++) {
      for (const m of [0, 15, 30, 45]) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, [availByDate, weekDates]);

  const canProceed = Boolean(department && type && selectedDate && selectedTime);

  const handleCellClick = (dateStr, time) => {
    const row = availByDate[dateStr];
    const available = !!row?.availableDoctorByTime?.[time];
    if (!available) return;
    setSelectedDate(dateStr);
    setSelectedTime(time);
    setError('');
  };

  const handleConfirm = () => {
    if (!canProceed) return;
    setError('');
    const available = !!availByDate[selectedDate]?.availableDoctorByTime?.[selectedTime];
    if (!available) {
      setError('この時間は現在予約できません。別の時間をお選びください。');
      return;
    }
    navigate('/reserve/confirm', {
      state: {
        selectedDate,
        time: selectedTime,
        category: '',
        department,
        purpose: type,
        isEditing: isEditing || undefined,
        editingReservationId: editingReservationId || undefined,
      },
    });
  };

  return (
    <div className="page page-reservation-form">
      <ReservationStepHeader currentStep={1} title="診療予約" />

      <Breadcrumb
        items={[
          { label: 'Top', to: '/' },
          { label: '診察予約', to: '/menu' },
          { label: '診察予約' },
        ]}
      />

      <main className="reservation-form-main">
        <header className="reservation-form-head">
          <p className="reservation-form-hospital">
            <span aria-hidden>🏥</span> {HOSPITAL_NAME}
          </p>
          <h2 className="reservation-form-title">診察予約入力</h2>
          <p className="page-lead reservation-form-lead">診療科目・種別を選んで、予約枠（○）をタップしてください。</p>
        </header>

        {error && <p className="page-error" role="alert">{error}</p>}

        <section className="reservation-form-section">
          <label className="reservation-form-label" htmlFor="reservation-dept">
            診療科目を選択してください
          </label>
          <select
            id="reservation-dept"
            className="reservation-form-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">選択してください</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </section>

        <section className="reservation-form-section">
          <p className="reservation-form-label">種別をお選びください</p>
          <div className="reservation-form-type-buttons" role="group" aria-label="種別">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`reservation-form-type-btn ${type === t ? 'reservation-form-type-btn-selected' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="reservation-form-section">
          <h3 className="reservation-form-subtitle">予約可能時間（○：予約可 / ×：不可）</h3>

          {!department ? (
            <p className="page-muted">まず診療科目を選択してください。</p>
          ) : loading ? (
            <p className="page-muted">空き状況を読み込み中…</p>
          ) : (
            <div className="reservation-grid-wrap" role="region" aria-label="1週間の予約枠">
              <table className="reservation-grid" aria-label="予約枠一覧（1週間）">
                <thead>
                  <tr>
                    <th className="reservation-grid-th reservation-grid-th-time">時間</th>
                    {weekDates.map((d) => {
                      const dateStr = toDateStr(d);
                      return (
                        <th key={dateStr} className="reservation-grid-th">
                          <span className="reservation-grid-th-dow">{WEEKDAY_JP[d.getDay()]}</span>
                          <span className="reservation-grid-th-md">{formatMd(d)}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((t) => (
                    <tr key={t}>
                      <td className="reservation-grid-td reservation-grid-td-time">{t}</td>
                      {weekDates.map((d) => {
                        const dateStr = toDateStr(d);
                        const row = availByDate[dateStr];
                        const available = !!row?.availableDoctorByTime?.[t];
                        const selected = selectedDate === dateStr && selectedTime === t;
                        return (
                          <td key={dateStr} className="reservation-grid-td">
                            <button
                              type="button"
                              className={`reservation-grid-cell ${available ? 'reservation-grid-cell-ok' : 'reservation-grid-cell-ng'} ${selected ? 'reservation-grid-cell-selected' : ''}`}
                              onClick={() => handleCellClick(dateStr, t)}
                              disabled={!available}
                              aria-label={`${formatMd(d)} ${WEEKDAY_JP[d.getDay()]} ${t} ${available ? '予約可能' : '予約不可'}`}
                            >
                              {available ? '○' : '×'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedDate && selectedTime && (
            <p className="reservation-form-selected" role="status">
              選択中：<strong>{selectedDate}</strong> {selectedTime}
            </p>
          )}
        </section>

        <footer className="reservation-form-footer">
          <button
            type="button"
            className="btn btn-primary btn-nav reservation-form-confirm"
            disabled={!canProceed || loading}
            onClick={handleConfirm}
          >
            予約内容確認へ
          </button>
        </footer>
      </main>
    </div>
  );
}

