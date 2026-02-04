/**
 * 予約入力フォーム画面
 * 上から下へ一本道: 大分類 → 診療科 → 予約目的 → 担当医 → 時間（30分刻みボタン）
 * 予約変更時は変更前データを初期値としてプリフィルする。
 */
import React, { useState, useEffect, useMemo } from 'react';
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
import { isSlotTaken, isSlotTakenForDoctor } from '../services/reservation';

/** 予約データ（ラベル）からフォーム用の category/department/purpose/doctor id を返す */
function getInitialIdsFromReservation(editingReservation) {
  if (!editingReservation) return {};
  const r = editingReservation;
  let category = '';
  let department = '';
  for (const c of CATEGORIES) {
    const depts = DEPARTMENTS_BY_CATEGORY[c.id] ?? [];
    const found = depts.find((d) => d.label === r.department);
    if (found) {
      category = c.id;
      department = found.id;
      break;
    }
  }
  const purpose = PURPOSES.find((p) => p.label === r.purpose)?.id ?? '';
  const doctor = DOCTORS.find((d) => d.name === r.doctor)?.id ?? '';
  const time = (r.time || '').trim() || '';
  return { category, department, purpose, doctor, time };
}

function ReserveFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth();
  const selectedDate = location.state?.selectedDate ?? '';
  const editingReservation = location.state?.editingReservation ?? null;
  const editingReservationId = location.state?.editingReservationId ?? null;
  const isEditing = !!location.state?.isEditing;

  const initialIds = useMemo(
    () => getInitialIdsFromReservation(editingReservation),
    [editingReservation]
  );

  const [category, setCategory] = useState(initialIds.category || '');
  const [department, setDepartment] = useState(initialIds.department || '');
  const [purpose, setPurpose] = useState(initialIds.purpose || '');
  const [doctor, setDoctor] = useState(initialIds.doctor || '');
  const [time, setTime] = useState(initialIds.time || '');
  const [busySlots, setBusySlots] = useState(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const departments = category ? (DEPARTMENTS_BY_CATEGORY[category] ?? []) : [];
  const allTimeSlots = getTimeSlots();
  const availableSlots = useMemo(
    () => allTimeSlots.filter((t) => !busySlots.has(t)),
    [allTimeSlots, busySlots]
  );

  useEffect(() => {
    if (!category) setDepartment('');
  }, [category]);

  useEffect(() => {
    if (!selectedDate || !user?.uid) return;
    setLoadingSlots(true);
    const slots = getTimeSlots();
    const editingDate = editingReservation?.date;
    const editingTime = editingReservation?.time;
    const check = async () => {
      const taken = new Set();
      for (const s of slots) {
        const ok = await isSlotTaken(user.uid, selectedDate, s);
        if (ok) taken.add(s);
      }
      if (isEditing && selectedDate === editingDate && editingTime) {
        taken.delete(editingTime);
      }
      setBusySlots(taken);
      setLoadingSlots(false);
    };
    check();
  }, [selectedDate, user?.uid, isEditing, editingReservation?.date, editingReservation?.time]);

  // 予約変更時: 選択中の時間がこの日は予約済みなら選択を外し、別の時間を選べるようにする
  useEffect(() => {
    if (!time || busySlots.size === 0) return;
    if (busySlots.has(time)) setTime('');
  }, [time, busySlots]);

  const doctorLabel = DOCTORS.find((d) => d.id === doctor)?.name ?? '';
  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? '';
  const departmentLabel = departments.find((d) => d.id === department)?.label ?? '';
  const purposeLabel = PURPOSES.find((p) => p.id === purpose)?.label ?? '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !category || !department || !purpose || !time) return;
    setSubmitError('');
    if (doctorLabel && doctorLabel.trim()) {
      const taken = await isSlotTakenForDoctor(
        selectedDate,
        time,
        departmentLabel,
        doctorLabel,
        isEditing ? user?.uid : undefined,
        isEditing ? editingReservationId : undefined
      );
      if (taken) {
        setSubmitError('この時間は同じ診療科・同じ担当医で既に別の方が予約済みです。別の時間か担当医をお選びください。');
        return;
      }
    }
    navigate('/reserve/confirm', {
      state: {
        selectedDate,
        category: categoryLabel,
        department: departmentLabel,
        purpose: purposeLabel,
        doctor: doctorLabel || '',
        time,
        isEditing: isEditing || undefined,
        editingReservationId: editingReservationId || undefined,
      },
    });
  };

  if (!selectedDate) {
    return (
      <div className="page">
        <p className="page-error">日付が選択されていません。</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/calendar', { state: isEditing ? { isEditing, editingReservationId, editingReservation } : undefined })}
        >
          カレンダーに戻る
        </button>
      </div>
    );
  }

  const canSubmit = category && department && purpose && time;

  return (
    <div className="page page-reserve-form">
      <h1 className="page-title">予約内容の入力</h1>
      <p className="page-lead form-step-lead">予約日: <strong>{selectedDate}</strong></p>

      {submitError && <p className="page-error" role="alert">{submitError}</p>}
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

        {/* 4. 担当医（任意） */}
        <section className="form-step">
          <h2 className="form-step-title">4. 担当医を選んでください（任意）</h2>
          <div className="choice-list">
            <button
              type="button"
              className={`choice-btn choice-btn-full ${doctor === '' ? 'choice-btn-selected' : ''}`}
              onClick={() => setDoctor('')}
            >
              選択しない
            </button>
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

        {/* 5. 時間（選択可能な空き枠のみ表示） */}
        <section className="form-step">
          <h2 className="form-step-title">5. 時間を選んでください</h2>
          {loadingSlots ? (
            <p className="form-step-loading" role="status">空き枠を読み込み中…</p>
          ) : availableSlots.length === 0 ? (
            <p className="form-step-empty" role="status">この日は空き枠がありません。別の日をお選びください。</p>
          ) : (
            <>
              {isEditing && !time && initialIds.time && busySlots.has(initialIds.time) && (
                <p className="form-step-optional form-step-time-hint" role="status">
                  変更前の時間はこの日は埋まっているため、下の枠から選んでください。
                </p>
              )}
              <div className="time-slots">
                {availableSlots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`time-slot-btn ${time === t ? 'time-slot-btn-selected' : ''}`}
                    onClick={() => setTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <button type="submit" className="btn btn-primary form-submit" disabled={!canSubmit}>
          確認画面へ
        </button>
      </form>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => navigate('/calendar', { state: isEditing ? { isEditing, editingReservationId, editingReservation } : undefined })}
      >
        カレンダーに戻る
      </button>
    </div>
  );
}

export default ReserveFormPage;
