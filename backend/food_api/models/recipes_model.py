import mysql.connector
from config import db_config


def get_connection():
    return mysql.connector.connect(**db_config)


# ====================================================
# GET ALL
# ====================================================
def get_all(q: str = None, limit: int = 100, offset: int = 0,
            food_id: int = None, author_id: int = None):

    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    sql = """
        SELECT recipe_id, food_id, title, instructions, video_url,
               prep_time_minutes, cook_time_minutes, author_id
        FROM recipes
    """

    clauses = []
    vals = []

    if q:
        like = f"%{q}%"
        clauses.append("(title LIKE %s OR instructions LIKE %s)")
        vals.extend([like, like])

    if food_id is not None:
        clauses.append("food_id = %s")
        vals.append(food_id)

    if author_id is not None:
        clauses.append("author_id = %s")
        vals.append(author_id)

    if clauses:
        sql += " WHERE " + " AND ".join(clauses)

    sql += " ORDER BY recipe_id DESC LIMIT %s OFFSET %s"
    vals.extend([limit, offset])

    cur.execute(sql, tuple(vals))
    rows = cur.fetchall()

    cur.close()
    conn.close()
    return rows


# ====================================================
# GET ONE
# ====================================================
def get_by_id(recipe_id: int):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    sql = """
        SELECT recipe_id, food_id, title, instructions, video_url,
               prep_time_minutes, cook_time_minutes, author_id
        FROM recipes
        WHERE recipe_id = %s
    """

    cur.execute(sql, (recipe_id,))
    row = cur.fetchone()

    cur.close()
    conn.close()
    return row


# ====================================================
# GET BY FOOD
# ====================================================
def get_by_food(food_id: int, limit: int = 100, offset: int = 0):
    return get_all(limit=limit, offset=offset, food_id=food_id)


# ====================================================
# CREATE
# ====================================================
def create(data: dict):
    # Validate required
    if not data.get("food_id") or not data.get("title") or not data.get("instructions"):
        raise ValueError("food_id, title và instructions là bắt buộc")

    try:
        food_id = int(data["food_id"])
    except:
        raise ValueError("food_id phải là số nguyên")

    title = data["title"]
    instructions = data["instructions"]
    video_url = data.get("video_url")

    def to_int(v):
        try:
            return int(v) if v not in ("", None) else None
        except:
            return None

    prep = to_int(data.get("prep_time_minutes"))
    cook = to_int(data.get("cook_time_minutes"))
    author = to_int(data.get("author_id"))

    conn = get_connection()
    cur = conn.cursor()

    sql = """
        INSERT INTO recipes (
            food_id, title, instructions, video_url,
            prep_time_minutes, cook_time_minutes, author_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    cur.execute(sql, (
        food_id, title, instructions, video_url,
        prep, cook, author
    ))

    conn.commit()
    new_id = cur.lastrowid

    cur.close()
    conn.close()
    return new_id


# ====================================================
# UPDATE
# ====================================================
def update(recipe_id: int, data: dict):
    fields = []
    vals = []

    allowed = [
        "food_id", "title", "instructions", "video_url",
        "prep_time_minutes", "cook_time_minutes", "author_id"
    ]

    def to_int(v):
        try:
            return int(v) if v not in ("", None) else None
        except:
            return None

    for key in allowed:
        if key in data:
            if key in ("food_id", "prep_time_minutes", "cook_time_minutes", "author_id"):
                vals.append(to_int(data[key]))
            else:
                vals.append(data[key])

            fields.append(f"{key} = %s")

    if not fields:
        return False

    sql = "UPDATE recipes SET " + ", ".join(fields) + " WHERE recipe_id = %s"
    vals.append(recipe_id)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(sql, tuple(vals))
    conn.commit()

    changed = cur.rowcount > 0

    cur.close()
    conn.close()
    return changed


# ====================================================
# DELETE
# ====================================================
def delete(recipe_id: int):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("DELETE FROM recipes WHERE recipe_id = %s", (recipe_id,))
    conn.commit()

    ok = cur.rowcount > 0

    cur.close()
    conn.close()
    return ok
