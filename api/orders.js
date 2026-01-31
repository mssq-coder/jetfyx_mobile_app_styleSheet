import api from "./client";

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

  const response = await api.post("/Orders", normalizedPayload);

  return response.data;
}

/**
 * Update an order (SL/TP, close/partial close, pending-order fields, etc).
 * Endpoint: PUT /api/Orders/{OrderId}
 */
export async function updateOrder(orderId, payload) {
  if (orderId == null) {
    throw new Error("orderId is required");
  }

  const normalizedPayload = {
    ...(payload || {}),
    id: payload?.id ?? orderId,
  };

  const response = await api.put(`/Orders/${orderId}`, normalizedPayload);
  console.log("updateOrder response:", response.data);
  return response.data;
}

export async function bulkDelete(orderIds) {
  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new Error("orderIds must be a non-empty array");
  }

  const ids = orderIds.map((id) => Number(id));
  const invalid = orderIds.filter((id, idx) => !Number.isFinite(ids[idx]));
  if (invalid.length) {
    throw new Error(`Invalid order id(s): ${invalid.join(", ")}`);
  }

  // Backend expects: { orderIds: [27793, 27792, 27791] }
  const response = await api.post("/Orders/bulk-close", { orderIds: ids });
  return response.data;
}

// Backwards-compatible alias (older name)
export async function bulkClose(orderIds) {
  return bulkDelete(orderIds);
}

export default {
  createOrder,
  updateOrder,
  bulkDelete,
};
