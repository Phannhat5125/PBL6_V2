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

        if user_id:
            uid = int(user_id)
            data = model.get_by_user(uid, limit=limit, offset=offset)
        else:
            data = model.get_all(limit=limit, offset=offset)

        return jsonify(data), 200

    except:
        return jsonify({'error': 'Tham số không hợp lệ'}), 400


@favorites_bp.route('/favorites', methods=['POST'])
def add_favorite():
    try:
        data = _get_payload()
        if 'user_id' not in data or 'food_id' not in data:
            return jsonify({'error': 'Thiếu user_id hoặc food_id'}), 400

        uid = int(data['user_id'])
        fid = int(data['food_id'])

        result = model.create(uid, fid)
        ts = result['favorited_at']

        return jsonify({
            'message': 'Đã thêm' if result['created'] else 'Đã tồn tại',
            'favorited_at': ts.isoformat()
        }), 201 if result['created'] else 200

    except:
        return jsonify({'error': 'Dữ liệu không hợp lệ'}), 400


@favorites_bp.route('/favorites/<int:user_id>/<int:food_id>', methods=['DELETE'])
def remove_favorite(user_id, food_id):
    existed = model.is_favorited(user_id, food_id)
    if not existed:
        return jsonify({'message': 'Không tìm thấy favorite'}), 404

    ok = model.delete(user_id, food_id)

    if ok:
        return jsonify({'message': 'Đã xóa favorite'}), 200
    else:
        return jsonify({'error': 'Không thể xóa'}), 500
