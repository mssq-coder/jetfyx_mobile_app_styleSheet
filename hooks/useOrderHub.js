import { useEffect, useRef } from "react";
import { createOrderHubConnection } from "../api/signalR/orderHubConnection";

const getOrderId = (order) => {
  if (!order || typeof order !== "object") return null;
  return (
    order.id ??
    order.orderId ??
    order.ticket ??
    order.positionId ??
    order.dealId ??
    null
  );
};

const normalizeOrdersPayload = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.orders)) return payload.orders;
  if (Array.isArray(payload.data)) return payload.data;
  return [payload];
};

const isPendingOrder = (order) => {
  if (!order || typeof order !== "object") return false;
  if (typeof order.isPending === "boolean") return order.isPending;
  const status = (order.status ?? order.orderStatus ?? "").toString().toLowerCase();
  return status === "pending" || status === "placed" || status === "new";
};

const mergeById = (prevList, incomingList) => {
  const byId = new Map();

  for (const existing of prevList || []) {
    const id = getOrderId(existing);
    if (id != null) byId.set(String(id), existing);
  }

  for (const incoming of incomingList || []) {
    const id = getOrderId(incoming);
    if (id == null) continue;
    const key = String(id);
    const prev = byId.get(key);
    byId.set(key, prev ? { ...prev, ...incoming } : incoming);
  }

  return Array.from(byId.values());
};

const removeById = (prevList, removedId) => {
  if (removedId == null) return prevList || [];
  const key = String(removedId);
  return (prevList || []).filter((o) => String(getOrderId(o)) !== key);
};

const useOrderHub = (accountId, setOrders, setPendingOrders) => {
  const connectionRef = useRef(null);
  const prevAccountId = useRef(null);

  const baseURL = "https://jetwebapp-api-dev-e4bpepgaeaaxgecr.centralindia-01.azurewebsites.net/api";

  useEffect(() => {
    if (!accountId) {
      connectionRef.current?.dispose?.();
      connectionRef.current = null;
      return;
    }

    if (prevAccountId.current !== accountId) {
      connectionRef.current?.dispose?.();

      // Clear previous account's orders when switching
      setOrders([]);
      setPendingOrders([]);

      const connection = createOrderHubConnection(
        baseURL,
        accountId,
        (updates) => {
          const incoming = normalizeOrdersPayload(updates);

          const pendingIncoming = incoming.filter(isPendingOrder);
          const ongoingIncoming = incoming.filter((o) => !isPendingOrder(o));

          if (typeof setOrders === "function") {
            setOrders((prev) => mergeById(prev, ongoingIncoming));
          }
          if (typeof setPendingOrders === "function") {
            setPendingOrders((prev) => mergeById(prev, pendingIncoming));
          }
        },
        (removedId) => {
          if (typeof setOrders === "function") {
            setOrders((prev) => removeById(prev, removedId));
          }
          if (typeof setPendingOrders === "function") {
            setPendingOrders((prev) => removeById(prev, removedId));
          }
        }
      );

      connectionRef.current = connection;
      prevAccountId.current = accountId;
    }

    return () => {
      connectionRef.current?.dispose?.();
      connectionRef.current = null;
    };
  }, [accountId, setOrders, setPendingOrders]);

  return {};
};

export default useOrderHub;
