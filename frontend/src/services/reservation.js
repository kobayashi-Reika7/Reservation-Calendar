/**
 * 予約データの Firestore 保存・取得
 * 同一時間帯の重複予約は不可（date + slot で一意チェック）
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

const COLLECTION = 'reservations';

/**
 * 指定日の指定枠が既に予約されているか確認
 * @param {string} date - YYYY-MM-DD
 * @param {string} slot - 例 "09:00"
 * @returns {Promise<boolean>} 既に予約済みなら true
 */
export async function isSlotTaken(date, slot) {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('date', '==', date), where('slot', '==', slot));
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * 予約を1件保存（重複チェック済みで呼ぶこと）
 * @param {object} data - { userId, date, slot, category, department, purpose, doctorName }
 * @returns {Promise<string>} 作成されたドキュメントID
 */
export async function createReservation(data) {
  const ref = collection(db, COLLECTION);
  const payload = {
    userId: data.userId ?? '',
    date: String(data.date ?? ''),
    slot: String(data.slot ?? ''),
    category: String(data.category ?? ''),
    department: String(data.department ?? ''),
    purpose: String(data.purpose ?? ''),
    doctorName: String(data.doctorName ?? ''),
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

/**
 * ユーザーの予約一覧を取得（日付昇順）
 * @param {string} userId
 * @returns {Promise<Array<{id, date, slot, category, department, purpose, doctorName}>>}
 */
export async function getReservationsByUser(userId) {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      date: x.date ?? '',
      slot: x.slot ?? '',
      category: x.category ?? '',
      department: x.department ?? '',
      purpose: x.purpose ?? '',
      doctorName: x.doctorName ?? '',
    };
  }).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
}
