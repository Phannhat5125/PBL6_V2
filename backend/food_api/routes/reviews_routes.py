from flask import Blueprint, request, jsonify
import models.reviews_model as model

reviews_bp = Blueprint('reviews', __name__)


def _get_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = request.form.to_dict()
    return data or {}


@reviews_bp.route('/reviews', methods=['GET'])
def list_reviews():
    try:
        user_id = request.args.get('user_id')
        food_id = request.args.get('food_id')
        q = request.args.get('q')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))

        uid = int(user_id) if user_id is not None else None
        fid = int(food_id) if food_id is not None else None
        data = model.get_all(limit=limit, offset=offset, user_id=uid, food_id=fid, q=q)
        return jsonify(data), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/reviews/<int:review_id>', methods=['GET'])
def get_review(review_id):
    try:
        r = model.get_by_id(review_id)
        if r:
            return jsonify(r), 200
        return jsonify({'message': 'Không tìm thấy review'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/reviews', methods=['POST'])
def create_review():
    try:
        data = _get_payload()
        if 'user_id' not in data or 'food_id' not in data or 'rating' not in data:
            return jsonify({'error': 'Thiếu user_id, food_id hoặc rating'}), 400

        result = model.create(data)
        # result: {'created': bool, 'review_id': int, 'created_at': datetime}
        created = result.get('created')
        rid = result.get('review_id')
        ts = result.get('created_at')
        ts_str = ts.isoformat() if hasattr(ts, 'isoformat') else ts
        if created:
            return jsonify({'message': 'Tạo review thành công', 'review_id': rid, 'created_at': ts_str}), 201
        return jsonify({'message': 'Đã tồn tại review cho user-food', 'review_id': rid, 'created_at': ts_str}), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/reviews/<int:review_id>', methods=['PUT'])
def update_review(review_id):
    try:
        data = _get_payload()
        if not data:
            return jsonify({'error': 'Thiếu dữ liệu để cập nhật'}), 400

        existing = model.get_by_id(review_id)
        if not existing:
            return jsonify({'message': 'Không tìm thấy review'}), 404

        ok = model.update(review_id, data)
        if ok:
            return jsonify({'message': 'Cập nhật review thành công'}), 200
        return jsonify({'message': 'Không có thay đổi'}), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reviews_bp.route('/reviews/<int:review_id>', methods=['DELETE'])
def delete_review(review_id):
    try:
        existing = model.get_by_id(review_id)
        if not existing:
            return jsonify({'message': 'Không tìm thấy review'}), 404
        ok = model.delete(review_id)
        if ok:
            return jsonify({'message': 'Xóa review thành công'}), 200
        return jsonify({'error': 'Không thể xóa'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
