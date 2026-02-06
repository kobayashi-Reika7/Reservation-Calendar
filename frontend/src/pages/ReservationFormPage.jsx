/**
 * 診察予約入力（Step1）
 * 週表示（月〜金固定・5列）。祝日はバックエンドの isHoliday/reason のみで表示（フロントで祝日判定しない）。
 * 状態: selectedDate（ユーザー選択日）, weekStartDate（表示週の月曜・必ず月曜）。
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import ReservationStepHeader from '../components/ReservationStepHeader';
import Calendar from '../components/Calendar';
import { CATEGORIES, DEPARTMENTS_BY_CATEGORY } from '../constants/masterData';
import { getDepartmentAvailabilityForDate } from '../services/availability';
import appHero from '../assets/app-hero.svg';

const HOSPITAL_NAME = 'さくら総合病院';
const TYPES = ['初診', '再診'];
const MAX_DAYS_AHEAD = 90;

function toDateStr(d) {
  return d.getFullYear()
    + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];

function formatMd(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function formatMdDow(date) {
  return `${formatMd(date)}（${WEEKDAY_JP[date.getDay()]}）`;
}

/** 指定日が属する週の月曜日（0:00） */
function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const offset = day === 0 ? 1 : day === 6 ? 2 : 1 - day;
  return addDays(d, offset);
}

function getAllDepartments() {
  return CATEGORIES.flatMap((c) => (DEPARTMENTS_BY_CATEGORY[c.id] ?? []).map((d) => d.label));
}

function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 表示可能な最初の週の月曜日（今週または来週） */
function getMinWeekStartDate() {
  return getMonday(getToday());
}

