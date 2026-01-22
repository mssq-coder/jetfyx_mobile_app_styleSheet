import api from './client';

/**
 * Create an order.
 * Endpoint: POST /api/Orders
 *
 * Expected payload fields (per your backend):
 * - accountId: number
 * - symbol: string
 * - lotSize: string (e.g. "0.01")
 * - orderTime: ISO string
 * - orderType: number
 * - status: number
 * - stopLoss: number
 * - takeProfit: number
 * - remark: string
 */
export async function createOrder(payload) {
  const normalizedPayload = {
    ...payload,
    orderTime: payload?.orderTime ?? new Date().toISOString(),
  };

  const response = await api.post('/Orders', normalizedPayload);
  
  return response.data;
}

/**
 * Update an order (SL/TP, close/partial close, pending-order fields, etc).
 * Endpoint: PUT /api/Orders/{OrderId}
 */
export async function updateOrder(orderId, payload) {
  if (orderId == null) {
    throw new Error('orderId is required');
  }

  const normalizedPayload = {
    ...(payload || {}),
    id: payload?.id ?? orderId,
  };

  const response = await api.put(`/Orders/${orderId}`, normalizedPayload);
  return response.data;
}

export default {
  createOrder,
  updateOrder,
};
