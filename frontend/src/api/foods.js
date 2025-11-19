import request from './request';

export function mapFromBackend(row) {
  // Map backend row to frontend-friendly shape expected by UI
  const imgB64 = row.main_image;
  let image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'; // default fallback
  
  if (imgB64) {
    // Check if it's already a proper data URL
    if (imgB64.startsWith('data:')) {
      image = imgB64;
    } 
    // Check if it's the backend format 'dataimage/jpegbase64...'
    else if (imgB64.startsWith('dataimage/jpeg')) {
      // Convert backend format to proper data URL
      const base64Part = imgB64.replace('dataimage/jpegbase64', '');
      image = `data:image/jpeg;base64,${base64Part}`;
    }
    // Check if it's a valid HTTP URL
    else if (imgB64.startsWith('http://') || imgB64.startsWith('https://')) {
      image = imgB64;
    }
    // Otherwise treat as base64 string
    else if (imgB64.length > 10) { // basic check for base64 data
      image = `data:image/jpeg;base64,${imgB64}`;
    }
  }
  // Mapping để lấy thông tin vùng miền và tỉnh thành
  // Dữ liệu vùng miền theo parent_region_id
  const getRegionInfo = (originRegionId) => {
    // Map tỉnh thành theo origin_region_id 
    const provinceMap = {
      // Miền Bắc (parent_region_id = 1)
      1: { name: 'Hà Nội', region: 'Miền Bắc', parent_region_id: 1 },
      2: { name: 'Hà Giang', region: 'Miền Bắc', parent_region_id: 1 },
      3: { name: 'Cao Bằng', region: 'Miền Bắc', parent_region_id: 1 },
      4: { name: 'Bắc Kạn', region: 'Miền Bắc', parent_region_id: 1 },
      5: { name: 'Tuyên Quang', region: 'Miền Bắc', parent_region_id: 1 },
      6: { name: 'Lào Cai', region: 'Miền Bắc', parent_region_id: 1 },
      7: { name: 'Điện Biên', region: 'Miền Bắc', parent_region_id: 1 },
      8: { name: 'Lai Châu', region: 'Miền Bắc', parent_region_id: 1 },
      9: { name: 'Sơn La', region: 'Miền Bắc', parent_region_id: 1 },
      10: { name: 'Yên Bái', region: 'Miền Bắc', parent_region_id: 1 },
      11: { name: 'Hòa Bình', region: 'Miền Bắc', parent_region_id: 1 },
      12: { name: 'Thái Nguyên', region: 'Miền Bắc', parent_region_id: 1 },
      13: { name: 'Lạng Sơn', region: 'Miền Bắc', parent_region_id: 1 },
      14: { name: 'Quảng Ninh', region: 'Miền Bắc', parent_region_id: 1 },
      15: { name: 'Bắc Giang', region: 'Miền Bắc', parent_region_id: 1 },
      16: { name: 'Phú Thọ', region: 'Miền Bắc', parent_region_id: 1 },
      17: { name: 'Vĩnh Phúc', region: 'Miền Bắc', parent_region_id: 1 },
      18: { name: 'Bắc Ninh', region: 'Miền Bắc', parent_region_id: 1 },
      19: { name: 'Hải Dương', region: 'Miền Bắc', parent_region_id: 1 },
      20: { name: 'Hải Phòng', region: 'Miền Bắc', parent_region_id: 1 },
      21: { name: 'Hưng Yên', region: 'Miền Bắc', parent_region_id: 1 },
      22: { name: 'Thái Bình', region: 'Miền Bắc', parent_region_id: 1 },
      23: { name: 'Hà Nam', region: 'Miền Bắc', parent_region_id: 1 },
      24: { name: 'Nam Định', region: 'Miền Bắc', parent_region_id: 1 },
      25: { name: 'Ninh Bình', region: 'Miền Bắc', parent_region_id: 1 },
      
      // Miền Trung (parent_region_id = 2)
      26: { name: 'Thanh Hóa', region: 'Miền Trung', parent_region_id: 2 },
      27: { name: 'Nghệ An', region: 'Miền Trung', parent_region_id: 2 },
      28: { name: 'Hà Tĩnh', region: 'Miền Trung', parent_region_id: 2 },
      29: { name: 'Quảng Bình', region: 'Miền Trung', parent_region_id: 2 },
      30: { name: 'Quảng Trị', region: 'Miền Trung', parent_region_id: 2 },
      31: { name: 'Thừa Thiên Huế', region: 'Miền Trung', parent_region_id: 2 },
      32: { name: 'Đà Nẵng', region: 'Miền Trung', parent_region_id: 2 },
      33: { name: 'Quảng Nam', region: 'Miền Trung', parent_region_id: 2 },
      34: { name: 'Quảng Ngãi', region: 'Miền Trung', parent_region_id: 2 },
      35: { name: 'Bình Định', region: 'Miền Trung', parent_region_id: 2 },
      36: { name: 'Phú Yên', region: 'Miền Trung', parent_region_id: 2 },
      37: { name: 'Khánh Hòa', region: 'Miền Trung', parent_region_id: 2 },
      38: { name: 'Ninh Thuận', region: 'Miền Trung', parent_region_id: 2 },
      39: { name: 'Bình Thuận', region: 'Miền Trung', parent_region_id: 2 },
      40: { name: 'Kon Tum', region: 'Miền Trung', parent_region_id: 2 },
      41: { name: 'Gia Lai', region: 'Miền Trung', parent_region_id: 2 },
      42: { name: 'Đắk Lắk', region: 'Miền Trung', parent_region_id: 2 },
      43: { name: 'Đắk Nông', region: 'Miền Trung', parent_region_id: 2 },
      44: { name: 'Lâm Đồng', region: 'Miền Trung', parent_region_id: 2 },
      
      // Miền Nam (parent_region_id = 3)
      45: { name: 'Bình Phước', region: 'Miền Nam', parent_region_id: 3 },
      46: { name: 'Tây Ninh', region: 'Miền Nam', parent_region_id: 3 },
      47: { name: 'Bình Dương', region: 'Miền Nam', parent_region_id: 3 },
      48: { name: 'Đồng Nai', region: 'Miền Nam', parent_region_id: 3 },
      49: { name: 'Bà Rịa - Vũng Tàu', region: 'Miền Nam', parent_region_id: 3 },
      50: { name: 'Thành phố Hồ Chí Minh', region: 'Miền Nam', parent_region_id: 3 },
      51: { name: 'Long An', region: 'Miền Nam', parent_region_id: 3 },
      52: { name: 'Tiền Giang', region: 'Miền Nam', parent_region_id: 3 },
      53: { name: 'Bến Tre', region: 'Miền Nam', parent_region_id: 3 },
      54: { name: 'Trà Vinh', region: 'Miền Nam', parent_region_id: 3 },
      55: { name: 'Vĩnh Long', region: 'Miền Nam', parent_region_id: 3 },
      56: { name: 'Đồng Tháp', region: 'Miền Nam', parent_region_id: 3 },
      57: { name: 'An Giang', region: 'Miền Nam', parent_region_id: 3 },
      58: { name: 'Kiên Giang', region: 'Miền Nam', parent_region_id: 3 },
      59: { name: 'Cần Thơ', region: 'Miền Nam', parent_region_id: 3 },
      60: { name: 'Hậu Giang', region: 'Miền Nam', parent_region_id: 3 },
      61: { name: 'Sóc Trăng', region: 'Miền Nam', parent_region_id: 3 },
      62: { name: 'Bạc Liêu', region: 'Miền Nam', parent_region_id: 3 },
      63: { name: 'Cà Mau', region: 'Miền Nam', parent_region_id: 3 }
    };
    
    return provinceMap[originRegionId] || { name: '', region: '', parent_region_id: null };
  };

  const regionInfo = getRegionInfo(row.origin_region_id);
  
  // Parse ingredients from JSON string if needed
  let ingredients = [];
  try {
    if (typeof row.ingredients === 'string') {
      ingredients = JSON.parse(row.ingredients);
    } else if (Array.isArray(row.ingredients)) {
      ingredients = row.ingredients;
    }
  } catch (e) {
    ingredients = [];
  }
  
  return {
    id: row.food_id,
    food_id: row.food_id, // Add food_id for consistency
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    ingredients: ingredients,
    image: image,
    main_image: image, // Thêm field main_image để tương thích với UI mới
    region: regionInfo.region,
    province: regionInfo.name,
    origin_region_id: row.origin_region_id,
    avg_rating: row.avg_rating,
    most_popular: row.most_popular,
    created_at: row.created_at,
    updated_at: row.updated_at,
    calories: row.calories || 0,
    nutrition: row.nutrition || null // Thêm nutrition data
  };
}

