import mysql.connector
from config import db_config
from datetime import datetime


def get_connection():
    return mysql.connector.connect(**db_config)


def get_all(limit: int = 100, offset: int = 0, food_id: int = None):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    if food_id is not None:
        sql = """
            SELECT image_id, food_id, image_data, caption, created_at
            FROM food_images
            WHERE food_id=%s
            ORDER BY image_id DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(sql, (food_id, limit, offset))
    else:
        sql = """
            SELECT image_id, food_id, image_data, caption, created_at
            FROM food_images
            ORDER BY image_id DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(sql, (limit, offset))

    rows = cur.fetchall()

    # image_data là TEXT => giữ nguyên chuỗi, không encode/decode
    cur.close()
    conn.close()
    return rows


def get_by_id(image_id: int):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
        SELECT image_id, food_id, image_data, caption, created_at
        FROM food_images
        WHERE image_id=%s
    """, (image_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()
    return row


def get_by_food(food_id: int, limit: int = 100, offset: int = 0):
    return get_all(limit=limit, offset=offset, food_id=food_id)


def create(data: dict):
    if 'food_id' not in data or 'image_data' not in data:
        raise ValueError("food_id and image_data are required")

    food_id = int(data['food_id'])
    image_data = data.get('image_data')  # string URL hoặc base64
    caption = data.get('caption')

    conn = get_connection()
    cur = conn.cursor()

    sql = """
        INSERT INTO food_images (food_id, image_data, caption, created_at)
        VALUES (%s, %s, %s, %s)
    """
    vals = (food_id, image_data, caption, datetime.utcnow())

    cur.execute(sql, vals)
    conn.commit()
    new_id = cur.lastrowid

    cur.close()
    conn.close()
    return new_id


def update(image_id: int, data: dict):
    conn = get_connection()
    cur = conn.cursor()

    fields = []
    vals = []

    if 'image_data' in data:
        fields.append("image_data=%s")
        vals.append(data.get('image_data'))  # string

    if 'caption' in data:
        fields.append("caption=%s")
        vals.append(data.get('caption'))

    if not fields:
        cur.close()
        conn.close()
        return False

    sql = "UPDATE food_images SET " + ", ".join(fields) + " WHERE image_id=%s"
    vals.append(image_id)

    cur.execute(sql, tuple(vals))
    conn.commit()

    changed = cur.rowcount > 0

    cur.close()
    conn.close()
    return changed


def delete(image_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("DELETE FROM food_images WHERE image_id=%s", (image_id,))
    conn.commit()

    ok = cur.rowcount > 0

    cur.close()
    conn.close()
    return ok
