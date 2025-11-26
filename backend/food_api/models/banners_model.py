import mysql.connector
from config import db_config
from datetime import datetime

# ===== FIX QUAN TRỌNG: HÀM CONNECT DB =====
def get_connection():
    return mysql.connector.connect(**db_config)


class BannersModel:

    @staticmethod
    def get_all(limit=100, offset=0, only_active=False):
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        if only_active:
            sql = "SELECT * FROM banners WHERE is_active = 1 ORDER BY banner_id DESC LIMIT %s OFFSET %s"
            cur.execute(sql, (limit, offset))
        else:
            sql = "SELECT * FROM banners ORDER BY banner_id DESC LIMIT %s OFFSET %s"
            cur.execute(sql, (limit, offset))

        rows = cur.fetchall()

        cur.close()
        conn.close()
        return rows


    @staticmethod
    def get_by_id(banner_id):
        conn = get_connection()
        cur = conn.cursor(dictionary=True)

        cur.execute("SELECT * FROM banners WHERE banner_id = %s", (banner_id,))
        row = cur.fetchone()

        cur.close()
        conn.close()
        return row


    @staticmethod
    def create(data):
        conn = get_connection()
        cur = conn.cursor()

        sql = "INSERT INTO banners (image, is_active, created_at) VALUES (%s, %s, %s)"

        cur.execute(sql, (
            data['image'],                 # URL
            data.get('is_active', 1),
            datetime.utcnow()
        ))

        conn.commit()
        banner_id = cur.lastrowid

        cur.close()
        conn.close()

        return {
            "banner_id": banner_id,
            "image": data['image'],
            "is_active": data.get('is_active', 1),
            "created_at": datetime.utcnow().isoformat()
        }


    @staticmethod
    def update(banner_id, data):
        conn = get_connection()
        cur = conn.cursor()

        sql = "UPDATE banners SET image = %s, is_active = %s WHERE banner_id = %s"
        cur.execute(sql, (
            data['image'],
            data.get('is_active', 1),
            banner_id
        ))

        conn.commit()

        cur.close()
        conn.close()

        return {"success": True}


    @staticmethod
    def delete(banner_id):
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("DELETE FROM banners WHERE banner_id = %s", (banner_id,))
        conn.commit()

        cur.close()
        conn.close()

        return {"success": True}