export function mapToBackend(data) {
  return {
    category_id: data.category_id,
    name: data.name,
    description: data.description,
    ingredients: data.ingredients,
    main_image: data.main_image, // expect base64 string or null
    origin_region_id: data.origin_region_id,
    avg_rating: data.avg_rating,
    most_popular: data.most_popular,
  };
}

export async function listFoods({ q, limit = 1000, offset = 0, category_id, origin_region_id, withNutrition = true } = {}) {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));
  if (category_id !== undefined && category_id !== null) params.append('category_id', String(category_id));
  if (origin_region_id !== undefined && origin_region_id !== null) params.append('origin_region_id', String(origin_region_id));
  
  let path;
  if (q) {
    // Search endpoint doesn't support nutrition yet, use original
    params.append('q', q);
    path = `/api/foods?${params.toString()}`;
  } else if (withNutrition) {
    // Use optimized endpoint with nutrition data
    path = `/api/foods-with-nutrition?${params.toString()}`;
  } else {
    // Use original endpoint without nutrition
    path = `/api/foods?${params.toString()}`;
  }
  
  const data = await request(path);
  return Array.isArray(data) ? data.map(mapFromBackend) : [];
}

export async function getFood(id) {
  // Try to get single food with nutrition using the list endpoint
  try {
    const foods = await listFoods({ limit: 1000, withNutrition: true });
    const food = foods.find(f => f.id === Number(id));
    if (food) return food;
  } catch (e) {
    console.warn('Failed to get food with nutrition, falling back:', e);
  }
  
  // Fallback to original method
  const data = await request(`/api/foods/${id}`);
  if (!data) return null;
  
  // Load nutrition data separately
  try {
    const nutritionData = await request(`/api/nutrition/${id}`);
    return mapFromBackend({ ...data, nutrition: nutritionData });
  } catch (e) {
    // If nutrition data not found, continue without it
    return mapFromBackend(data);
  }
}

