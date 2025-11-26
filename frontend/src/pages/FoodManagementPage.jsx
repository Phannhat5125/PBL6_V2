import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X } from 'lucide-react';
import { FoodAPI, Categories, FoodImages, Nutrition, Recipes, Regions } from '../api';
import axios from 'axios'; // Giữ lại để fallback
import './FoodManagement.css';

const FoodManagementPage = () => {
  const [foods, setFoods] = useState([]); // start empty, load from backend
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    region: '',
    category_id: '',
    image: '',
    ingredients: '',
    province: ''
  });
  const [categories, setCategories] = useState([]);
  // Ảnh chính (main_image)
  const [mainImage, setMainImage] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState('');

  // Ảnh phụ (food_images)
  const [additionalImages, setAdditionalImages] = useState([]); // files
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]); // { id, src }

  // nutrition fields
  const [nutrition, setNutrition] = useState({ serving_size: '', calories: '', protein: '', carbs: '', fat: '' });
  // recipe fields (single recipe for simplicity)
  const [recipe, setRecipe] = useState({ title: '', instructions: '', video_url: '', prep_time_minutes: '', cook_time_minutes: '' });

  const [allRegions, setAllRegions] = useState([]);
  const [regionsList, setRegionsList] = useState([]); // top-level regions
  const [provincesList, setProvincesList] = useState([]); // child regions (provinces)

  // Thêm state để track khi regions đã được load
  const [regionsLoaded, setRegionsLoaded] = useState(false);

  // Helper function để convert raw data từ fallback API
  const convertRawRegionData = (rawData) => {
    return rawData.map(item => ({
      id: item.region_id,
      name: item.region_name,
      image: item.region_image,
      parent_region_id: item.parent_region_id
    }));
  };

  // Hàm lấy danh sách tỉnh thành theo region_id
  const loadProvincesByRegion = async (regionId) => {
    if (!regionId) {
      setProvincesList([]);
      return;
    }

    try {
      // Sử dụng API wrapper để lấy tỉnh thành theo region
      const provinces = await Regions.getProvincesByRegion(regionId);
      setProvincesList(provinces || []);
      console.log(`Loaded ${provinces.length} provinces for region ${regionId}`);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách tỉnh thành:', error);
      // Fallback: lọc từ allRegions nếu đã có dữ liệu 
      const provinces = allRegions.filter(r => r.parent_region_id === Number(regionId));
      // Convert format nếu cần thiết
      const convertedProvinces = provinces.length > 0 && !provinces[0].id ?
        convertRawRegionData(provinces) : provinces;
      setProvincesList(convertedProvinces);
    }
  };

  useEffect(() => {
    const fetchFoods = async () => {
      setLoading(true);
      setError('');
      
      // Fetch foods data với timeout ngắn để tránh hang
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
        
        const foodsData = await FoodAPI.list({ limit: 1000, signal: controller.signal });
        clearTimeout(timeoutId);
        
        console.log('Loaded foods sample:', foodsData?.[0]);
        setFoods(Array.isArray(foodsData) ? foodsData : []);
      } catch (error) {
        console.error('Error loading foods:', error);
        if (error.name === 'AbortError') {
          setError('Timeout khi tải dữ liệu - vui lòng thử lại');
        } else {
          setError('Không thể tải danh sách món ăn');
        }
      }

      // Sau đó fetch các dữ liệu phụ song song
      try {
        const [categoriesResult, regionsResult] = await Promise.allSettled([
          Categories.listCategories({ limit: 500 }),
          Regions.getAllRegionsWithClassification()
        ]);

        // Xử lý categories data
        if (categoriesResult.status === 'fulfilled') {
          console.log('Loaded categories:', categoriesResult.value);
          setCategories(categoriesResult.value || []);
        } else {
          console.warn('load categories error:', categoriesResult.reason);
        }

        // Xử lý regions data
        if (regionsResult.status === 'fulfilled') {
          const { mainRegions, provinces } = regionsResult.value;
          setAllRegions([...mainRegions, ...provinces]);
          setRegionsList(mainRegions);
          console.log('Loaded regions:', {
            total: mainRegions.length + provinces.length,
            mainRegions: mainRegions.length,
            provinces: provinces.length
          });
          setRegionsLoaded(true);
        } else {
          console.error('Error loading regions:', regionsResult.reason);
          // Fallback: try direct API call
          try {
            const response = await axios.get('http://localhost:5000/api/regions?limit=1000');
            if (Array.isArray(response.data)) {
              const rawData = response.data;
              const allRegs = convertRawRegionData(rawData);
              setAllRegions(allRegs);
              const mainRegions = allRegs.filter(r => r.parent_region_id === null || r.parent_region_id === undefined);
              setRegionsList(mainRegions);
              setRegionsLoaded(true);
            }
          } catch (fallbackError) {
            console.error('Fallback regions error:', fallbackError);
            setRegionsList([]);
            setAllRegions([]);
          }
        }
      } catch (e) {
        console.error('Error in fetchData:', e);
        // Không set error để không ảnh hưởng UI nếu foods đã load
      } finally {
        setLoading(false);
      }
    };
    fetchFoods();
  }, []);

  // useEffect để update form khi regions được load và đang edit
  useEffect(() => {
    if (regionsLoaded && editingFood && regionsList.length > 0) {
      // Tìm lại region ID từ tên region
      if (editingFood.region && !formData.region) {
        const foundRegion = regionsList.find(r => r.name === editingFood.region);
        if (foundRegion) {
          const regionId = String(foundRegion.id);
          setFormData(prev => ({ ...prev, region: regionId }));
          // Load provinces
          loadProvincesByRegion(regionId);
          console.log('Auto-updated region from loaded data:', { region: editingFood.region, regionId });
        }
      }
    }
  }, [regionsLoaded, editingFood, regionsList, formData.region]);

  const resetForm = () => {
    setFormData({
      name: '',
      region: '',
      category_id: '',
      ingredients: '',
      image: '',

      province: ''
    });
    setMainImage(null);
    setMainImagePreview('');
    setAdditionalImages([]);
    setAdditionalImagePreviews([]);
    setExistingImages([]);
    setNutrition({ serving_size: '', calories: '', protein: '', carbs: '', fat: '' });
    setRecipe({ title: '', instructions: '', video_url: '', prep_time_minutes: '', cook_time_minutes: '' });
    setProvincesList([]);
  };

  // Handle main image selection
  const handleMainImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File được chọn không phải là hình ảnh');
      return;
    }

    setMainImage(file);

    const reader = new FileReader();
    reader.onload = (ev) => setMainImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Handle additional images selection
  const handleAdditionalImagesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.type && f.type.startsWith('image/'));
    if (valid.length !== files.length) alert('Một số file không phải hình ảnh đã bị bỏ qua');

    setAdditionalImages(prev => [...prev, ...valid]);

    // generate previews
    const readers = valid.map(f => {
      return new Promise((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target.result);
        r.readAsDataURL(f);
      });
    });
    Promise.all(readers).then(results => setAdditionalImagePreviews(prev => [...prev, ...results]));
  };

  // upload image files (File objects) to backend for a given food id
  async function uploadImagesForFood(foodId, files) {
    const toBase64 = (file) => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split('base64,')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    for (const f of files) {
      try {
        const b64 = await toBase64(f);
        await FoodImages.create({ food_id: foodId, image_data: b64 });
      } catch (err) {
        console.warn('upload image error', err);
      }
    }
  }

  async function saveNutrition(foodId) {
    // if all nutrition fields empty, skip
    const has = Object.values(nutrition).some(v => v !== '' && v !== null && v !== undefined);
    if (!has) return;
    try {
      // check exists
      const existing = await Nutrition.get(foodId);
      if (existing && existing.id) {
        await Nutrition.update(foodId, { ...nutrition });
      } else {
        await Nutrition.create({ food_id: foodId, ...nutrition });
      }
    } catch (err) {
      // if not found or API returned error, try create
      try {
        await Nutrition.create({ food_id: foodId, ...nutrition });
      } catch (e) {
        console.warn('saveNutrition error', e);
      }
    }
  }

  async function saveRecipe(foodId) {
    if (!recipe.title || !recipe.instructions) return;
    try {
      await Recipes.create({ food_id: foodId, ...recipe });
    } catch (err) {
      console.warn('saveRecipe error', err);
    }
  }

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingFood(null);
    resetForm();
    const mainImageInput = document.getElementById('mainImageInput');
    const additionalImagesInput = document.getElementById('additionalImagesInput');
    if (mainImageInput) mainImageInput.value = '';
    if (additionalImagesInput) additionalImagesInput.value = '';
  };

  const handleEdit = (food) => {
    setEditingFood(food);
    setShowAddForm(true);
    const imageToUse = food.main_image || food.image;
    
    // Tìm region ID từ tên region hoặc parent_region_id từ origin_region_id
    let regionId = '';
    
    if (food.origin_region_id) {
      // Tìm region trong allRegions theo origin_region_id
      const region = allRegions.find(r => r.id === food.origin_region_id);
      if (region) {
        // Nếu là tỉnh thành (có parent_region_id), lấy parent
        // Nếu là vùng chính (không có parent_region_id), lấy chính nó
        regionId = region.parent_region_id || region.id;
      }
    }
    
    if (!regionId && food.region && regionsList.length > 0) {
      // Nếu không có origin_region_id hoặc không tìm được, tìm từ tên region
      const foundRegion = regionsList.find(r => r.name === food.region);
      regionId = foundRegion ? foundRegion.id : '';
    }
    
    // Đảm bảo regionId là string để match với option value
    regionId = regionId ? String(regionId) : '';
    
    setFormData({
      name: food.name,
      region: regionId,
      category_id: food.category_id || '',
      ingredients: Array.isArray(food.ingredients) ? food.ingredients.join(', ') : (food.ingredients || ''),
      image: imageToUse,
      province: food.province
    });
    
    // Load provinces khi edit, nếu có region được chọn
    if (regionId) {
      loadProvincesByRegion(regionId);
    }
    
    // Debug log
    console.log('Edit food data:', {
      food_region: food.region,
      food_province: food.province, 
      food_origin_region_id: food.origin_region_id,
      selected_region_id: regionId,
      regionsList_length: regionsList.length,
      regionsList_sample: regionsList.slice(0, 2),
      formData_will_be_set: { name: food.name, region: regionId }
    });
    
    // Set main image (from foods.main_image field or fallback to image)
    setMainImage(null);
    setMainImagePreview(imageToUse || '');

    // Reset additional images
    setAdditionalImages([]);
    setAdditionalImagePreviews([]);

    // load existing additional images from food_images table
    (async () => {
      try {
        const imgs = await FoodImages.list({ food_id: food.id });
        // imgs could be array of { id, image_data } where image_data may be base64 or dataURL
        const mapped = (imgs || []).map(img => {
          let src = img.image_data || img.src || img.data || null;
          if (src && !src.startsWith('data:')) {
            // assume base64 without data prefix; default to jpeg
            src = `data:image/jpeg;base64,${src}`;
          }
          return { id: img.id || img.image_id || img.food_image_id || null, src };
        });
        setExistingImages(mapped);
      } catch (e) {
        console.warn('load existing images', e);
      }

      try {
        const nut = await Nutrition.get(food.id);
        if (nut) setNutrition({ serving_size: nut.serving_size || '', calories: nut.calories || '', protein: nut.protein || '', carbs: nut.carbs || '', fat: nut.fat || '' });
      } catch (e) {
        // ignore
      }

      try {
        const recs = await Recipes.list({ food_id: food.id, limit: 10 });
        if (Array.isArray(recs) && recs.length > 0) {
          const r = recs[0];
          setRecipe({ title: r.title || '', instructions: r.instructions || '', video_url: r.video_url || '', prep_time_minutes: r.prep_time_minutes || '', cook_time_minutes: r.cook_time_minutes || '' });
        }
      } catch (e) {
        // ignore
      }
    })();
  };

  const handleDeleteExistingImage = async (imageId) => {
    if (!imageId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa hình ảnh này?')) return;
    try {
      await FoodImages.delete(imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      setAdditionalImagePreviews(prev => prev.filter(src => !existingImages.find(e => e.id === imageId && e.src === src)));
    } catch (e) {
      console.warn('delete image', e);
      alert('Xóa hình ảnh thất bại');
    }
  };

  const handleSave = async () => {
    const ingredientsArray = formData.ingredients.split(',').map(item => item.trim()).filter(item => item);

    // Sử dụng main image (từ mainImagePreview hoặc existing main image)
    let mainImageUrl = '';
    if (mainImagePreview) {
      mainImageUrl = mainImagePreview; // có thể là data URL từ file mới hoặc existing image
    } else if (formData.image) {
      mainImageUrl = formData.image; // fallback to existing
    }

    // Tìm tên vùng miền từ ID (sử dụng mapped data từ API wrapper)
    const selectedRegion = regionsList.find(r => r.id === Number(formData.region));
    const regionName = selectedRegion ? selectedRegion.name : '';

    // Tìm tên danh mục từ ID
    const selectedCategory = categories.find(c => c.id === Number(formData.category_id));
    const categoryName = selectedCategory ? selectedCategory.name : '';

    const foodData = {
      name: formData.name,
      category_id: formData.category_id || null,
      category_name: categoryName, // thêm tên danh mục để hiển thị
      origin_region_id: formData.region ? Number(formData.region) : null,
      region: regionName, // thêm tên vùng miền để hiển thị
      main_image: mainImageUrl, // gửi main image
      ingredients: ingredientsArray,
      province: formData.province
    };
    console.log('foodData to save:', foodData);
    console.log('mainImagePreview:', mainImagePreview);
    console.log('additionalImages:', additionalImages);
    console.log('mainImageUrl used:', mainImageUrl);

    try {
      if (editingFood) {
        await FoodAPI.update(editingFood.id, foodData);
        // upload any new additional images
        if (additionalImages.length) await uploadImagesForFood(editingFood.id, additionalImages);
        // update nutrition
        await saveNutrition(editingFood.id);
        // save recipe (create)
        if (recipe.title && recipe.instructions) await saveRecipe(editingFood.id);
        setFoods(foods.map(f => f.id === editingFood.id ? { 
          ...f, 
          ...foodData, 
          image: foodData.main_image, 
          main_image: foodData.main_image, 
          id: editingFood.id 
        } : f));
      } else {
        const resp = await FoodAPI.create(foodData);
        const newId = resp?.food_id || resp?.id || Date.now();
        // upload additional images for created food
        if (additionalImages.length) await uploadImagesForFood(newId, additionalImages);
        // nutrition
        await saveNutrition(newId);
        // recipe
        if (recipe.title && recipe.instructions) await saveRecipe(newId);
        setFoods([{ ...foodData, image: foodData.main_image, id: newId }, ...foods]);
      }
      setShowAddForm(false);
      resetForm();
      setEditingFood(null);
    } catch (e) {
      alert('Lỗi lưu: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa món ăn này?')) return;
    try {
      await FoodAPI.delete(id);
      setFoods(foods.filter(f => f.id !== id));
    } catch (e) {
      alert('Lỗi xóa: ' + e.message);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    resetForm();
    setEditingFood(null);
  };

  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (food.region && food.region.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Sửa logic lọc: tìm parent_region_id từ allRegions
    let matchesRegion = filterRegion === '';
    if (!matchesRegion && food.origin_region_id) {
      // Tìm region trong allRegions theo origin_region_id
      const region = allRegions.find(r => r.id === food.origin_region_id);
      if (region) {
        // Nếu là tỉnh thành (có parent_region_id), so sánh với parent
        // Nếu là vùng chính (không có parent_region_id), so sánh trực tiếp
        const parentRegionId = region.parent_region_id || region.id;
        matchesRegion = parentRegionId === Number(filterRegion);
      }
    }
    
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="food-management-page">
      <div className="dashboard-content">
        {/* Search Controls */}
        <div className="search-controls-card">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="controls-right">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="filter-select"
            >
              <option value="">Tất cả vùng miền</option>
              {(Array.isArray(regionsList) ? regionsList : []).map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
            
            <button
              className="btn btn-primary"
              onClick={handleAdd}
            >
              <Plus size={16} />
              Thêm món ăn
            </button>
          </div>
        </div>

        {error && <div className="error-message">Lỗi: {error}</div>}

      {/* Food Grid */}
      <div className="food-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1' }} className="no-data">
            Đang tải danh sách món ăn...
          </div>
        ) : filteredFoods.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            {searchTerm || filterRegion ? 'Không tìm thấy món ăn nào' : 'Chưa có món ăn nào'}
          </div>
        ) : (
          filteredFoods.map(food => (
          <div key={food.id} className="food-card">
            <div className="food-image">
              <img src={food.main_image || food.image || '/placeholder-food.jpg'} alt={food.name} />
              <div className="food-actions">
                <button
                  className="action-btn edit"
                  onClick={() => handleEdit(food)}
                  title="Chỉnh sửa"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(food.id)}
                  title="Xóa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="food-info">
              <div className="food-header">
                <h3 className="food-name">{food.name}</h3>
                <span className="food-category">
                  {categories.find(c => c.id === Number(food.category_id))?.name || 'Chưa xác định'}
                </span>
              </div>

              <div className="food-details">
                <div className="detail-item">
                  <span className="detail-label">Miền:</span>
                  <span className="detail-value">{food.region || 'Chưa xác định'}</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Tỉnh thành:</span>
                  <span className="detail-value">{food.province || 'Chưa xác định'}</span>
                </div>
              </div>

              {/* Nutrition Information */}
              <div className="nutrition-info">
                <span className="detail-label">Dinh dưỡng:</span>
                <div className="nutrition-details">
                  {food.nutrition ? (
                    <div style={{ 
                      borderRadius: '12px', 
                      padding: '12px'
                    }}>
                      {food.nutrition.serving_size && (
                        <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                          {/* Hàng 1: Khẩu phần + Calories */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '6px', fontSize: '12px' }}>
                            <span style={{ 
                              background: '#f3f4f6', 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              fontWeight: '500',
                              color: '#374151'
                            }}>
                              📏 Khẩu phần: {food.nutrition.serving_size}
                            </span>
                            <span style={{ 
                              background: '#fef3c7', 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              fontWeight: '500',
                              color: '#92400e'
                            }}>
                              🔥 {food.nutrition.calories} kcal
                            </span>
                          </div>
                          
                          {/* Hàng 2: Protein + Carbs + Fat */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                            <span style={{ 
                              background: '#fce7f3', 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              fontWeight: '500',
                              color: '#be185d'
                            }}>
                              💪 {food.nutrition.protein}g protein
                            </span>
                            <span style={{ 
                              background: '#ecfdf5', 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              fontWeight: '500',
                              color: '#059669'
                            }}>
                              🌾 {food.nutrition.carbs}g carbs
                            </span>
                            <span style={{ 
                              background: '#f3e8ff', 
                              padding: '4px 8px', 
                              borderRadius: '6px', 
                              fontWeight: '500',
                              color: '#7c3aed'
                            }}>
                              🥑 {food.nutrition.fat}g fat
                            </span>
                          </div>
                        </div>
                      )}
                      {!food.nutrition.serving_size && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {food.nutrition.calories && (
                            <span style={{ 
                              background: '#fef3c7', 
                              padding: '4px 8px', 
                              borderRadius: '8px', 
                              fontSize: '12px',
                              fontWeight: '500',
                              color: '#92400e'
                            }}>
                              🔥 {food.nutrition.calories} kcal
                            </span>
                          )}
                          {food.nutrition.protein && (
                            <span style={{ 
                              background: '#fce7f3', 
                              padding: '4px 8px', 
                              borderRadius: '8px', 
                              fontSize: '12px',
                              fontWeight: '500',
                              color: '#be185d'
                            }}>
                              💪 {food.nutrition.protein}g
                            </span>
                          )}
                          {food.nutrition.carbs && (
                            <span style={{ 
                              background: '#ecfdf5', 
                              padding: '4px 8px', 
                              borderRadius: '8px', 
                              fontSize: '12px',
                              fontWeight: '500',
                              color: '#059669'
                            }}>
                              🌾 {food.nutrition.carbs}g
                            </span>
                          )}
                          {food.nutrition.fat && (
                            <span style={{ 
                              background: '#f3e8ff', 
                              padding: '4px 8px', 
                              borderRadius: '8px', 
                              fontSize: '12px',
                              fontWeight: '500',
                              color: '#7c3aed'
                            }}>
                              🥑 {food.nutrition.fat}g
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="nutrition-empty" style={{ 
                      color: '#6b7280', 
                      fontSize: '13px',
                      fontStyle: 'italic'
                    }}>
                      Chưa có thông tin
                    </span>
                  )}
                </div>
              </div>

              {/* Ingredients */}
              {/* Ingredients */}
              <div className="ingredients-info">
                <span className="detail-label">Nguyên liệu:</span>
                <div className="ingredients-details">
                  <div style={{ 
                    borderRadius: '12px', 
                    padding: '12px'
                  }}>
                    <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px' }}>
                  {(Array.isArray(food.ingredients) ? food.ingredients :
                    (food.ingredients ? food.ingredients.split(', ') : [])
                  ).slice(0, 4).map((ingredient, index) => (
                    <span 
                      key={index} 
                      style={{ 
                        background: '#e0f2fe', 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        fontWeight: '500',
                        color: '#0369a1',
                        border: '1px solid #bae6fd'
                      }}
                    >
                      {ingredient}
                    </span>
                  ))}
                  {(Array.isArray(food.ingredients) ? food.ingredients :
                    (food.ingredients ? food.ingredients.split(', ') : [])
                  ).length > 4 && (
                    <span style={{ 
                      background: '#f3f4f6', 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontWeight: '500',
                      color: '#6b7280',
                      border: '1px solid #d1d5db'
                    }}>
                      +{(Array.isArray(food.ingredients) ? food.ingredients :
                        (food.ingredients ? food.ingredients.split(', ') : [])
                      ).length - 4}
                    </span>
                  )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingFood ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}</h2>
              <button className="close-btn" onClick={handleCancel}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Tên món ăn</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nhập tên món ăn"
                  />
                </div>

                <div className="form-group">
                  <label>Danh mục <span style={{fontSize: '12px', color: '#666'}}>({categories.length} danh mục)</span></label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <div style={{fontSize: '12px', color: 'red', marginTop: '4px'}}>
                      Không tải được danh sách danh mục. Kiểm tra Console và Network tab.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Vùng miền</label>
                  <select
                    value={formData.region}
                    onChange={(e) => {
                      const regionId = e.target.value;
                      console.log('Region changed:', regionId);
                      setFormData({ ...formData, region: regionId, province: '' });
                      // Load provinces từ API khi chọn vùng miền
                      loadProvincesByRegion(regionId);
                    }}
                  >
                    <option value="">Chọn vùng miền</option>
                    {regionsList.map((region) => (
                      <option key={region.id} value={String(region.id)}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tỉnh thành</label>
                  <select id="provinceSelect"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  >
                    <option value="">Chọn tỉnh thành</option>
                    {provincesList.length > 0 ? (
                      provincesList.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>
                        {formData.region ? 'Đang tải tỉnh thành...' : 'Vui lòng chọn vùng miền trước'}
                      </option>
                    )}
                  </select>
                </div>


                {/* Main Image Section */}
                <div className="form-group full-width">
                  <label>Hình ảnh chính</label>
                  <div className="image-upload-section">
                    <input
                      type="file"
                      id="mainImageInput"
                      accept="image/*"
                      onChange={handleMainImageSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="image-select-btn"
                      onClick={() => document.getElementById('mainImageInput').click()}
                    >
                      {mainImagePreview ? 'Thay đổi ảnh chính' : 'Chọn ảnh chính'}
                    </button>
                    {mainImagePreview && (
                      <div className="image-preview-grid">
                        <div className="image-preview-item">
                          <img src={mainImagePreview} alt="main-preview" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Images Section */}
                <div className="form-group full-width">
                  <label>Hình ảnh phụ</label>
                  <div className="image-upload-section">
                    <input
                      type="file"
                      id="additionalImagesInput"
                      accept="image/*"
                      multiple
                      onChange={handleAdditionalImagesSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="image-select-btn"
                      onClick={() => document.getElementById('additionalImagesInput').click()}
                    >
                      {(additionalImagePreviews.length > 0 || existingImages.length > 0) ? 'Chọn thêm ảnh phụ' : 'Chọn ảnh phụ'}
                    </button>
                    
                    {/* Combined image preview grid */}
                    {(existingImages.length > 0 || additionalImagePreviews.length > 0) && (
                      <div className="image-preview-grid">
                        {/* Existing images */}
                        {existingImages.map((img, idx) => (
                          <div key={img.id || `existing-${idx}`} className="image-preview-item existing">
                            <img src={img.src} alt={`existing-${idx}`} />
                            <button
                              type="button"
                              className="delete-image-btn"
                              onClick={() => handleDeleteExistingImage(img.id)}
                              title="Xóa ảnh này"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        {/* New preview images */}
                        {additionalImagePreviews.map((src, idx) => (
                          <div key={`preview-${idx}-${src.slice(-10)}`} className="image-preview-item">
                            <img src={src} alt={`additional-preview-${idx}`} />
                            <button
                              type="button"
                              className="delete-image-btn"
                              onClick={() => {
                                const newPreviews = additionalImagePreviews.filter((_, i) => i !== idx);
                                setAdditionalImagePreviews(newPreviews);
                                // Also remove from actual files
                                const dt = new DataTransfer();
                                const input = document.getElementById('additionalImagesInput');
                                const files = Array.from(input.files);
                                files.forEach((file, i) => {
                                  if (i !== idx) dt.items.add(file);
                                });
                                input.files = dt.files;
                              }}
                              title="Xóa ảnh này"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>


                <div className="form-group full-width">
                  <label>Nguyên liệu (cách nhau bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={formData.ingredients}
                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                    placeholder="Bánh phở, Thịt bò, Hành tây..."
                  />
                </div>

                {/* Nutrition section */}
                <div className="form-group full-width">
                  <label>Thông tin dinh dưỡng </label>
                  <div className="nutrition-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                    <input type="text" placeholder="Serving size" value={nutrition.serving_size} onChange={e => setNutrition({ ...nutrition, serving_size: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="number" placeholder="Calories" value={nutrition.calories} onChange={e => setNutrition({ ...nutrition, calories: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="number" placeholder="Protein (g)" value={nutrition.protein} onChange={e => setNutrition({ ...nutrition, protein: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="number" placeholder="Carbs (g)" value={nutrition.carbs} onChange={e => setNutrition({ ...nutrition, carbs: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    <input type="number" placeholder="Fat (g)" value={nutrition.fat} onChange={e => setNutrition({ ...nutrition, fat: e.target.value })} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', gridColumn: '1' }} />
                  </div>
                </div>

                {/* Recipe section */}
                {/* <div className="form-group full-width">
                  <label>Công thức (tùy chọn)</label>
                  <input type="text" placeholder="Tiêu đề công thức" value={recipe.title} onChange={e => setRecipe({...recipe, title: e.target.value})} />
                  <textarea placeholder="Hướng dẫn" value={recipe.instructions} onChange={e => setRecipe({...recipe, instructions: e.target.value})} rows={4} />
                  <input type="text" placeholder="Video URL" value={recipe.video_url} onChange={e => setRecipe({...recipe, video_url: e.target.value})} />
                </div> */}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn secondary" onClick={handleCancel}>
                Hủy
              </button>
              <button className="btn primary" onClick={handleSave}>
                <Save size={16} />
                {editingFood ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default FoodManagementPage;
