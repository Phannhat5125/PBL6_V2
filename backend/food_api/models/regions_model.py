import mysql.connector
from config import db_config

def get_connection():
    return mysql.connector.connect(**db_config)


def get_all(limit=100, offset=0, parent_region_id=None, q=None):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT region_id, region_name, description,
               region_image, parent_image, parent_region_id
        FROM regions
        WHERE 1=1
    """
    params = []

    if parent_region_id is not None:
        query += " AND parent_region_id = %s"
        params.append(parent_region_id)

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

    cursor.execute("""
        SELECT region_id, region_name, description,
               region_image, parent_image, parent_region_id
        FROM regions WHERE region_id = %s
    """, (region_id,))
    
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
    parent_image = data.get("parent_image")
    parent_region_id = data.get("parent_region_id")

    # Convert parent_region_id
    if parent_region_id in [None, '', 'null']:
        parent_region_id = None
    else:
        try:
            parent_region_id = int(parent_region_id)
        except:
            parent_region_id = None

    cursor.execute("""
        INSERT INTO regions (region_name, description, region_image, parent_image, parent_region_id)
        VALUES (%s, %s, %s, %s, %s)
    """, (region_name, description, region_image, parent_image, parent_region_id))

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

    for field in ["region_name", "description", "region_image", "parent_image", "parent_region_id"]:
        if field in data:

            if field == "parent_region_id":
                if data[field] in [None, '', 'null']:
                    values.append(None)
                else:
                    try:
                        values.append(int(data[field]))
                    except:
                        values.append(None)
            else:
                values.append(data[field])

            fields.append(f"{field} = %s")

    if not fields:
        return False

    values.append(region_id)
    query = f"UPDATE regions SET {', '.join(fields)} WHERE region_id = %s"

    cursor.execute(query, values)
    conn.commit()
    ok = cursor.rowcount

    cursor.close()
    conn.close()
    return ok > 0


def delete(region_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM regions WHERE region_id = %s", (region_id,))
    conn.commit()
    ok = cursor.rowcount
    cursor.close()
    conn.close()
    return ok > 0
