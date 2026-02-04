/**
 * カレンダー本体（月表示）
 * 過去日は選択不可。選択した日付を親に通知する
 */
import React, { useState } from 'react';

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
    const isSelectable = isCurrentMonth && !isPast;
    days.push({
      date: d,
      label: d.getDate(),
      isCurrentMonth,
      isPast,
      isSelectable,
      key: d.toISOString(),
    });
  }
  return days;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function Calendar({ selectedDate, onSelectDate }) {
  const now = new Date();
  const [year, setYear] = useState(selectedDate ? selectedDate.getFullYear() : now.getFullYear());
  const [month, setMonth] = useState(selectedDate ? selectedDate.getMonth() : now.getMonth());
  const days = getCalendarDays(year, month);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
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
        {WEEKDAYS.map((w) => (
          <span key={w} className="calendar-weekday">
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
            } ${day.isSelectable ? 'calendar-day-selectable' : ''} ${
              selectedDate &&
              day.date.getTime() === selectedDate.getTime()
                ? 'calendar-day-selected'
                : ''
            }`}
            onClick={() => handleDayClick(day)}
            disabled={!day.isSelectable}
            aria-label={`${day.date.getMonth() + 1}月${day.label}日`}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Calendar;