export default function ReservationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const editingReservation = location.state?.editingReservation ?? null;
  const editingReservationId = location.state?.editingReservationId ?? null;
  const isEditing = !!location.state?.isEditing;

  const departmentInitial = (editingReservation?.department ?? '').trim();
  const typeInitial = (editingReservation?.purpose ?? '').trim();
  const dateInitial = (editingReservation?.date ?? '').trim();
  const timeInitial = (editingReservation?.time ?? '').trim();

  const [department, setDepartment] = useState(departmentInitial);
  const [type, setType] = useState(TYPES.includes(typeInitial) ? typeInitial : '');
  const [selectedDate, setSelectedDate] = useState(dateInitial);
  const [selectedTime, setSelectedTime] = useState(timeInitial);

  const today = useMemo(() => getToday(), []);
  const minWeekStartDate = useMemo(() => getMinWeekStartDate(), []);
  const maxWeekStartDate = useMemo(() => addDays(today, MAX_DAYS_AHEAD - 4), [today]);

  const [weekStartDate, setWeekStartDate] = useState(() => {
    if (dateInitial) {
      const [y, m, d] = dateInitial.split('-').map(Number);
      if (y && m && d) {
        const parsed = new Date(y, m - 1, d, 0, 0, 0, 0);
        const mon = getMonday(parsed);
        const minMon = getMinWeekStartDate();
        return mon.getTime() < minMon.getTime() ? new Date(minMon) : mon;
      }
    }
    return new Date(minWeekStartDate);
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availByDate, setAvailByDate] = useState({});

  const todayStr = useMemo(() => toDateStr(today), [today]);
  const [currentTimeStr, setCurrentTimeStr] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setCurrentTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 15000); // 15秒間隔（過ぎた時刻の × 表示を早く更新。バックでも「今日の過去時刻」を検証）
    return () => clearInterval(id);
  }, []);

  const departments = useMemo(() => getAllDepartments(), []);

  // 週は常に月〜金の5列（weekStartDate は必ず月曜）
  const weekDates = useMemo(() => [
    new Date(weekStartDate),
    addDays(weekStartDate, 1),
    addDays(weekStartDate, 2),
    addDays(weekStartDate, 3),
    addDays(weekStartDate, 4),
  ], [weekStartDate]);

  const canGoPrevWeek = useMemo(() => {
    return weekStartDate.getTime() > minWeekStartDate.getTime();
  }, [weekStartDate, minWeekStartDate]);

  const canGoNextWeek = useMemo(() => {
    return weekStartDate.getTime() <= maxWeekStartDate.getTime();
  }, [weekStartDate, maxWeekStartDate]);

  const weekRangeLabel = useMemo(() => {
    if (weekDates.length < 5) return '';
    const mon = weekDates[0];
    const fri = weekDates[4];
    return `${mon.getFullYear()}/${mon.getMonth() + 1}/${mon.getDate()}（${WEEKDAY_JP[mon.getDay()]}）〜${fri.getMonth() + 1}/${fri.getDate()}（${WEEKDAY_JP[fri.getDay()]}）`;
  }, [weekDates]);

  // weekStartDate または department が変わったら空き状況を再取得（到着次第で1日ずつ表示）
  useEffect(() => {
    let canceled = false;
    setError('');
    setAvailByDate({});

    if (!department) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const dates = weekDates.map((d) => toDateStr(d));
    let completed = 0;
    const total = dates.length;

    dates.forEach((dateStr) => {
      getDepartmentAvailabilityForDate(department, dateStr)
        .then((r) => {
          if (canceled) return;
          const row = {
            dateStr,
            timeSlots: r.timeSlots ?? [],
            availableDoctorByTime: r.availableDoctorByTime ?? {},
            isHoliday: Boolean(r.isHoliday),
            reason: r.reason ?? null,
          };
          setAvailByDate((prev) => ({ ...prev, [dateStr]: row }));
        })
        .catch(() => {
          if (!canceled) setError('空き状況の取得に一時失敗しました。しばらくしてから再度お試しください。');
        })
        .finally(() => {
          completed += 1;
          if (completed >= total && !canceled) setLoading(false);
        });
    });

    return () => { canceled = true; };
  }, [department, weekStartDate, weekDates]);

  const timeSlots = useMemo(() => {
    const first = weekDates[0] ? toDateStr(weekDates[0]) : '';
    const fromFirst = first && availByDate[first]?.timeSlots;
    if (Array.isArray(fromFirst) && fromFirst.length > 0) return fromFirst;
    const slots = [];
    for (let h = 9; h < 17; h++) {
      for (const m of [0, 15, 30, 45]) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, [availByDate, weekDates]);

  const canProceed = Boolean(department && type && selectedDate && selectedTime);

  const isSlotAvailable = (dateStr, time) => {
    const row = availByDate[dateStr];
    if (row?.isHoliday) return false;
    if (dateStr < todayStr) return false;
    if (dateStr === todayStr && time <= currentTimeStr) return false;
    return !!row?.availableDoctorByTime?.[time];
  };

  const handleCellClick = (dateStr, time) => {
    if (!isSlotAvailable(dateStr, time)) return;
    setSelectedDate(dateStr);
    setSelectedTime(time);
    setError('');
  };

  const handlePrevWeek = () => {
    if (!canGoPrevWeek || loading) return;
    setWeekStartDate(addDays(weekStartDate, -7));
  };

  const handleNextWeek = () => {
    if (!canGoNextWeek || loading) return;
    setWeekStartDate(addDays(weekStartDate, 7));
  };

  const handleCalendarSelect = (date) => {
    if (!date) return;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const mon = getMonday(d);
    const minMon = getMinWeekStartDate();
    setWeekStartDate(mon.getTime() < minMon.getTime() ? new Date(minMon) : mon);
    setCalendarOpen(false);
  };

  const handleConfirm = () => {
    if (!canProceed) return;
    setError('');
    if (!isSlotAvailable(selectedDate, selectedTime)) {
      setError('この時間は現在ご予約いただけません。別の日時をお選びください。');
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

  const calendarSelectedDate = useMemo(() => {
    if (selectedDate) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return y && m && d ? new Date(y, m - 1, d) : new Date(weekStartDate);
    }
    return new Date(weekStartDate);
  }, [selectedDate, weekStartDate]);

  return (
    <div className="page page-reservation-form">
      <Breadcrumb
        items={[
          { label: 'Top', to: '/' },
          { label: 'メニュー', to: '/menu' },
          { label: '診察予約' },
        ]}
      />
      <ReservationStepHeader currentStep={1} />

      <main className="reservation-form-main">
        <header className="reservation-form-head">
          <div className="reservation-form-hero">
            <img src={appHero} alt="" className="reservation-form-hero-img app-hero-img" width="160" height="80" />
          </div>
          <p className="reservation-form-hospital">
            <span aria-hidden>🏥</span> {HOSPITAL_NAME}
          </p>
          <h2 className="reservation-form-title reservation-form-title-lead">
            診療科目・日時を選んで<br />かんたん予約
          </h2>
          <p className="reservation-form-lead">ご希望の診療科と日時を選んでください。</p>
        </header>

        {error && <p className="page-error page-error-friendly" role="alert">{error}</p>}

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
          <p className="reservation-form-label">選択した診療科目の種別をお選びください</p>
          <p className="reservation-form-hint">※ 診療科目ごとに初診・再診を選択してください。</p>
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
          {type && (
            <p className="reservation-form-type-desc" aria-live="polite">
              {type === '初診' ? '当院で初めて受診する診療科目です' : '当院で過去に受診したことがある診療科目です'}
            </p>
          )}
        </section>

        <section className="reservation-form-section">
          {/* 現在選択中の条件（lead の直下・subtitle より上） */}
          <div className="reservation-form-selected" role="status" aria-live="polite">
            {selectedDate && selectedTime ? (
              <span className="reservation-form-selected-item">
                選択日時：{formatMdDow(
                  (() => {
                    const [y, m, d] = selectedDate.split('-').map(Number);
                    return new Date(y, m - 1, d);
                  })()
                )}{selectedTime}
              </span>
            ) : (
              <span className="reservation-form-selected-empty">未選択</span>
            )}
          </div>

          <h3 className="reservation-form-subtitle">予約可能な日時を選んでください</h3>
          <p className="reservation-form-hint">○：ご予約可　×：ご予約不可（祝日・満枠など）</p>

          {/* 週切り替えナビ: ＜ 前週   2026/2/9(月)〜2/13(金)   翌週 ＞ */}
          <div className="reservation-form-date-nav" aria-label="週の切り替え">
            <button
              type="button"
              className="reservation-form-date-nav-btn"
              onClick={handlePrevWeek}
              disabled={!canGoPrevWeek || loading}
              aria-label="前週"
            >
              ‹ 前週
            </button>
            <button
              type="button"
              className="reservation-form-date-nav-center reservation-form-date-nav-range"
              onClick={() => setCalendarOpen(true)}
              disabled={loading}
              aria-label="日付を選択"
              title={weekRangeLabel || undefined}
            >
              日付選択
            </button>
            <button
              type="button"
              className="reservation-form-date-nav-btn"
              onClick={handleNextWeek}
              disabled={!canGoNextWeek || loading}
              aria-label="翌週"
            >
              翌週 ›
            </button>
          </div>

          {!department ? (
            <p className="page-muted">まず診療科目を選択してください。</p>
          ) : loading && Object.keys(availByDate).length === 0 ? (
            <p className="page-muted">空き状況を読み込み中…</p>
          ) : (
            <div className="reservation-grid-wrap" role="region" aria-label="勤務日の予約枠">
              <table className="reservation-grid" aria-label="予約枠一覧（週間・月〜金）">
                <thead>
                  <tr>
                    <th className="reservation-grid-th reservation-grid-th-time">時間</th>
                    {weekDates.map((d) => {
                      const dateStr = toDateStr(d);
                      const row = availByDate[dateStr];
                      const isHoliday = Boolean(row?.isHoliday);
                      const isToday = dateStr === toDateStr(today);
                      const isSelected = selectedDate === dateStr;
                      return (
                        <th
                          key={dateStr}
                          className={`reservation-grid-th ${isToday ? 'reservation-grid-th-today' : ''} ${isSelected ? 'reservation-grid-th-selected' : ''} ${isHoliday ? 'reservation-grid-th-holiday' : ''}`}
                        >
                          <span className="reservation-grid-th-md">{formatMd(d)}（{WEEKDAY_JP[d.getDay()]}）</span>
                          {/* 祝日は「今日」バッジと同じ位置に赤文字。今日と祝日は排他的でない（祝日優先表示） */}
                          {isHoliday && (
                            <span className="reservation-grid-th-badge reservation-grid-th-badge-holiday">祝日</span>
                          )}
                          {!isHoliday && isToday && (
                            <span className="reservation-grid-th-badge">今日</span>
                          )}
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
                        const isHoliday = Boolean(row?.isHoliday);
                        const isPastDate = dateStr < todayStr;
                        const isTodaySlotPast = dateStr === todayStr && t <= currentTimeStr;
                        const available = isSlotAvailable(dateStr, t);
                        const selected = selectedDate === dateStr && selectedTime === t;
                        const reasonUnavailable = isHoliday
                          ? '祝日のため予約不可'
                          : isPastDate
                            ? '過去日のため予約不可'
                            : isTodaySlotPast
                              ? '時刻を過ぎているため予約不可'
                              : '予約不可';
                        return (
                          <td key={dateStr} className={`reservation-grid-td ${isHoliday ? 'reservation-grid-td-holiday' : ''}`}>
                            <button
                              type="button"
                              className={`reservation-grid-cell ${available ? 'reservation-grid-cell-ok' : 'reservation-grid-cell-ng'} ${selected ? 'reservation-grid-cell-selected' : ''} ${isHoliday ? 'reservation-grid-cell-holiday' : ''}`}
                              onClick={() => handleCellClick(dateStr, t)}
                              disabled={!available}
                              aria-label={`${formatMd(d)}（${WEEKDAY_JP[d.getDay()]}）${t} ${available ? '予約可能' : reasonUnavailable}`}
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

        </section>

        <footer className="reservation-form-footer">
          <button
            type="button"
            className="btn btn-primary btn-nav reservation-form-confirm"
            disabled={!canProceed || loading}
            onClick={handleConfirm}
          >
            内容を確認する
          </button>
        </footer>
      </main>

      {calendarOpen && (
        <div
          className="reservation-form-calendar-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="予約日を選択"
        >
          <div className="reservation-form-calendar-wrap">
            <Calendar
              key={`${weekStartDate.getFullYear()}-${weekStartDate.getMonth()}`}
              selectedDate={calendarSelectedDate}
              onSelectDate={handleCalendarSelect}
              reservedDates={new Set()}
            />
            <button
              type="button"
              className="btn btn-secondary reservation-form-calendar-close"
              onClick={() => setCalendarOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
