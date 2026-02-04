/**
 * 予約入力フォーム画面
 * 上から下へ一本道: 大分類 → 診療科 → 予約目的 → 担当医 → 時間（30分刻みボタン）
 * 選択済みは視覚的に表示。選択できない時間は非活性。
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
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
  const user = useAuth();
  const selectedDate = location.state?.selectedDate ?? '';

  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [purpose, setPurpose] = useState('');
  const [doctor, setDoctor] = useState('');
  const [time, setTime] = useState('');
  const [busySlots, setBusySlots] = useState(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  const departments = category ? (DEPARTMENTS_BY_CATEGORY[category] ?? []) : [];
  const timeSlots = getTimeSlots();

  useEffect(() => {
    if (!category) setDepartment('');
  }, [category]);

  useEffect(() => {
    if (!selectedDate || !user?.uid) return;
    setLoadingSlots(true);
    const slots = getTimeSlots();
    const check = async () => {
      const taken = new Set();
      for (const s of slots) {
        const ok = await isSlotTaken(user.uid, selectedDate, s);
        if (ok) taken.add(s);
      }
      setBusySlots(taken);
      setLoadingSlots(false);
    };
    check();
  }, [selectedDate, user?.uid]);

  const doctorLabel = DOCTORS.find((d) => d.id === doctor)?.name ?? '';
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? '';
  const departmentLabel = departments.find((d) => d.id === department)?.label ?? '';
  const purposeLabel = PURPOSES.find((p) => p.id === purpose)?.label ?? '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedDate || !category || !department || !purpose || !doctor || !time) return;
    navigate('/reserve/confirm', {
      state: {
        selectedDate,
        category: categoryLabel,
        department: departmentLabel,
        purpose: purposeLabel,
        doctor: doctorLabel,
        time,
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

  const canSubmit = category && department && purpose && doctor && time && !busySlots.has(time);

  return (
    <div className="page page-reserve-form">
      <h1 className="page-title">予約内容の入力</h1>
      <p className="page-lead form-step-lead">予約日: <strong>{selectedDate}</strong></p>

      <form onSubmit={handleSubmit} className="reserve-form">
        {/* 1. 大分類（ボタン形式で選択状態を明確に） */}
        <section className="form-step">
          <h2 className="form-step-title">1. 大分類を選んでください</h2>
          <div className="choice-buttons">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`choice-btn ${category === c.id ? 'choice-btn-selected' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* 2. 診療科（大分類に応じて選択肢を切り替え） */}
        <section className="form-step">
          <h2 className="form-step-title">2. 診療科を選んでください</h2>
          <SelectField
            label="診療科"
            value={department}
            options={departments}
            onChange={setDepartment}
            placeholder={category ? '選択してください' : '先に大分類を選んでください'}
            disabled={!category}
          />
          {department && (
            <p className="form-step-done">選択中: {departmentLabel}</p>
          )}
        </section>

        {/* 3. 予約目的 */}
        <section className="form-step">
          <h2 className="form-step-title">3. 予約目的を選んでください</h2>
          <div className="choice-buttons choice-buttons-wrap">
            {PURPOSES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`choice-btn ${purpose === p.id ? 'choice-btn-selected' : ''}`}
                onClick={() => setPurpose(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. 担当医 */}
        <section className="form-step">
          <h2 className="form-step-title">4. 担当医を選んでください</h2>
          <div className="choice-list">
            {DOCTORS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`choice-btn choice-btn-full ${doctor === d.id ? 'choice-btn-selected' : ''}`}
                onClick={() => setDoctor(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </section>

        {/* 5. 時間（30分刻み・ボタン形式・予約済みは非活性） */}
        <section className="form-step">
          <h2 className="form-step-title">5. 時間を選んでください（30分刻み）</h2>
          {loadingSlots && <p className="page-muted">予約枠を確認しています…</p>}
          <div className="time-slots">
            {timeSlots.map((t) => {
              const taken = busySlots.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  className={`time-slot-btn ${time === t ? 'time-slot-btn-selected' : ''} ${taken ? 'time-slot-btn-disabled' : ''}`}
                  onClick={() => !taken && setTime(t)}
                  disabled={taken || loadingSlots}
                >
                  {t}{taken ? '（予約済）' : ''}
                </button>
              );
            })}
          </div>
        </section>

        <button type="submit" className="btn btn-primary form-submit" disabled={!canSubmit}>
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
