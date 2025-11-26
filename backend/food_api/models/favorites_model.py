import mysql.connector
from config import db_config


def get_connection():
    return mysql.connector.connect(**db_config)


def get_all(limit: int = 500, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT user_id, food_id, favorited_at
        FROM favorites
        ORDER BY favorited_at DESC
        LIMIT %s OFFSET %s
    """, (limit, offset))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def get_by_user(user_id: int, limit: int = 500, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT user_id, food_id, favorited_at
        FROM favorites
        WHERE user_id = %s
        ORDER BY favorited_at DESC
        LIMIT %s OFFSET %s
    """, (user_id, limit, offset))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows


def is_favorited(user_id: int, food_id: int):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT favorited_at
        FROM favorites
        WHERE user_id=%s AND food_id=%s
        LIMIT 1
    """, (user_id, food_id))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row['favorited_at'] if row else None


def create(user_id: int, food_id: int):
    existing = is_favorited(user_id, food_id)
    if existing:
        return {'created': False, 'favorited_at': existing}

    conn = get_connection()
    cur = conn.cursor()

    # để MySQL tự tạo timestamp
    cur.execute("""
        INSERT INTO favorites (user_id, food_id)
        VALUES (%s, %s)
    """, (user_id, food_id))

    conn.commit()

    # lấy timestamp vừa tạo
    cur.execute("""
        SELECT favorited_at FROM favorites
        WHERE user_id=%s AND food_id=%s
    """, (user_id, food_id))
    row = cur.fetchone()

    cur.close(); conn.close()

    return {'created': True, 'favorited_at': row[0]}


def delete(user_id: int, food_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM favorites WHERE user_id=%s AND food_id=%s", (user_id, food_id))
    conn.commit()
    ok = cur.rowcount > 0
    cur.close(); conn.close()
    return ok
