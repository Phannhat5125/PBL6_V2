import axios from 'axios';
const API_URL = 'http://localhost:5000/api/regions';

export async function getAllRegionsWithClassification() {
  try {
    const res = await axios.get(`${API_URL}`);
    const data = res.data;

    const regions = Array.isArray(data) ? data : data.data || data.regions || [];
    
    // Tạo các vùng miền chính từ parent_region_id
    const mainRegions = [
      { id: 1, name: 'Miền Bắc', parent_region_id: null },
      { id: 2, name: 'Miền Trung', parent_region_id: null },
      { id: 3, name: 'Miền Nam', parent_region_id: null }
    ];
    
    // Tất cả các regions từ API đều là provinces (tỉnh thành)
    const provinces = regions.map(r => ({
      id: r.region_id,
      name: r.region_name,
      parent_region_id: r.parent_region_id,
      description: r.description,
      region_image: r.region_image
    }));

    return { mainRegions, provinces };
  } catch (err) {
    console.error('Error fetching regions:', err);
    throw err;
  }
}

export async function getProvincesByRegion(regionId) {
  try {
    // Lấy tất cả regions và lọc theo parent_region_id
    const res = await axios.get(`${API_URL}?parent_region_id=${regionId}&limit=100`);
    const data = res.data;
    const regions = Array.isArray(data) ? data : data.data || data.regions || [];
    
    // Convert format để phù hợp với frontend
    return regions.map(r => ({
      id: r.region_id,
      name: r.region_name,
      parent_region_id: r.parent_region_id,
      description: r.description,
      region_image: r.region_image
    }));
  } catch (err) {
    console.error('Error fetching provinces by region:', err);
    throw err;
  }
}
