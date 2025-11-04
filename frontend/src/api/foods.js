import request from './request';

export function mapFromBackend(row) {
  // Map backend row to frontend-friendly shape expected by UI
  const imgB64 = row.main_image;
  let image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'; // default fallback
  
  if (imgB64) {
    // Check if it's already a data URL
    if (imgB64.startsWith('data:')) {
      image = imgB64;
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
  // Simple region mapping (adjust as needed)
  const regionMap = {
    1: 'Miền Bắc',
    2: 'Miền Trung',
    3: 'Miền Nam'
  };
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
    category_id: row.category_id,
    name: row.name,
    ingredients: ingredients,
    image: image,
    main_image: image, // Thêm field main_image để tương thích với UI mới
    region: regionMap[row.origin_region_id] || '',
    origin_region_id: row.origin_region_id,
    avg_rating: row.avg_rating,
    most_popular: row.most_popular,
    created_at: row.created_at,
    updated_at: row.updated_at,
    calories: row.calories || 0,
    province: row.province || ''
  };
}

export function mapToBackend(data) {
  return {
    category_id: data.category_id,
    name: data.name,
    ingredients: data.ingredients,
    main_image: data.main_image, // expect base64 string or null
    origin_region_id: data.origin_region_id,
    avg_rating: data.avg_rating,
    most_popular: data.most_popular,
  };
}

export async function listFoods({ q, limit = 100, offset = 0, category_id, origin_region_id } = {}) {
  const params = new URLSearchParams();
  if (q) params.append('q', q);
  if (limit) params.append('limit', String(limit));
  if (offset) params.append('offset', String(offset));
  if (category_id !== undefined && category_id !== null) params.append('category_id', String(category_id));
  if (origin_region_id !== undefined && origin_region_id !== null) params.append('origin_region_id', String(origin_region_id));
  const path = `/api/foods?${params.toString()}`;
  const data = await request(path);
  return Array.isArray(data) ? data.map(mapFromBackend) : [];
}

export async function getFood(id) {
  const data = await request(`/api/foods/${id}`);
  return data ? mapFromBackend(data) : null;
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
