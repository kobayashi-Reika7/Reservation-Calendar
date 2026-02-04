/**
 * カレンダー本体（月表示）
 * 過去日は選択不可。土曜=青・日祝=赤で表示
 */
import React, { useState, useEffect } from 'react';

/** 日本の祝日かどうか（簡易判定：固定祝日＋国民の休日） */
function isJapaneseHoliday(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const fixed = [
    [1, 1],   // 元日
    [2, 11],  // 建国記念の日
    [4, 29],  // 昭和の日
    [5, 3],   // 憲法記念日
    [5, 4],   // みどりの日
    [5, 5],   // こどもの日
    [8, 11],  // 山の日
    [11, 3],  // 文化の日
    [11, 23], // 勤労感謝の日
    [12, 23], // 天皇誕生日（令和以前）
  ];
  if (fixed.some(([mm, dd]) => mm === m && dd === d)) return true;
  if (m === 2 && d === 23) return true; // 天皇誕生日
  const secondMondayJan = 8 + (8 - new Date(y, 0, 1).getDay()) % 7;
  if (m === 1 && d === secondMondayJan) return true;   // 成人の日（1月第2月曜）
  if (m === 7 && d === 18 && y >= 2023) return true;   // 海の日（2023〜固定）
  if (m === 9 && d === 23) return true;                // 秋分の日（近似）
  const secondMondayOct = 8 + (8 - new Date(y, 9, 1).getDay()) % 7;
  if (m === 10 && d === secondMondayOct) return true; // スポーツの日（10月第2月曜）
  return false;
}

/**
 * 指定年月のカレンダー用日付リスト（前月・次月の埋め合わせ含む）
 */
function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = first.getDay();
  const daysInMonth = last.getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < totalCells; i++) {
    const diff = i - startOffset;
    const d = new Date(year, month, 1 + diff);
    d.setHours(0, 0, 0, 0);
    const isCurrentMonth = d.getMonth() === month;
    const isPast = d < today;
    const isToday = d.getTime() === today.getTime();
    const isSelectable = isCurrentMonth && !isPast;
    const dayOfWeek = d.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const isHoliday = isJapaneseHoliday(d);
    days.push({
      date: d,
      label: d.getDate(),
      isCurrentMonth,
      isPast,
      isToday,
      isSelectable,
      isSunday,
      isSaturday,
      isHoliday,
      key: d.toISOString(),
    });
  }
  return days;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function toDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function Calendar({ selectedDate, onSelectDate, reservedDates = new Set(), onMonthChange }) {
  const now = new Date();
  const [year, setYear] = useState(selectedDate ? selectedDate.getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(selectedDate ? selectedDate.getMonth() : now.getMonth());
  const days = getCalendarDays(year, month);

  const notifyMonth = (y, m) => {
    if (typeof onMonthChange === 'function') onMonthChange(y, m);
  };

  useEffect(() => {
    notifyMonth(year, month);
  }, []);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
      notifyMonth(year - 1, 11);
    } else {
      setMonth((m) => m - 1);
      notifyMonth(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
      notifyMonth(year + 1, 0);
    } else {
      setMonth((m) => m + 1);
      notifyMonth(year, month + 1);
    }
  };

  const handleDayClick = (day) => {
    if (!day.isSelectable) return;
    onSelectDate(day.date);
  };

  const monthLabel = `${year}年 ${month + 1}月`;

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="calendar-nav" onClick={handlePrevMonth} aria-label="前月">
          ‹
        </button>
        <h2 className="calendar-title">{monthLabel}</h2>
        <button type="button" className="calendar-nav" onClick={handleNextMonth} aria-label="次月">
          ›
        </button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <span
            key={w}
            className={`calendar-weekday ${i === 0 ? 'calendar-weekday-sun' : ''} ${i === 6 ? 'calendar-weekday-sat' : ''}`}
          >
            {w}
          </span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            className={`calendar-day ${!day.isCurrentMonth ? 'calendar-day-other' : ''} ${
              day.isPast ? 'calendar-day-past' : ''
            } ${day.isToday ? 'calendar-day-today' : ''} ${
              day.isSelectable ? 'calendar-day-selectable' : ''
            } ${day.isSunday ? 'calendar-day-sunday' : ''} ${day.isSaturday ? 'calendar-day-saturday' : ''            } ${
              day.isHoliday ? 'calendar-day-holiday' : ''
            } ${reservedDates.has(toDateStr(day.date)) ? 'calendar-day-reserved' : ''} ${
              selectedDate &&
              day.date.getTime() === selectedDate.getTime()
                ? 'calendar-day-selected'
                : ''
            }`}
            onClick={() => handleDayClick(day)}
            disabled={!day.isSelectable}
            aria-label={day.isToday ? `今日、${day.date.getMonth() + 1}月${day.label}日` : `${day.date.getMonth() + 1}月${day.label}日`}
          >
            <span className="calendar-day-num">{day.label}</span>
            {day.isToday && <span className="calendar-day-badge">今日</span>}
            {reservedDates.has(toDateStr(day.date)) && (
              <span className="calendar-day-reserved-badge">予約</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Calendar;
