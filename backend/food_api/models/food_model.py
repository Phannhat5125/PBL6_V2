import mysql.connector
from config import db_config
from datetime import datetime


def get_connection():
    return mysql.connector.connect(**db_config)


# ==========================================================
# GET ALL FOODS
# ==========================================================
def get_all(limit=100, offset=0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    sql = """
    SELECT food_id, category_id, name, description, nutrition_info,
           ingredients, main_image, origin_region_id, avg_rating,
           most_popular, created_at, updated_at, serve_time
    FROM foods
    ORDER BY food_id DESC
    LIMIT %s OFFSET %s
    """

    cur.execute(sql, (limit, offset))
    rows = cur.fetchall()

    # convert ingredients TEXT → list
    for r in rows:
        r["ingredients"] = r["ingredients"].split(",") if r.get("ingredients") else []

    cur.close(); conn.close()
    return rows


# ==========================================================
# SEARCH FOODS
# ==========================================================
def search(query, limit=100, offset=0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    like = f"%{query}%"

    sql = """
    SELECT food_id, category_id, name, description, nutrition_info,
           ingredients, main_image, origin_region_id, avg_rating,
           most_popular, created_at, updated_at, serve_time
    FROM foods
    WHERE name LIKE %s OR ingredients LIKE %s
    ORDER BY food_id DESC
    LIMIT %s OFFSET %s
    """

    cur.execute(sql, (like, like, limit, offset))
    rows = cur.fetchall()

    for r in rows:
        r["ingredients"] = r["ingredients"].split(",") if r.get("ingredients") else []

    cur.close(); conn.close()
    return rows


# ==========================================================
# GET BY ID
# ==========================================================
def get_by_id(food_id):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    sql = """
    SELECT food_id, category_id, name, description, nutrition_info,
           ingredients, main_image, origin_region_id, avg_rating,
           most_popular, created_at, updated_at, serve_time
    FROM foods
    WHERE food_id = %s
    """

    cur.execute(sql, (food_id,))
    row = cur.fetchone()

    if row:
        row["ingredients"] = row["ingredients"].split(",") if row.get("ingredients") else []

    cur.close(); conn.close()
    return row


# ==========================================================
# CREATE FOOD
# ==========================================================
def create(data):
    conn = get_connection()
    cur = conn.cursor()

    sql = """
    INSERT INTO foods (category_id, name, description, nutrition_info,
                       ingredients, main_image, origin_region_id,
                       avg_rating, most_popular, serve_time)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    vals = (
        data.get("category_id"),
        data.get("name"),
        data.get("description"),
        data.get("nutrition_info"),
        ",".join(data.get("ingredients", [])),
        data.get("main_image"),
        data.get("origin_region_id"),
        data.get("avg_rating"),
        data.get("most_popular"),
        data.get("serve_time"),
    )

    cur.execute(sql, vals)
    conn.commit()

    new_id = cur.lastrowid
    cur.close(); conn.close()

    return new_id


# ==========================================================
# UPDATE FOOD
# ==========================================================
def update(food_id, data: dict):
    conn = get_connection()
    cur = conn.cursor()

    fields = []
    vals = []

    allowed = [
        "category_id", "name", "description", "nutrition_info",
        "ingredients", "main_image", "origin_region_id",
        "avg_rating", "most_popular", "serve_time"
    ]

    for k in allowed:
        if k in data:
            if k == "ingredients":
                fields.append("ingredients=%s")
                vals.append(",".join(data[k]))
            else:
                fields.append(f"{k}=%s")
                vals.append(data[k])

    # auto update timestamp
    fields.append("updated_at=%s")
    vals.append(datetime.utcnow())

    if fields:
        sql = "UPDATE foods SET " + ",".join(fields) + " WHERE food_id=%s"
        vals.append(food_id)
        cur.execute(sql, tuple(vals))
        conn.commit()

    cur.close(); conn.close()
    return True


# ==========================================================
# DELETE FOOD
# ==========================================================
def delete(food_id):
    conn = get_connection()
    cur = conn.cursor()

    sql = "DELETE FROM foods WHERE food_id=%s"
    cur.execute(sql, (food_id,))
    conn.commit()

    ok = cur.rowcount > 0

    cur.close(); conn.close()
    return ok
