from flask import Blueprint, request, jsonify
import cloudinary.uploader
import food_api.config as _config # Chỉ cần import config để load cấu hình

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload-image', methods=['POST'])
def upload_image():
    try:
        file = request.files.get('file')
        folder = request.form.get('folder', 'others')

        if not file:
            return jsonify({"error": "Không có file ảnh gửi lên"}), 400

        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image"
        )

        return jsonify({
            "message": "Upload thành công",
            "url": result["secure_url"]
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
