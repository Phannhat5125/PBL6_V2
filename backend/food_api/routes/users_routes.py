from flask import Blueprint, request, jsonify
import models.users_model as model

users_bp = Blueprint('users', __name__)


def _get_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = request.form.to_dict()
    return data or {}


@users_bp.route('/users', methods=['GET'])
def list_users():
    try:
        q = request.args.get('q')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        data = model.get_all(limit=limit, offset=offset, q=q)
        # remove any password_hash if present
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        u = model.get_by_id(user_id)
        if u:
            return jsonify(u), 200
        return jsonify({'message': 'Không tìm thấy user'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/users', methods=['POST'])
def create_user():
    try:
        data = _get_payload()
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Thiếu username, email hoặc password'}), 400

        # check uniqueness
        if model.find_by_username(data.get('username')):
            return jsonify({'error': 'Username đã tồn tại'}), 400
        if model.find_by_email(data.get('email')):
            return jsonify({'error': 'Email đã tồn tại'}), 400

        new_id = model.create_user(
            data.get('username'), data.get('email'), data.get('password'), data.get('full_name'), data.get('avatar')
        )
        return jsonify({'message': 'Tạo user thành công', 'user_id': new_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        data = _get_payload()
        if not data:
            return jsonify({'error': 'Thiếu dữ liệu để cập nhật'}), 400
        existing = model.get_by_id(user_id)
        if not existing:
            return jsonify({'message': 'Không tìm thấy user'}), 404

        # prevent changing to an existing username/email
        if 'username' in data:
            other = model.find_by_username(data.get('username'))
            if other and other.get('user_id') != user_id:
                return jsonify({'error': 'Username đã được sử dụng'}), 400
        if 'email' in data:
            other = model.find_by_email(data.get('email'))
            if other and other.get('user_id') != user_id:
                return jsonify({'error': 'Email đã được sử dụng'}), 400

        ok = model.update_user(user_id, data)
        if ok:
            return jsonify({'message': 'Cập nhật user thành công'}), 200
        return jsonify({'message': 'Không có thay đổi'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        existing = model.get_by_id(user_id)
        if not existing:
            return jsonify({'message': 'Không tìm thấy user'}), 404
        ok = model.delete_user(user_id)
        if ok:
            return jsonify({'message': 'Xóa user thành công'}), 200
        return jsonify({'error': 'Không thể xóa'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
