import mysql.connector
from config import db_config
from datetime import datetime


def get_connection():
    return mysql.connector.connect(**db_config)


def get_all(limit: int = 100, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    sql = """
        SELECT category_id, category_name, description, image, created_at
        FROM categories
        ORDER BY category_id DESC
        LIMIT %s OFFSET %s
    """
    cur.execute(sql, (limit, offset))
    rows = cur.fetchall()

    cur.close()
    conn.close()
    return rows


def search(query: str, limit: int = 100, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    like = f"%{query}%"
    sql = """
        SELECT category_id, category_name, description, image, created_at
        FROM categories
        WHERE category_name LIKE %s
        ORDER BY category_id DESC
        LIMIT %s OFFSET %s
    """

    cur.execute(sql, (like, limit, offset))
    rows = cur.fetchall()

    cur.close()
    conn.close()
    return rows


def get_by_id(category_id: int):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    sql = """
        SELECT category_id, category_name, description, image, created_at
        FROM categories
        WHERE category_id = %s
    """

    cur.execute(sql, (category_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()
    return row


def create(data: dict):
    conn = get_connection()
    cur = conn.cursor()

    sql = """
        INSERT INTO categories (category_name, description, image, created_at)
        VALUES (%s, %s, %s, %s)
    """

    cur.execute(sql, (
        data.get('category_name'),
        data.get('description'),
        data.get('image'),  # URL
        datetime.utcnow()
    ))

    conn.commit()
    new_id = cur.lastrowid

    cur.close()
    conn.close()

    return new_id


def update(category_id: int, data: dict):
    conn = get_connection()
    cur = conn.cursor()

    fields = []
    vals = []

    allowed = ['category_name', 'description', 'image']

    for k in allowed:
        if k in data:
            fields.append(f"{k} = %s")
            vals.append(data[k])

    if not fields:
        return False

    sql = "UPDATE categories SET " + ", ".join(fields) + " WHERE category_id = %s"
    vals.append(category_id)

    cur.execute(sql, tuple(vals))
    conn.commit()

    changed = cur.rowcount > 0

    cur.close()
    conn.close()

    return changed


def delete(category_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("DELETE FROM categories WHERE category_id = %s", (category_id,))
    conn.commit()

    ok = cur.rowcount > 0

    cur.close()
    conn.close()

    return ok
