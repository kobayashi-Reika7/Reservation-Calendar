/**
 * 予約データの Firestore 保存・取得
 * 構造: users/{uid}/reservations/{reservationId}
 * フィールド: date, time, category, department, purpose, doctor
 * 同一ユーザーで同一 date+time の重複は不可
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * 指定ユーザーの指定日・時間が既に予約済みか確認
 * @param {string} uid - ユーザーID
 * @param {string} date - YYYY-MM-DD
 * @param {string} time - 例 "09:00"
 * @returns {Promise<boolean>} 既に予約済みなら true
 */
export async function isSlotTaken(uid, date, time) {
  if (!uid) return false;
  const ref = collection(db, 'users', uid, 'reservations');
  const q = query(ref, where('date', '==', date), where('time', '==', time));
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * 予約を1件保存（users/{uid}/reservations に追加）
 * @param {string} uid - ユーザーID
 * @param {object} data - { date, time, category, department, purpose, doctor }
 * @returns {Promise<string>} 作成されたドキュメントID
 */
export async function createReservation(uid, data) {
  const ref = collection(db, 'users', uid, 'reservations');
  const payload = {
    date: String(data.date ?? ''),
    time: String(data.time ?? ''),
    category: String(data.category ?? ''),
    department: String(data.department ?? ''),
    purpose: String(data.purpose ?? ''),
    doctor: String(data.doctor ?? ''),
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

/**
 * ユーザーの予約一覧を取得（日付・時間昇順）
 * @param {string} uid
 * @returns {Promise<Array<{id, date, time, category, department, purpose, doctor}>>}
 */
export async function getReservationsByUser(uid) {
  if (!uid) return [];
  const ref = collection(db, 'users', uid, 'reservations');
  const snap = await getDocs(ref);
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        date: x.date ?? '',
        time: x.time ?? '',
        category: x.category ?? '',
        department: x.department ?? '',
        purpose: x.purpose ?? '',
        doctor: x.doctor ?? '',
      };
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
