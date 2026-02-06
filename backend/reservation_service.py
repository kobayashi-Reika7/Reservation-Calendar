"""
予約・空き枠の業務ロジック（バックエンド専用）
- 勤務判定・空き判定・医師割当はすべてここで行う
- フロントは API の { time, reservable } のみ表示する
- 予約の正規情報は Firestore（doctorId 付き）で、キャンセル時もスロットが正しく解放される
- 環境変数 USE_DEMO_SLOTS=1 のとき、医師データが無い場合にデモ用の○を返す（シード未実行時用）
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from firebase_admin import firestore

from firebase_admin_client import init_firebase_admin

# 15分刻み 09:00〜16:45（フロント getTimeSlots と一致）
TIME_SLOTS = [
    f"{h:02d}:{m:02d}"
    for h in range(9, 17)
    for m in (0, 15, 30, 45)
]

WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _get_firestore():
    init_firebase_admin()
    return firestore.client()


def _weekday_key(date_str: str) -> str:
    """YYYY-MM-DD → mon, tue, ... (0=Mon)"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return WEEKDAY_KEYS[dt.weekday()]
    except (ValueError, IndexError):
        return "sun"


def _normalize_schedules(schedules: dict[str, Any] | None) -> dict[str, list[str]]:
    """schedules を WEEKDAY_KEYS ごとの list に正規化（キー欠損・非list を [] に）"""
    schedules = schedules or {}
    out: dict[str, list[str]] = {}
    for k in WEEKDAY_KEYS:
        val = schedules.get(k)
        out[k] = list(val) if isinstance(val, list) else []
    return out


def _get_doctors_by_department(department_label: str) -> list[dict[str, Any]]:
    """Firestore doctors から診療科（表示名）で医師一覧を取得"""
    db = _get_firestore()
    coll = db.collection("doctors")
    q = coll.where("department", "==", department_label.strip())
    snap = q.stream()
    out = []
    for doc in snap:
        d = doc.to_dict()
        schedules = _normalize_schedules(d.get("schedules"))
        out.append({
            "id": doc.id,
            "name": d.get("name") or "",
            "department": d.get("department") or "",
            "schedules": schedules,
        })
    return out


def _has_reservation(doctor_id: str, date: str, time: str) -> bool:
    """Firestore collectionGroup で該当医師・日・時間の予約が1件でもあれば True"""
    db = _get_firestore()
    coll = db.collection_group("reservations")
    q = coll.where("doctorId", "==", doctor_id).where("date", "==", date).where("time", "==", time).limit(1)
    return len(list(q.stream())) > 0


def _is_working(doctor: dict[str, Any], date: str, time: str) -> bool:
    """その日・その時間に勤務しているか（schedules の配列に time が含まれるか）"""
    key = _weekday_key(date)
    slots = doctor.get("schedules") or {}
    arr = slots.get(key) or []
    return time in arr


def _get_available_doctors(department_label: str, date: str, time: str) -> list[dict[str, Any]]:
    """その診療科・日・時間で空いている医師一覧（勤務かつ未予約）"""
    doctors = _get_doctors_by_department(department_label)
    return [
        d for d in doctors
        if _is_working(d, date, time) and not _has_reservation(d["id"], date, time)
    ]


def is_reservable(department_label: str, date: str, time: str) -> bool:
    """
    診療科・日・時間で予約可能か（1人でも空いていれば True）。
    get_slots（availability API）と create_reservation の両方で使用する共通判定。
    """
    return len(_get_available_doctors(department_label, date, time)) > 0


def assign_doctor(available_doctors: list[dict[str, Any]]) -> dict[str, Any] | None:
    """空いている医師から1人を選択（先頭を返す）"""
    if not available_doctors:
        return None
    return available_doctors[0]


