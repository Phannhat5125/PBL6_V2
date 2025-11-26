from flask import Blueprint, request, jsonify
from models.banners_model import BannersModel

banners_bp = Blueprint('banners_bp', __name__)

# Lấy danh sách banner
@banners_bp.route('/banners', methods=['GET'])
def get_all_banners():
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    only_active = request.args.get('only_active', 'false').lower() == 'true'

    data = BannersModel.get_all(limit, offset, only_active)
    return jsonify(data)


# Lấy 1 banner
@banners_bp.route('/banners/<int:banner_id>', methods=['GET'])
def get_banner(banner_id):
    data = BannersModel.get_by_id(banner_id)
    if data:
        return jsonify(data)
    return jsonify({"error": "Banner không tồn tại"}), 404


# Tạo banner
@banners_bp.route('/banners', methods=['POST'])
def create_banner():
    data = request.json

    if not data.get('image'):
        return jsonify({'error': 'Thiếu trường image (URL)'}), 400

    new_banner = BannersModel.create(data)
    return jsonify(new_banner), 201


# Cập nhật banner
@banners_bp.route('/banners/<int:banner_id>', methods=['PUT'])
def update_banner(banner_id):
    data = request.json

    if not data.get('image'):
        return jsonify({'error': 'Thiếu trường image'}), 400

    result = BannersModel.update(banner_id, data)
    return jsonify(result)


# Xóa banner
@banners_bp.route('/banners/<int:banner_id>', methods=['DELETE'])
def delete_banner(banner_id):
    result = BannersModel.delete(banner_id)
    return jsonify(result)
