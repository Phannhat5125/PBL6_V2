import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Image } from 'lucide-react';
import { Categories, FoodAPI } from '../api';
import './CategoryManagement.css';

const CategoryManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: ''
  });

  // State for image handling
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Fetch categories and foods count
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Fetch categories
        const categoriesData = await Categories.listCategories({ limit: 1000 });
        console.log('Loaded categories:', categoriesData);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);

        // Fetch foods to count items per category
        const foodsData = await FoodAPI.list({ limit: 1000 });
        console.log('Loaded foods for counting:', foodsData);
        setFoods(Array.isArray(foodsData) ? foodsData : []);

      } catch (error) {
        console.error('Error loading data:', error);
        setError('Không thể tải dữ liệu danh mục');
        setCategories([]);
        setFoods([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Count foods per category
  const getFoodCountByCategory = (categoryId) => {
    return foods.filter(food => food.category_id === categoryId).length;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: ''
    });
    setSelectedImage(null);
    setImagePreview('');
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File được chọn không phải là hình ảnh');
      return;
    }

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Handle add new category
  const handleAdd = () => {
    setShowAddForm(true);
    setEditingCategory(null);
    resetForm();
    const imageInput = document.getElementById('categoryImageInput');
    if (imageInput) imageInput.value = '';
  };

  // Handle edit category
  const handleEdit = (category) => {
    setEditingCategory(category);
    setShowAddForm(true);
    
    setFormData({
      name: category.name || category.category_name || '',
      description: category.description || '',
      image: category.image || ''
    });
    
    // Set image preview from existing data
    setSelectedImage(null);
    if (category.image) {
      const imageUrl = category.image.startsWith('data:') ? 
        category.image : 
        `data:image/jpeg;base64,${category.image}`;
      setImagePreview(imageUrl);
    } else {
      setImagePreview('');
    }
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên danh mục');
      return;
    }

    try {
      let imageData = formData.image;
      
      // Convert selected image to base64 if new file selected
      if (selectedImage) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
          reader.onload = (e) => {
            const base64 = e.target.result.split('base64,')[1];
            resolve(base64);
          };
          reader.readAsDataURL(selectedImage);
        });
      } else if (imagePreview && imagePreview.startsWith('data:')) {
        // Extract base64 from existing preview
        imageData = imagePreview.split('base64,')[1];
      }

      const categoryData = {
        category_name: formData.name,
        name: formData.name, // for UI consistency
        description: formData.description,
        image: imageData
      };

      console.log('Category data to save:', categoryData);

      if (editingCategory) {
        // Update existing category
        await Categories.updateCategory(editingCategory.id, categoryData);
        setCategories(categories.map(cat => 
          cat.id === editingCategory.id ? 
          { ...cat, ...categoryData, id: editingCategory.id } : 
          cat
        ));
      } else {
        // Create new category
        const result = await Categories.createCategory(categoryData);
        const newId = result?.category_id || result?.id || Date.now();
        setCategories([{ ...categoryData, id: newId }, ...categories]);
      }

      setShowAddForm(false);
      resetForm();
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Lỗi lưu danh mục: ' + error.message);
    }
  };

  // Handle delete category
  const handleDelete = async (id, name) => {
    const foodCount = getFoodCountByCategory(id);
    
    let confirmMessage = `Bạn có chắc chắn muốn xóa danh mục "${name}"?`;
    if (foodCount > 0) {
      confirmMessage += `\n\nLưu ý: Có ${foodCount} món ăn thuộc danh mục này. Việc xóa danh mục sẽ không xóa các món ăn nhưng chúng sẽ không còn danh mục.`;
    }
    
    if (!window.confirm(confirmMessage)) return;

    try {
      await Categories.deleteCategory(id);
      setCategories(categories.filter(cat => cat.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Lỗi xóa danh mục: ' + error.message);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setShowAddForm(false);
    resetForm();
    setEditingCategory(null);
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category => {
    const name = category.name || category.category_name || '';
    const description = category.description || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           description.toLowerCase().includes(searchTerm.toLowerCase());
  });



  return (
    <div className="category-management-page">
      <div className="dashboard-content">
        {/* Search and Filter Controls */}
        <div className="search-controls-card">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="controls-right">
            <button
              className="btn btn-primary"
              onClick={handleAdd}
            >
              <Plus size={16} />
              Thêm danh mục
            </button>
          </div>
        </div>



        {error && <div className="error-message">Lỗi: {error}</div>}

        {/* Statistics */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-number">{categories.length}</div>
            <div className="stat-label">Tổng danh mục</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{foods.length}</div>
            <div className="stat-label">Tổng món ăn</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {categories.filter(cat => getFoodCountByCategory(cat.id) === 0).length}
            </div>
            <div className="stat-label">Danh mục trống</div>
          </div>
        </div>

        {/* Categories Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Ảnh</th>
                <th>Tên danh mục</th>
                <th>Mô tả</th>
                <th style={{ width: '120px' }}>Số món</th>
                <th style={{ width: '150px' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    Đang tải danh sách danh mục...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">
                    {searchTerm ? 'Không tìm thấy danh mục nào' : 'Chưa có danh mục nào'}
                  </td>
                </tr>
              ) : (
                filteredCategories.map(category => (
                  <tr key={category.id}>
                    <td>
                      <div className="category-image">
                        {category.image ? (
                          <img 
                            src={category.image.startsWith('data:') ? 
                              category.image : 
                              `data:image/jpeg;base64,${category.image}`
                            } 
                            alt={category.name || category.category_name} 
                          />
                        ) : (
                          <div className="no-image">
                            <Image size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="category-name">
                        {category.name || category.category_name || 'Chưa có tên'}
                      </div>
                    </td>
                    <td>
                      <div className="category-description">
                        {category.description || 'Chưa có mô tả'}
                      </div>
                    </td>
                    <td>
                      <div className="food-count">
                        <span className="count-badge">
                          {getFoodCountByCategory(category.id)} món
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn edit"
                          onClick={() => handleEdit(category)}
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(category.id, category.name || category.category_name)}
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h2>
                <button className="close-btn" onClick={handleCancel}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tên danh mục *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nhập tên danh mục"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Nhập mô tả danh mục"
                      rows={3}
                    />
                  </div>

                  {/* Image Section */}
                  <div className="form-group full-width">
                    <label>Ảnh danh mục</label>
                    <div className="image-upload-section">
                      <input
                        type="file"
                        id="categoryImageInput"
                        accept="image/*"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="image-select-btn"
                        onClick={() => document.getElementById('categoryImageInput').click()}
                      >
                        {imagePreview ? 'Thay đổi ảnh' : 'Chọn ảnh'}
                      </button>
                      {imagePreview && (
                        <div className="image-preview-grid">
                          <div className="image-preview-item">
                            <img src={imagePreview} alt="category-preview" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn secondary" onClick={handleCancel}>
                  Hủy
                </button>
                <button className="btn primary" onClick={handleSave}>
                  <Save size={16} />
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagementPage;