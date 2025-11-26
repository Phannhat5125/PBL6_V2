from flask import Blueprint, request, jsonify
import models.food_model as model

food_bp = Blueprint("food", __name__)


def _payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = request.form.to_dict()
    return data or {}


# ==========================================================
# LIST FOODS
# ==========================================================
@food_bp.route("/foods", methods=["GET"])
def list_foods():
    try:
        q = request.args.get("q")
        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))

        if q:
            data = model.search(q, limit, offset)
        else:
            data = model.get_all(limit, offset)

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# GET BY ID
# ==========================================================
@food_bp.route("/foods/<int:food_id>", methods=["GET"])
def get_food(food_id):
    try:
        f = model.get_by_id(food_id)
        if f:
            return jsonify(f), 200
        return jsonify({"message": "Không tìm thấy"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# CREATE FOOD
# ==========================================================
@food_bp.route("/foods", methods=["POST"])
def create_food():
    try:
        data = _payload()

        # convert types
        if "ingredients" in data:
            if isinstance(data["ingredients"], str):
                data["ingredients"] = [i.strip() for i in data["ingredients"].split(",")]

        if "avg_rating" in data:
            data["avg_rating"] = float(data["avg_rating"])

        if "most_popular" in data:
            data["most_popular"] = int(data["most_popular"])

        if "category_id" in data:
            data["category_id"] = int(data["category_id"])

        if "origin_region_id" in data:
            data["origin_region_id"] = int(data["origin_region_id"])

        new_id = model.create(data)
        return jsonify({"message": "Thêm thành công", "food_id": new_id}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# UPDATE FOOD
# ==========================================================
@food_bp.route("/foods/<int:food_id>", methods=["PUT"])
def update_food(food_id):
    try:
        data = _payload()

        if "ingredients" in data:
            if isinstance(data["ingredients"], str):
                data["ingredients"] = [i.strip() for i in data["ingredients"].split(",")]

        ok = model.update(food_id, data)
        return jsonify({"message": "Cập nhật thành công"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==========================================================
# DELETE FOOD
# ==========================================================
@food_bp.route("/foods/<int:food_id>", methods=["DELETE"])
def delete_food(food_id):
    try:
        ok = model.delete(food_id)
        if ok:
            return jsonify({"message": "Xóa thành công"}), 200
        return jsonify({"message": "Không tìm thấy"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
