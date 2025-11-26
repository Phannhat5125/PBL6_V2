import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Clock, User, ExternalLink, ChefHat } from 'lucide-react';
import { Recipes, FoodAPI } from '../api';
import './RecipeManagement.css';

const RecipeManagementPage = () => {
  const [recipes, setRecipes] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  const [formData, setFormData] = useState({
    food_id: '',
    title: '',
    description: '',
    instructions: '',
    video_url: '',
    prep_time_minutes: '',
    cook_time_minutes: '',
    author_id: ''
  });

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      // Fetch recipes data ngay lập tức để hiển thị đầu tiên
      try {
        const recipesData = await Recipes.list({ limit: 1000 });
        console.log('Loaded recipes:', recipesData);
        setRecipes(Array.isArray(recipesData) ? recipesData : []);
      } catch (error) {
        console.error('Error loading recipes:', error);
        setError('Không thể tải danh sách công thức');
      }
      
      // Sau đó fetch foods data để populate dropdown
      try {
        const foodsData = await FoodAPI.list({ limit: 1000 });
        console.log('Loaded foods:', foodsData);
        setFoods(Array.isArray(foodsData) ? foodsData : []);
      } catch (error) {
        console.error('Error loading foods:', error);
        // Không set error cho foods vì recipes vẫn có thể hiển thị được
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, []);

  // Debug: Log when recipes state changes (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Recipes state changed, new count:', recipes.length);
    }
  }, [recipes]);

  // Reset form
  const resetForm = () => {
    setFormData({
      food_id: '',
      title: '',
      description: '',
      instructions: '',
      video_url: '',
      prep_time_minutes: '',
      cook_time_minutes: '',
      author_id: ''
    });
    setEditingRecipe(null);
    setShowAddForm(false);
  };

  // Handle edit
  const handleEdit = (recipe) => {
    // Find the associated food to get its description
    const associatedFood = foods.find(f => f.food_id === recipe.food_id);
    
    setFormData({
      food_id: recipe.food_id || '',
      title: recipe.title || '',
      description: associatedFood?.description || '',
      instructions: recipe.instructions || '',
      video_url: recipe.video_url || '',
      prep_time_minutes: recipe.prep_time_minutes || '',
      cook_time_minutes: recipe.cook_time_minutes || '',
      author_id: recipe.author_id || ''
    });
    setEditingRecipe(recipe);
    setShowAddForm(true);
  };

  // Handle save
  const handleSave = async () => {
    console.log('💾 Saving recipe...');
    
    try {
      if (!formData.food_id || !formData.title || !formData.instructions) {
        setError('Vui lòng nhập đầy đủ thông tin bắt buộc (Món ăn, Tiêu đề, Công thức nấu ăn)');
        return;
      }

      // Exclude description from recipe payload (it goes to foods table)
      const { description, ...recipeData } = formData;
      const recipePayload = {
        ...recipeData,
        food_id: Number(formData.food_id), // Ensure food_id is a number
        prep_time_minutes: formData.prep_time_minutes ? Number(formData.prep_time_minutes) : null,
        cook_time_minutes: formData.cook_time_minutes ? Number(formData.cook_time_minutes) : null,
        author_id: formData.author_id && formData.author_id !== '' ? Number(formData.author_id) : null
      };

      console.log('Recipe payload to be sent:', recipePayload);

      // Update food description only if it has changed
      const selectedFood = foods.find(f => f.food_id === Number(formData.food_id));
      const newDescription = formData.description ? formData.description.trim() : '';
      const currentDescription = selectedFood?.description || '';
      
      if (selectedFood && newDescription !== currentDescription) {
        try {
          console.log('Updating food description:', formData.food_id);
          
          // Update local state immediately for faster UI
          setFoods(prevFoods => 
            prevFoods.map(f => 
              f.food_id === Number(formData.food_id) 
                ? { ...f, description: newDescription }
                : f
            )
          );
          
          // Then update server in background
          const foodUpdatePayload = {
            category_id: selectedFood.category_id,
            name: selectedFood.name,
            description: newDescription,
            ingredients: selectedFood.ingredients || [],
            main_image: selectedFood.main_image,
            origin_region_id: selectedFood.origin_region_id,
            avg_rating: selectedFood.avg_rating,
            most_popular: selectedFood.most_popular
          };
          
          await FoodAPI.update(formData.food_id, foodUpdatePayload);
          console.log('Food description updated successfully');
        } catch (foodErr) {
          console.error('Lỗi khi cập nhật mô tả món ăn:', foodErr);
          // Revert local state on error
          setFoods(prevFoods => 
            prevFoods.map(f => 
              f.food_id === Number(formData.food_id) 
                ? { ...f, description: currentDescription }
                : f
            )
          );
          setError('Lỗi khi cập nhật mô tả: ' + foodErr.message);
          return;
        }
      }

      if (editingRecipe) {
        console.log('🔄 Updating recipe:', editingRecipe.recipe_id);
        
        const updateResult = await Recipes.update(editingRecipe.recipe_id, recipePayload);
        console.log('✅ Recipe updated successfully');
        
        // Update local state immediately for instant UI feedback
        const updatedRecipeData = { ...editingRecipe, ...recipePayload };
        setRecipes(prevRecipes => 
          prevRecipes.map(r => r.recipe_id === editingRecipe.recipe_id ? updatedRecipeData : r)
        );
        
      } else {
        const newRecipe = await Recipes.create(recipePayload);
        console.log('✅ Recipe created successfully');
        
        // Add new recipe to local state immediately
        setRecipes(prevRecipes => [...prevRecipes, { ...recipePayload, recipe_id: newRecipe.recipe_id || Date.now() }]);
      }
      
      // Close modal and show success immediately after API success
      setError(''); // Clear any previous errors
      resetForm(); // This closes the modal immediately
      
      // Continue background refresh without blocking UI
      const refreshInBackground = async () => {
        try {
          if (editingRecipe) {
            // Update operations
            const shouldRefreshFoods = formData.description !== (foods.find(f => f.food_id === Number(formData.food_id))?.description || '');
            
            const refreshPromises = [
              Recipes.list({ limit: 1000, _t: Date.now() })
            ];
            
            if (shouldRefreshFoods) {
              refreshPromises.push(FoodAPI.list({ limit: 1000, _t: Date.now() }));
            }
            
            const results = await Promise.all(refreshPromises);
            const refreshedRecipes = results[0];
            const refreshedFoods = results[1];
            
            setRecipes(Array.isArray(refreshedRecipes) ? refreshedRecipes : []);
            
            if (refreshedFoods) {
              setFoods(Array.isArray(refreshedFoods) ? refreshedFoods : []);
            }
          } else {
            // Create operations
            const [refreshedRecipes, refreshedFoods] = await Promise.all([
              Recipes.list({ limit: 1000, _t: Date.now() }),
              FoodAPI.list({ limit: 1000, _t: Date.now() })
            ]);
            
            setRecipes(Array.isArray(refreshedRecipes) ? refreshedRecipes : []);
            setFoods(Array.isArray(refreshedFoods) ? refreshedFoods : []);
          }
          
          setForceUpdateKey(prev => prev + 1);
          console.log('✅ Data refreshed in background');
        } catch (refreshError) {
          console.error('Background refresh error:', refreshError);
        }
      };
      
      // Run refresh in background without waiting
      refreshInBackground();
      
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError('Lỗi khi lưu công thức: ' + err.message);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa công thức này?')) {
      try {
        await Recipes.delete(id);
        setRecipes(recipes.filter(r => r.recipe_id !== id));
        setError('');
      } catch (err) {
        setError('Lỗi khi xóa: ' + err.message);
      }
    }
  };

  // Filter recipes based on search
  const filteredRecipes = recipes.filter(recipe => 
    recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    foods.find(f => f.food_id === recipe.food_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get food name
  const getFoodName = (foodId) => {
    const food = foods.find(f => f.food_id === foodId);
    return food ? food.name : 'Không rõ';
  };

  return (
    <div className="page-container">
      <div className="dashboard-content">
        {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

        {/* Search Controls */}
        <div className="search-controls-card">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm công thức theo tiêu đề hoặc món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="controls-right">
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} />
              Thêm công thức
            </button>
          </div>
        </div>

      {/* Recipe Table */}
      <div className="recipes-table-container" key={forceUpdateKey}>
        <table className="recipes-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Mô tả</th>
              <th>Công thức nấu ăn</th>
              <th>Video hướng dẫn</th>
              <th>Thời gian chuẩn bị / nấu</th>
              <th>Tác giả</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="no-data">
                  Đang tải danh sách công thức...
                </td>
              </tr>
            ) : filteredRecipes.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  <div className="empty-message">Không tìm thấy công thức nào</div>
                </td>
              </tr>
            ) : (
              filteredRecipes.map((recipe) => (
                <tr key={recipe.recipe_id}>
                  <td>
                    <div className="recipe-info">
                      <div className="recipe-title">{recipe.title}</div>
                      <div className="recipe-food">{getFoodName(recipe.food_id)}</div>
                    </div>
                  </td>
                  <td>
                    <div className="recipe-description">
                      {(() => {
                        const food = foods.find(f => f.food_id === recipe.food_id);
                        return food?.description || 'Chưa có mô tả';
                      })()}
                    </div>
                  </td>
                  <td>
                    <div className="recipe-instructions">
                      {recipe.instructions ? (
                        <div className="instructions-preview">
                          {recipe.instructions.length > 100 
                            ? `${recipe.instructions.substring(0, 100)}...`
                            : recipe.instructions
                          }
                        </div>
                      ) : (
                        <span className="no-instructions">Chưa có công thức</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="video-cell">
                      {recipe.video_url ? (
                        <a 
                          href={recipe.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-link"
                        >
                          <ExternalLink size={16} />
                          Xem video
                        </a>
                      ) : (
                        <span className="no-video">Không có video</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="time-info">
                      {(recipe.prep_time_minutes !== null && recipe.prep_time_minutes !== undefined) && (
                        <div className="time-item">
                          <Clock size={12} />
                          Chuẩn bị: {recipe.prep_time_minutes}p
                        </div>
                      )}
                      {(recipe.cook_time_minutes !== null && recipe.cook_time_minutes !== undefined) && (
                        <div className="time-item">
                          <Clock size={12} />
                          Nấu: {recipe.cook_time_minutes}p
                        </div>
                      )}
                      {(recipe.prep_time_minutes === null || recipe.prep_time_minutes === undefined) && 
                       (recipe.cook_time_minutes === null || recipe.cook_time_minutes === undefined) && (
                        <span className="no-time">Chưa cập nhật</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="author-info">
                      {recipe.author_id ? (
                        <>
                          <div className="author-avatar">👨‍🍳</div>
                          <span className="author-name">Tác giả #{recipe.author_id}</span>
                        </>
                      ) : (
                        <span className="no-author">Chưa xác định</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(recipe)}
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={16} />
                      </button>
                      
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(recipe.recipe_id)}
                        title="Xóa công thức"
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
          <div className="modal-content recipe-form-modal">
            <div className="modal-header">
              <h2>{editingRecipe ? 'Sửa công thức' : 'Thêm công thức mới'}</h2>
              <button onClick={resetForm} className="btn-close">
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Tên món <span className="required">*</span></label>
                  <select
                    value={formData.food_id}
                    onChange={(e) => {
                      const selectedFoodId = e.target.value;
                      const selectedFood = foods.find(f => f.food_id === Number(selectedFoodId));
                      console.log('Selected food ID:', selectedFoodId, 'Found food:', selectedFood);
                      setFormData({ 
                        ...formData, 
                        food_id: selectedFoodId,
                        description: selectedFood?.description || ''
                      });
                    }}
                    className="form-select"
                  >
                    <option value="">Chọn món ăn</option>
                    {foods.length === 0 ? (
                      <option value="" disabled>Đang tải dữ liệu...</option>
                    ) : (
                      foods.map(food => (
                        <option key={food.food_id} value={food.food_id}>{food.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Title <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Nhập tiêu đề công thức"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn gọn về món ăn..."
                  rows={3}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Công thức nấu ăn <span className="required">*</span></label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Hướng dẫn chi tiết cách nấu món ăn..."
                  rows={6}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label>Link video hướng dẫn</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/..."
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Thời gian chuẩn bị (phút)</label>
                  <input
                    type="number"
                    value={formData.prep_time_minutes}
                    onChange={(e) => setFormData({ ...formData, prep_time_minutes: e.target.value })}
                    placeholder="15"
                    min="0"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Thời gian nấu (phút)</label>
                  <input
                    type="number"
                    value={formData.cook_time_minutes}
                    onChange={(e) => setFormData({ ...formData, cook_time_minutes: e.target.value })}
                    placeholder="30"
                    min="0"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>ID Tác giả </label>
                  <input
                    type="number"
                    value={formData.author_id}
                    onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
                    placeholder="1 (hoặc để trống)"
                    min="1"
                    max="5"
                    className="form-input"
                  />
                  {/* <small style={{color: '#666', fontSize: '12px'}}>
                    ID hợp lệ: 1-5 (alice, bob, carol, dung, minh) hoặc để trống
                  </small> */}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={resetForm} className="btn btn-secondary">
                <X size={20} />
                Hủy
              </button>
              <button onClick={handleSave} className="btn btn-primary">
                <Save size={20} />
                {editingRecipe ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default RecipeManagementPage;