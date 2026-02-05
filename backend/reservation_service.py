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
    """診療科・日・時間で予約可能か（1人でも空いていれば True）"""
    return len(_get_available_doctors(department_label, date, time)) > 0


def assign_doctor(available_doctors: list[dict[str, Any]]) -> dict[str, Any] | None:
    """空いている医師から1人を選択（先頭を返す）"""
    if not available_doctors:
        return None
    return available_doctors[0]


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
    診療科・日付に対する全時間枠の予約可否を返す。
    フロントはこの結果だけを表示する（○×の計算はしない）。
    医師が0件または Firestore 取得失敗時はデモ用に平日午前を○にして返す（空き状況取得を確実に）。
    USE_DEMO_SLOTS=0 のときはデモに fallback せず全枠×を返す。
    """
    if not department_label or not date:
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


def create_reservation(department_label: str, date: str, time: str, user_id: str) -> dict[str, Any]:
    """
    予約を確定する。担当医は自動割当。
    Firestore users/{uid}/reservations に doctorId 付きで保存（一覧・キャンセル・空き判定の正規情報）。
    """
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
