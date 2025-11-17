import mysql.connector
from config import db_config
from datetime import datetime
import base64


def get_connection():
    return mysql.connector.connect(**db_config)


def get_all(limit: int = 100, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT food_id, category_id, name, description, main_image, origin_region_id, avg_rating, most_popular, created_at, updated_at FROM foods ORDER BY food_id DESC LIMIT %s OFFSET %s", (limit, offset))
    rows = cur.fetchall()
    # Encode binary main_image to base64 string for JSON transport
    for r in rows:
        mi = r.get('main_image')
        if mi is not None:
            try:
                r['main_image'] = base64.b64encode(mi).decode('ascii')
            except Exception:
                r['main_image'] = None
        
        # Get ingredients for this food
        r['ingredients'] = get_ingredients_for_food(r['food_id'])
    cur.close(); conn.close()
    return rows


def get_all_with_nutrition(limit: int = 100, offset: int = 0):
    """Lấy danh sách foods kèm thông tin dinh dưỡng"""
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    
    # Join foods với nutrition_info
    query = """
    SELECT 
        f.food_id, f.category_id, f.name, f.description, f.main_image, f.origin_region_id, 
        f.avg_rating, f.most_popular, f.created_at, f.updated_at,
        n.serving_size, n.calories, n.protein, n.carbs, n.fat
    FROM foods f
    LEFT JOIN nutrition_info n ON f.food_id = n.food_id
    ORDER BY f.food_id DESC 
    LIMIT %s OFFSET %s
    """
    
    cur.execute(query, (limit, offset))
    rows = cur.fetchall()
    
    # Process data
    for r in rows:
        # Encode binary main_image to base64 string for JSON transport
        mi = r.get('main_image')
        if mi is not None:
            try:
                r['main_image'] = base64.b64encode(mi).decode('ascii')
            except Exception:
                r['main_image'] = None
        
        # Get ingredients for this food
        r['ingredients'] = get_ingredients_for_food(r['food_id'])
        
        # Group nutrition data
        r['nutrition'] = {
            'serving_size': r.get('serving_size'),
            'calories': r.get('calories'),
            'protein': r.get('protein'),
            'carbs': r.get('carbs'),
            'fat': r.get('fat')
        } if r.get('serving_size') or r.get('calories') else None
        
        # Remove individual nutrition fields from main object
        for field in ['serving_size', 'calories', 'protein', 'carbs', 'fat']:
            r.pop(field, None)
    
    cur.close(); conn.close()
    return rows


def get_ingredients_for_food(food_id: int):
    """Get list of ingredient names for a food"""
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    sql = """
    SELECT i.name, fi.quantity_desc, fi.is_primary 
    FROM food_ingredients fi 
    JOIN ingredients i ON fi.ingredient_id = i.ingredient_id 
    WHERE fi.food_id = %s 
    ORDER BY fi.is_primary DESC, i.name
    """
    cur.execute(sql, (food_id,))
    ingredients_data = cur.fetchall()
    cur.close(); conn.close()
    
    # Return just the names as a list for compatibility
    return [ing['name'] for ing in ingredients_data]


def search(query: str, limit: int = 100, offset: int = 0):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    like = f"%{query}%"
    # Search in food name and ingredient names
    sql = """
    SELECT DISTINCT f.food_id, f.category_id, f.name, f.description, f.main_image, f.origin_region_id, f.avg_rating, f.most_popular, f.created_at, f.updated_at
    FROM foods f
    LEFT JOIN food_ingredients fi ON f.food_id = fi.food_id
    LEFT JOIN ingredients i ON fi.ingredient_id = i.ingredient_id
    WHERE f.name LIKE %s OR i.name LIKE %s
    ORDER BY f.food_id DESC LIMIT %s OFFSET %s
    """
    cur.execute(sql, (like, like, limit, offset))
    rows = cur.fetchall()
    # Encode main_image and get ingredients
    for r in rows:
        mi = r.get('main_image')
        if mi is not None:
            try:
                r['main_image'] = base64.b64encode(mi).decode('ascii')
            except Exception:
                r['main_image'] = None
        
        # Get ingredients for this food
        r['ingredients'] = get_ingredients_for_food(r['food_id'])
    cur.close(); conn.close()
    return rows


def get_by_id(food_id: int):
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT food_id, category_id, name, description, main_image, origin_region_id, avg_rating, most_popular, created_at, updated_at FROM foods WHERE food_id=%s", (food_id,))
    row = cur.fetchone()
    if row:
        if row.get('main_image') is not None:
            try:
                row['main_image'] = base64.b64encode(row['main_image']).decode('ascii')
            except Exception:
                row['main_image'] = None
        
        # Get ingredients for this food
        row['ingredients'] = get_ingredients_for_food(food_id)
    cur.close(); conn.close()
    return row


def create(data):
    conn = get_connection()
    cur = conn.cursor()
    sql = "INSERT INTO foods (category_id, name, description, main_image, origin_region_id, avg_rating, most_popular) VALUES (%s, %s, %s, %s, %s, %s, %s)"
    
    vals = (
        data.get('category_id'),
        data.get('name'),
        data.get('description'),
        data.get('main_image'),
        data.get('origin_region_id'),
        data.get('avg_rating'),
        data.get('most_popular'),
    )
    cur.execute(sql, vals)
    conn.commit()
    new_id = cur.lastrowid
    
    # Handle ingredients separately through food_ingredients table
    ingredients = data.get('ingredients', [])
    if ingredients:
        save_food_ingredients(new_id, ingredients)
    
    cur.close(); 
    conn.close()
    return new_id


def save_food_ingredients(food_id: int, ingredients):
    """Save ingredients for a food using the food_ingredients relationship table"""
    if not ingredients:
        return
    
    # Convert string to list if needed
    if isinstance(ingredients, str):
        ingredients = [ing.strip() for ing in ingredients.split(',') if ing.strip()]
    
    conn = get_connection()
    cur = conn.cursor()
    
    # First, remove existing ingredients for this food
    cur.execute("DELETE FROM food_ingredients WHERE food_id = %s", (food_id,))
    
    # Then add new ingredients
    for ingredient_name in ingredients:
        if not ingredient_name.strip():
            continue
            
        # Find or create ingredient
        ingredient_id = get_or_create_ingredient(ingredient_name.strip())
        if ingredient_id:
            # Create food_ingredient relationship
            cur.execute(
                "INSERT IGNORE INTO food_ingredients (food_id, ingredient_id, quantity_desc, is_primary) VALUES (%s, %s, %s, %s)",
                (food_id, ingredient_id, '', 0)
            )
    
    conn.commit()
    cur.close(); conn.close()


def get_or_create_ingredient(name: str):
    """Get ingredient ID by name, create if doesn't exist"""
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    
    # Try to find existing ingredient
    cur.execute("SELECT ingredient_id FROM ingredients WHERE name = %s", (name,))
    result = cur.fetchone()
    
    if result:
        ingredient_id = result['ingredient_id']
    else:
        # Create new ingredient
        cur.execute("INSERT INTO ingredients (name) VALUES (%s)", (name,))
        conn.commit()
        ingredient_id = cur.lastrowid
    
    cur.close(); conn.close()
    return ingredient_id


def update(food_id: int, data: dict):
    conn = get_connection()
    cur = conn.cursor()
    # Build dynamic set clause depending on provided fields
    fields = []
    vals = []
    allowed = ['category_id', 'name', 'description', 'main_image', 'origin_region_id', 'avg_rating', 'most_popular']
    
    # Handle ingredients separately
    ingredients = data.pop('ingredients', None)
    
    for k in allowed:
        if k in data:
            if k == 'main_image':
                mi = data.get('main_image')
                if isinstance(mi, str):
                    try:
                        mi_bytes = base64.b64decode(mi)
                    except Exception:
                        mi_bytes = None
                else:
                    mi_bytes = mi
                fields.append(f"{k}=%s")
                vals.append(mi_bytes)
            else:
                fields.append(f"{k}=%s")
                vals.append(data.get(k))

    # always update updated_at
    fields.append("updated_at=%s")
    vals.append(datetime.utcnow())

    changed = False
    if fields:
        sql = "UPDATE foods SET " + ", ".join(fields) + " WHERE food_id=%s"
        vals.append(food_id)
        cur.execute(sql, tuple(vals))
        conn.commit()
        changed = cur.rowcount > 0

    # Update ingredients if provided
    if ingredients is not None:
        save_food_ingredients(food_id, ingredients)
        changed = True

    cur.close(); conn.close()
    return changed


def delete(food_id: int):
    conn = get_connection()
    cur = conn.cursor()
    # First delete related food_ingredients
    cur.execute("DELETE FROM food_ingredients WHERE food_id=%s", (food_id,))
    # Then delete the food
    cur.execute("DELETE FROM foods WHERE food_id=%s", (food_id,))
    conn.commit()
    changed = cur.rowcount
    cur.close(); conn.close()
    return changed > 0


def get_food_ingredients_details(food_id: int):
    """Get detailed ingredients info for a food including images"""
    conn = get_connection()
    cur = conn.cursor(dictionary=True)
    sql = """
    SELECT i.ingredient_id, i.name, i.image, fi.quantity_desc, fi.is_primary 
    FROM food_ingredients fi 
    JOIN ingredients i ON fi.ingredient_id = i.ingredient_id 
    WHERE fi.food_id = %s 
    ORDER BY fi.is_primary DESC, i.name
    """
    cur.execute(sql, (food_id,))
    ingredients_data = cur.fetchall()
    
    # Encode images
    for ing in ingredients_data:
        img = ing.get('image')
        if img is not None:
            try:
                ing['image'] = base64.b64encode(img).decode('ascii')
            except Exception:
                ing['image'] = None
        ing['is_primary'] = bool(ing.get('is_primary'))
    
    cur.close(); conn.close()
    return ingredients_data
