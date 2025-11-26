import mysql.connector
from config import db_config
from datetime import datetime


def get_connection():
    return mysql.connector.connect(**db_config)


# ============================
# GET ALL
# ============================
def get_all(limit: int = 100, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT prediction_id, user_id, uploaded_image, predicted_food_id,
               confidence_score, raw_prediction_data, created_at
        FROM ai_predictions
        ORDER BY prediction_id DESC
        LIMIT %s OFFSET %s
        """,
        (limit, offset)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


# ============================
# GET BY ID
# ============================
def get_by_id(prediction_id: int):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT prediction_id, user_id, uploaded_image, predicted_food_id,
               confidence_score, raw_prediction_data, created_at
        FROM ai_predictions
        WHERE prediction_id = %s
        """,
        (prediction_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row


# ============================
# GET BY USER
# ============================
def get_by_user(user_id: int, limit: int = 100, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute(
        """
        SELECT prediction_id, user_id, uploaded_image, predicted_food_id,
               confidence_score, raw_prediction_data, created_at
        FROM ai_predictions
        WHERE user_id = %s
        ORDER BY prediction_id DESC
        LIMIT %s OFFSET %s
        """,
        (user_id, limit, offset)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


# ============================
# CREATE (INSERT)
# ============================
def create(data: dict):
    """
    data keys:
        - user_id: int
        - uploaded_image: URL string
        - predicted_food_id: int
        - confidence_score: float
        - raw_prediction_data: str (JSON string)
    """

    conn = get_connection()
    cur = conn.cursor()

    img_url = data.get('uploaded_image')  # URL dạng TEXT

    sql = """
        INSERT INTO ai_predictions 
        (user_id, uploaded_image, predicted_food_id, confidence_score, raw_prediction_data, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    vals = (
        data.get('user_id'),
        img_url,
        data.get('predicted_food_id'),
        data.get('confidence_score'),
        data.get('raw_prediction_data'),
        datetime.utcnow(),
    )

    cur.execute(sql, vals)
    conn.commit()
    new_id = cur.lastrowid

    cur.close()
    conn.close()

    return new_id


# ============================
# DELETE
# ============================
def delete(prediction_id: int):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM ai_predictions WHERE prediction_id = %s", (prediction_id,))
    conn.commit()
    ok = cur.rowcount > 0
    cur.close()
    conn.close()
    return ok