def _is_japanese_holiday(date_str: str) -> bool:
    """日本の祝日かどうか（簡易判定）。フロント isJapaneseHoliday と整合させる。"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return False
    y, m, d = dt.year, dt.month, dt.day
    fixed = [
        (1, 1), (2, 11), (4, 29), (5, 3), (5, 4), (5, 5),
        (8, 11), (11, 3), (11, 23), (12, 23),
    ]
    if (m, d) in fixed:
        return True
    if m == 2 and d == 23:
        return True  # 天皇誕生日
    # 1月第2月曜（成人の日）。weekday(): 0=Mon, 6=Sun
    first_jan = datetime(y, 1, 1)
    second_monday_jan = 8 + (7 - first_jan.weekday()) % 7
    if m == 1 and d == second_monday_jan:
        return True
    if m == 7 and d == 18 and y >= 2023:
        return True  # 海の日
    if m == 9 and d == 23:
        return True  # 秋分の日（近似）
    first_oct = datetime(y, 10, 1)
    second_monday_oct = 8 + (7 - first_oct.weekday()) % 7
    if m == 10 and d == second_monday_oct:
        return True  # スポーツの日
    return False


def _demo_reservable(date_str: str, time_str: str) -> bool:
    """デモ用: 平日の 09:00〜11:45 を予約可とする（シード未実行時用）"""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        if dt.weekday() >= 5:  # 土日は×
            return False
    except (ValueError, TypeError):
        return False
    demo_times = [t for t in TIME_SLOTS if t < "12:00"]  # 09:00〜11:45
    return time_str in demo_times


def get_slots(department_label: str, date: str) -> list[dict[str, str | bool]]:
    """
    診療科・日付に対する全時間枠の予約可否を返す（祝日はバックエンドで判定し全枠×）。
    フロントはこの結果だけを表示する（○×の計算はしない）。
    """
    if not department_label or not date:
        return [{"time": t, "reservable": False} for t in TIME_SLOTS]
    if _is_japanese_holiday(date):
        return [{"time": t, "reservable": False} for t in TIME_SLOTS]
    use_demo_fallback = os.environ.get("USE_DEMO_SLOTS", "1").strip() != "0"
    try:
        doctors = _get_doctors_by_department(department_label)
    except Exception:
        doctors = []
    if not doctors and use_demo_fallback:
        return [
            {"time": t, "reservable": _demo_reservable(date, t)}
            for t in TIME_SLOTS
        ]
    try:
        return [
            {"time": t, "reservable": is_reservable(department_label, date, t)}
            for t in TIME_SLOTS
        ]
    except Exception:
        if use_demo_fallback:
            return [
                {"time": t, "reservable": _demo_reservable(date, t)}
                for t in TIME_SLOTS
            ]
        return [{"time": t, "reservable": False} for t in TIME_SLOTS]


def get_availability_for_date(department_label: str, date: str) -> dict[str, Any]:
    """
    1日分の空き状況を返す。祝日・過去日はバックエンドで判定し、レスポンスに含める。
    判定優先: 過去日 → 祝日 → 休診 → 医師勤務なし → 可。
    """
    slots = [{"time": t, "reservable": False} for t in TIME_SLOTS]
    if not department_label or not date:
        return {
            "date": date or "",
            "is_holiday": False,
            "reservable": False,
            "reason": "closed",
            "slots": slots,
        }
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if dt.date() < today.date():
            return {
                "date": date,
                "is_holiday": False,
                "reservable": False,
                "reason": "past",
                "slots": slots,
            }
    except (ValueError, TypeError):
        return {
            "date": date,
            "is_holiday": False,
            "reservable": False,
            "reason": "closed",
            "slots": slots,
        }
    # 祝日は必ず is_holiday: True と全枠 reservable: False を返す（フロントは isHoliday で表示制御）
    if _is_japanese_holiday(date):
        return {
            "date": date,
            "is_holiday": True,
            "reservable": False,
            "reason": "holiday",
            "slots": slots,
        }
    slot_list = get_slots(department_label, date)
    any_reservable = any(s.get("reservable") for s in slot_list)
    return {
        "date": date,
        "is_holiday": False,
        "reservable": any_reservable,
        "reason": None,
        "slots": slot_list,
    }


def create_reservation(department_label: str, date: str, time: str, user_id: str) -> dict[str, Any]:
    """
    予約を確定する。担当医は自動割当。
    Firestore users/{uid}/reservations に doctorId 付きで保存（一覧・キャンセル・空き判定の正規情報）。
    判定は get_availability_for_date と同一：過去日 → 祝日 → is_reservable（勤務・空き）。
    """
    # 過去日チェック（availability API と同一）
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if dt.date() < today.date():
            raise ValueError("過去の日付は予約できません。別の日をお選びください。")
    except (ValueError, TypeError):
        pass  # 日付パース失敗は下の is_reservable で弾かれる
    if _is_japanese_holiday(date):
        raise ValueError("祝日のため予約できません。別の日をお選びください。")
    # 空き判定は is_reservable と同一（_get_available_doctors を使用）
    if not is_reservable(department_label, date, time):
        raise ValueError("この時間は現在予約できません。別の時間をお選びください。")
    available = _get_available_doctors(department_label, date, time)
    doctor = assign_doctor(available)
    if not doctor:
        raise ValueError("この時間は予約できません。別の時間をお選びください。")

    db = _get_firestore()
    ref = db.collection("users").document(user_id).collection("reservations")
    _, doc_ref = ref.add({
        "date": date,
        "time": time,
        "category": "",
        "department": department_label,
        "purpose": "",
        "doctor": doctor["name"],
        "doctorId": doctor["id"],
        "createdAt": firestore.SERVER_TIMESTAMP,
    })

    return {
        "id": doc_ref.id,
        "departmentId": department_label,
        "doctorId": doctor["id"],
        "date": date,
        "time": time,
        "userId": user_id,
    }
