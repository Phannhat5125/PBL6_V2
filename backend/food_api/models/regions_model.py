import mysql.connector
from config import db_config

def get_connection():
    """Kết nối đến database MySQL"""
    return mysql.connector.connect(**db_config)

def get_all(limit=100, offset=0, parent_region_id=None, q=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = "SELECT region_id, region_name, description, region_image, parent_region_id FROM regions WHERE 1=1"
    params = []

    # Nếu có parent_region_id thì lọc theo
    if parent_region_id is not None:
        query += " AND parent_region_id = %s"
        params.append(parent_region_id)

    # Nếu có từ khóa tìm kiếm
    if q:
        query += " AND region_name LIKE %s"
        params.append(f"%{q}%")

    query += " ORDER BY region_id LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()

    cursor.close()
    conn.close()
    return rows


def get_by_id(region_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT region_id, region_name, description, region_image, parent_region_id FROM regions WHERE region_id = %s",
        (region_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


def create(data):
    conn = get_connection()
    cursor = conn.cursor()
    region_name = data.get("region_name")
    description = data.get("description")
    region_image = data.get("region_image")
    parent_region_id = data.get("parent_region_id")

    if parent_region_id not in [None, '', 'null']:
        try:
            parent_region_id = int(parent_region_id)
        except ValueError:
            parent_region_id = None

    cursor.execute("""
        INSERT INTO regions (region_name, description, region_image, parent_region_id)
        VALUES (%s, %s, %s, %s)
    """, (region_name, description, region_image, parent_region_id))

    conn.commit()
    new_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return new_id


def update(region_id, data):
    conn = get_connection()
    cursor = conn.cursor()

    fields = []
    values = []

    for field in ["region_name", "description", "region_image", "parent_region_id"]:
        if field in data:
            fields.append(f"{field} = %s")
            values.append(data[field])

    if not fields:
        return False

    values.append(region_id)
    query = f"UPDATE regions SET {', '.join(fields)} WHERE region_id = %s"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount

    cursor.close()
    conn.close()
    return affected > 0


def delete(region_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM regions WHERE region_id = %s", (region_id,))
    conn.commit()
    affected = cursor.rowcount
    cursor.close()
    conn.close()
    return affected > 0


# ✅ Hàm mới cho các vùng chính (Bắc, Trung, Nam)
def get_by_ids(region_ids):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = f"""
        SELECT region_id, region_name, description, region_image, parent_region_id
        FROM regions WHERE region_id IN ({','.join(['%s'] * len(region_ids))})
        ORDER BY region_id
    """
    cursor.execute(query, tuple(region_ids))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def get_main_regions():
    """
    Lấy danh sách các tỉnh thành theo vùng miền chính (Miền Bắc, Miền Trung, Miền Nam).
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT parent_region_id, GROUP_CONCAT(region_name) AS provinces
        FROM regions
        WHERE parent_region_id IN (1, 2, 3)
        GROUP BY parent_region_id
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows
