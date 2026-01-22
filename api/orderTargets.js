import api from './client';

// Order Targets API
// Base URL already includes `/api` in `app/api/client.js`

const unwrap = (payload) => {
  if (payload && typeof payload === 'object') {
    if ('data' in payload) return payload.data;
    if ('result' in payload) return payload.result;
  }
  return payload;
};

export async function createOrderTarget(payload) {
  const response = await api.post('/ordertargets', payload);
  return unwrap(response.data);
}

// NOTE: No GET endpoint here; targets are expected via OrderHub.

// NOTE: backend uses POST for update (as per your spec)
export async function updateOrderTarget(id, payload) {
  if (id == null) throw new Error('id is required');
  const response = await api.post(`/ordertargets/${id}`, payload);
  return unwrap(response.data);
}

export async function deleteOrderTarget(id) {
  if (id == null) throw new Error('id is required');
  const response = await api.delete(`/ordertargets/${id}`);
  return unwrap(response.data);
}

export default {
  createOrderTarget,
  updateOrderTarget,
  deleteOrderTarget,
};
