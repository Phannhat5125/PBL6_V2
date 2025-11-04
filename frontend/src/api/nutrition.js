import request from './request';

export async function getNutrition(food_id) {
  if (!food_id) throw new Error('food_id required');
  try {
    return await request(`/api/nutrition/${food_id}`);
  } catch (error) {
    // Return null for 404 (nutrition not found) instead of throwing
    if (error.message && (error.message.includes('404') || error.message.includes('HTTP 404'))) {
      return null;
    }
    throw error;
  }
}

export async function createNutrition(data) {
  // expects data includes food_id and numeric fields optionally
  return await request('/api/nutrition', { method: 'POST', body: data });
}

export async function updateNutrition(food_id, data) {
  return await request(`/api/nutrition/${food_id}`, { method: 'PUT', body: data });
}

export async function deleteNutrition(food_id) {
  return await request(`/api/nutrition/${food_id}`, { method: 'DELETE' });
}

export default { getNutrition, createNutrition, updateNutrition, deleteNutrition };
