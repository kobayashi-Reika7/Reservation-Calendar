/**
 * カレンダー選択画面（メイン機能）
 * 月表示カレンダーで日付を選択。過去日は選択不可。選択後は ReserveFormPage へ遷移
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from '../components/Calendar';

function CalendarPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(null);

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    navigate('/reserve/form', { state: { selectedDate: dateStr } });
  };

  return (
    <div className="page page-calendar">
      <h1 className="page-title">予約日を選んでください</h1>
      <p className="page-lead calendar-hint">
        選べる日（白い日付）をタップ → 予約内容の入力画面へ進みます。
      </p>
      <Calendar selectedDate={selectedDate} onSelectDate={handleSelectDate} />
    </div>
  );
}

export default CalendarPage;