export async function createFood(payload) {
  const body = mapToBackend(payload);
  // If body contains a main_image, send as multipart/form-data so backend can access request.files
  let sendBody = body;
  if (body && body.main_image) {
    const fd = new FormData();
    // convert raw base64 or data URL to Blob
    function dataURLtoBlob(dataurl) {
      const parts = dataurl.split(',');
      const mime = parts[0].match(/:(.*?);/)[1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    }

    Object.keys(body).forEach((k) => {
      if (k === 'main_image') {
        const mi = body.main_image;
        if (mi instanceof File || mi instanceof Blob) {
          fd.append('main_image', mi);
        } else if (typeof mi === 'string' && mi.startsWith('data:')) {
          fd.append('main_image', dataURLtoBlob(mi), 'upload.jpg');
        } else if (typeof mi === 'string') {
          // raw base64 (no data: prefix)
          const bin = atob(mi);
          const len = bin.length;
          const u8 = new Uint8Array(len);
          for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
          fd.append('main_image', new Blob([u8]), 'upload.jpg');
        }
      } else if (body[k] !== undefined && body[k] !== null) {
        const v = typeof body[k] === 'object' ? JSON.stringify(body[k]) : String(body[k]);
        fd.append(k, v);
      }
    });
    sendBody = fd;
  }

  const resp = await request('/api/foods', { method: 'POST', body: sendBody });
  // If backend returns id or created object, try to return created object
  if (resp && resp.food_id) return { id: resp.food_id, ...payload };
  if (resp && resp.id) return resp;
  return { id: Date.now(), ...payload };
}

export async function updateFood(id, payload) {
  const body = mapToBackend(payload);
  await request(`/api/foods/${id}`, { method: 'PUT', body });
  return { id, ...payload };
}

export async function deleteFood(id) {
  return await request(`/api/foods/${id}`, { method: 'DELETE' });
}

export default { listFoods, getFood, createFood, updateFood, deleteFood, mapFromBackend, mapToBackend };
