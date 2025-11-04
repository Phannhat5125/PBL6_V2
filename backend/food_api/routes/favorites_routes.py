from flask import Blueprint, request, jsonify
import models.favorites_model as model

favorites_bp = Blueprint('favorites', __name__)


def _get_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = request.form.to_dict()
    return data or {}


@favorites_bp.route('/favorites', methods=['GET'])
def list_favorites():
    try:
        user_id = request.args.get('user_id')
        limit = int(request.args.get('limit', 500))
        offset = int(request.args.get('offset', 0))
        if user_id is not None:
            try:
                uid = int(user_id)
                data = model.get_by_user(uid, limit=limit, offset=offset)
            except Exception:
                return jsonify({'error': 'user_id không hợp lệ'}), 400
        else:
            data = model.get_all(limit=limit, offset=offset)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@favorites_bp.route('/favorites', methods=['POST'])
def add_favorite():
    try:
        data = _get_payload()
        if 'user_id' not in data or 'food_id' not in data:
            return jsonify({'error': 'Thiếu user_id hoặc food_id'}), 400
        try:
            uid = int(data.get('user_id'))
            fid = int(data.get('food_id'))
        except Exception:
            return jsonify({'error': 'user_id và food_id phải là số nguyên'}), 400

        result = model.create(uid, fid)
        # result is {'created': bool, 'favorited_at': datetime}
        fav_ts = result.get('favorited_at')
        fav_str = fav_ts.isoformat() if hasattr(fav_ts, 'isoformat') else fav_ts
        if result.get('created'):
            return jsonify({'message': 'Đã thêm vào favorites', 'favorited_at': fav_str}), 201
        return jsonify({'message': 'Đã tồn tại trong favorites', 'favorited_at': fav_str}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@favorites_bp.route('/favorites/<int:user_id>/<int:food_id>', methods=['DELETE'])
def remove_favorite(user_id, food_id):
    try:
        existed = model.is_favorited(user_id, food_id)
        if not existed:
            return jsonify({'message': 'Không tìm thấy favorite'}), 404
        ok = model.delete(user_id, food_id)
        if ok:
            return jsonify({'message': 'Đã xóa favorite'}), 200
        return jsonify({'error': 'Không thể xóa'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
