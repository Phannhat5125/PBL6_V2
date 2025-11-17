from flask import Blueprint, request, jsonify
import models.regions_model as model

regions_bp = Blueprint('regions', __name__)


def _get_payload():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        data = request.form.to_dict()
    return data or {}


@regions_bp.route('/regions', methods=['GET'])
def list_regions():
    try:
        q = request.args.get('q')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        parent_region_id = request.args.get('parent_region_id')

        # Convert parent_region_id to int nếu có
        prid = None
        if parent_region_id is not None and parent_region_id.lower() != 'null':
            try:
                prid = int(parent_region_id)
            except ValueError:
                return jsonify({'error': 'parent_region_id phải là số'}), 400

        data = model.get_all(limit=limit, offset=offset, parent_region_id=prid, q=q)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@regions_bp.route('/regions/<int:region_id>', methods=['GET'])
def get_region(region_id):
    try:
        r = model.get_by_id(region_id)
        if r:
            return jsonify(r), 200
        return jsonify({'message': 'Không tìm thấy region'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@regions_bp.route('/regions', methods=['POST'])
def create_region():
    try:
        data = _get_payload()
        if not data.get('region_name'):
            return jsonify({'error': 'Thiếu trường region_name'}), 400
        new_id = model.create(data)
        return jsonify({'message': 'Tạo region thành công', 'region_id': new_id}), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@regions_bp.route('/regions/<int:region_id>', methods=['PUT'])
def update_region(region_id):
    try:
        data = _get_payload()
        if not data:
            return jsonify({'error': 'Thiếu dữ liệu để cập nhật'}), 400
        existing = model.get_by_id(region_id)
        if not existing:
            return jsonify({'message': 'Không tìm thấy region'}), 404
        ok = model.update(region_id, data)
        if ok:
            return jsonify({'message': 'Cập nhật region thành công'}), 200
        return jsonify({'message': 'Không có thay đổi'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@regions_bp.route('/regions/<int:region_id>', methods=['DELETE'])
def delete_region(region_id):
    try:
        existing = model.get_by_id(region_id)
        if not existing:
            return jsonify({'message': 'Không tìm thấy region'}), 404
        ok = model.delete(region_id)
        if ok:
            return jsonify({'message': 'Xóa region thành công'}), 200
        return jsonify({'error': 'Không thể xóa'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ✅ Sửa lại cho phù hợp: không dùng NULL, mà lấy 3 id chính 1, 2, 3
@regions_bp.route('/regions/main-regions', methods=['GET'])
def get_main_regions():
    """Lấy các vùng miền chính và danh sách tỉnh thành thuộc vùng miền đó."""
    try:
        data = model.get_main_regions()
        region_names = {1: 'Miền Bắc', 2: 'Miền Trung', 3: 'Miền Nam'}
        result = [
            {
                'main_region_id': row['parent_region_id'],
                'main_region_name': region_names[row['parent_region_id']],
                'provinces': row['provinces'].split(',')
            }
            for row in data
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@regions_bp.route('/regions/<int:main_region_id>/provinces', methods=['GET'])
def get_provinces_by_main_region(main_region_id):
    """Lấy danh sách tỉnh thành theo vùng miền chính"""
    try:
        if main_region_id not in [1, 2, 3]:
            return jsonify({'error': 'main_region_id phải là 1 (Bắc), 2 (Trung), hoặc 3 (Nam)'}), 400

        provinces = model.get_all(parent_region_id=main_region_id, limit=200)
        region_names = {1: 'Miền Bắc', 2: 'Miền Trung', 3: 'Miền Nam'}
        result = {
            'main_region_id': main_region_id,
            'main_region_name': region_names[main_region_id],
            'provinces': provinces,
            'total': len(provinces)
        }
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ✅ Sửa lại cho đúng logic không dùng NULL
@regions_bp.route('/regions/hierarchy', methods=['GET'])
def get_regions_hierarchy():
    """Lấy cấu trúc phân cấp vùng miền (1=Bắc,2=Trung,3=Nam)"""
    try:
        all_regions = model.get_all(limit=1000)
        main_regions = [r for r in all_regions if r.get('region_id') in [1, 2, 3]]
        provinces = [r for r in all_regions if r.get('parent_region_id') in [1, 2, 3]]

        hierarchy = []
        for main_region in main_regions:
            region_provinces = [
                p for p in provinces if p.get('parent_region_id') == main_region.get('region_id')
            ]
            hierarchy.append({
                'region_id': main_region.get('region_id'),
                'region_name': main_region.get('region_name'),
                'description': main_region.get('description'),
                'region_image': main_region.get('region_image'),
                'provinces': region_provinces,
                'provinces_count': len(region_provinces)
            })

        return jsonify({
            'hierarchy': hierarchy,
            'total_main_regions': len(main_regions),
            'total_provinces': len(provinces)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
