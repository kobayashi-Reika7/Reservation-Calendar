/**
 * 予約入力フォーム画面
 * 大分類 → 診療科 → 予約目的 → 担当医 → 時間（30分刻み）。完了後は ReserveConfirmPage へ遷移
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SelectField } from '../components/InputForm';
import {
  CATEGORIES,
  DEPARTMENTS_BY_CATEGORY,
  PURPOSES,
  DOCTORS,
  getTimeSlots,
} from '../constants/masterData';
import { isSlotTaken } from '../services/reservation';

function ReserveFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedDate = location.state?.selectedDate ?? '';

  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [purpose, setPurpose] = useState('');
  const [doctor, setDoctor] = useState('');
  const [slot, setSlot] = useState('');
  const [busySlots, setBusySlots] = useState(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  const departments = category ? (DEPARTMENTS_BY_CATEGORY[category] ?? []) : [];
  const timeSlots = getTimeSlots();

  useEffect(() => {
    if (!category) setDepartment('');
  }, [category]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    const slots = getTimeSlots();
    const check = async () => {
      const taken = new Set();
      for (const s of slots) {
        const ok = await isSlotTaken(selectedDate, s);
        if (ok) taken.add(s);
      }
      setBusySlots(taken);
      setLoadingSlots(false);
    };
    check();
  }, [selectedDate]);

  const doctorName = DOCTORS.find((d) => d.id === doctor)?.name ?? '';
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? '';
  const departmentLabel = departments.find((d) => d.id === department)?.label ?? '';
  const purposeLabel = PURPOSES.find((p) => p.id === purpose)?.label ?? '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate || !category || !department || !purpose || !doctor || !slot) return;
    navigate('/reserve/confirm', {
      state: {
        selectedDate,
        category: categoryLabel,
        department: departmentLabel,
        purpose: purposeLabel,
        doctorName,
        slot,
      },
    });
  };

  if (!selectedDate) {
    return (
      <div className="page">
        <p className="page-error">日付が選択されていません。</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/calendar')}>
          カレンダーに戻る
        </button>
      </div>
    );
  }

  const canSubmit =
    category && department && purpose && doctor && slot && !busySlots.has(slot);

  return (
    <div className="page page-reserve-form">
      <h1 className="page-title">予約内容の入力</h1>
      <p className="page-lead">予約日: {selectedDate}</p>
      <form onSubmit={handleSubmit} className="page-form">
        <SelectField
          label="大分類"
          value={category}
          options={CATEGORIES}
          onChange={setCategory}
        />
        <SelectField
          label="診療科"
          value={department}
          options={departments}
          onChange={setDepartment}
          disabled={!category}
        />
        <SelectField
          label="予約目的"
          value={purpose}
          options={PURPOSES}
          onChange={setPurpose}
        />
        <SelectField
          label="担当医"
          value={doctor}
          options={DOCTORS}
          onChange={setDoctor}
        />
        <SelectField
          label="時間（30分刻み）"
          value={slot}
          options={timeSlots.filter((s) => !busySlots.has(s)).map((s) => ({ id: s, label: s }))}
          onChange={setSlot}
          placeholder={loadingSlots ? '確認中…' : '選択してください'}
          disabled={loadingSlots}
        />
        {loadingSlots && <p className="page-muted">予約枠を確認しています…</p>}
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          確認画面へ
        </button>
      </form>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/calendar')}>
        カレンダーに戻る
      </button>
    </div>
  );
}

export default ReserveFormPage;
