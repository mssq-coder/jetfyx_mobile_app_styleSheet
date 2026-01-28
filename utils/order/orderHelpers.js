// Utility functions for order operations
export const extractTargetsFromOrder = (order) => {
  if (!order || typeof order !== "object") return [];

  const candidates = [
    order?.targets,
    order?.orderTargets,
    order?.orderTarget,
    order?.orderTargetList,
    order?.orderTargetsList,
    order?.childOrders,
    order?.children,
    order?.multiTargets,
    order?.targetOrders,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (c && typeof c === "object" && Array.isArray(c.data)) return c.data;
  }

  return [];
};

export const mergeTargetsFromHub = (existingList, incomingList, getTargetId, toNumberOrZero) => {
  const prev = Array.isArray(existingList) ? existingList : [];
  const incoming = Array.isArray(incomingList) ? incomingList : [];
  if (!prev.length) return incoming;
  if (!incoming.length) return prev;

  const priceTol = 1e-6;
  const lotTol = 1e-6;

  const normalize = (t) => {
    if (!t || typeof t !== "object") return t;
    const id = getTargetId(t);
    return id != null ? { ...t, id } : t;
  };

  const incomingNorm = incoming.map(normalize);
  const prevNorm = prev.map(normalize);

  const matches = (a, b) => {
    const lotA = toNumberOrZero(a?.lotSize);
    const lotB = toNumberOrZero(b?.lotSize);
    const slA = toNumberOrZero(a?.stopLoss);
    const slB = toNumberOrZero(b?.stopLoss);
    const tpA = toNumberOrZero(a?.takeProfit);
    const tpB = toNumberOrZero(b?.takeProfit);

    return (
      Math.abs(lotA - lotB) <= lotTol &&
      Math.abs(slA - slB) <= priceTol &&
      Math.abs(tpA - tpB) <= priceTol
    );
  };

  // Dedupe incoming by id (hub might send duplicates)
  const incomingById = new Map();
  const incomingNoId = [];
  for (const t of incomingNorm) {
    const id = getTargetId(t);
    if (id != null) {
      const key = String(id);
      if (!incomingById.has(key)) incomingById.set(key, t);
    } else {
      incomingNoId.push(t);
    }
  }

  const result = [...incomingById.values(), ...incomingNoId];

  // Keep local items that hub hasn't confirmed yet (e.g., created without id)
  for (const p of prevNorm) {
    const pid = getTargetId(p);
    if (pid != null) {
      const existsInIncoming = incomingById.has(String(pid));
      if (!existsInIncoming) result.push(p); // keep if hub didn't send this batch
      continue;
    }

    // For temp items (no id), drop them once hub sends a matching target (with or without id)
    const hasMatch = result.some((x) => matches(p, x));
    if (!hasMatch) result.push(p);
  }

  return result;
};

export const getTargetId = (t) => {
  if (!t || typeof t !== "object") return null;
  return (
    t.id ??
    t.targetId ??
    t.orderTargetId ??
    t.orderTargetsId ??
    t.ordertargetId ??
    null
  );
};

export const getTargetKey = (t, fallbackIndex = 0) => {
  const id = getTargetId(t);
  return String(id ?? t?.clientTempId ?? `tmp-${fallbackIndex}`);
};

export const statusForClose = (existingStatus) => {
  if (typeof existingStatus === "number") return 1;
  return "Closed";
};

export const buildUpdatePayload = (
  order,
  overrides = {},
  getOrderId,
  toNumberOrZero,
  accountId,
  { includeRemark = false, includePendingFields = false } = {},
) => {
  const now = new Date().toISOString();
  const oid = getOrderId(order);

  const payload = {
    id: Number(overrides.id ?? order?.id ?? oid ?? 0),
    stopLoss: toNumberOrZero(overrides.stopLoss ?? order?.stopLoss ?? 0),
    takeProfit: toNumberOrZero(
      overrides.takeProfit ?? order?.takeProfit ?? 0,
    ),
    status: overrides.status ?? order?.status ?? "Ongoing",
    executedAt:
      overrides.executedAt ??
      order?.executedAt ??
      order?.orderTime ??
      order?.createdAt ??
      now,
    closedAt:
      overrides.closedAt ?? order?.closedAt ?? order?.orderClosedAt ?? now,
    accountId: Number(
      overrides.accountId ?? order?.accountId ?? accountId ?? 0,
    ),
    partialCloseLotSize: toNumberOrZero(
      overrides.partialCloseLotSize ?? order?.partialCloseLotSize ?? 0,
    ),
  };

  if (includeRemark) {
    payload.remark = String(overrides.remark ?? order?.remark ?? "");
  }

  if (includePendingFields) {
    payload.entryPriceForPendingOrders = toNumberOrZero(
      overrides.entryPriceForPendingOrders ??
        order?.entryPriceForPendingOrders ??
        order?.entryPrice ??
        0,
    );
    payload.expirationTimeForPendingOrder =
      overrides.expirationTimeForPendingOrder ??
      order?.expirationTimeForPendingOrder ??
      now;
    payload.isExpirationTimeEnabledForPendingOrder = Boolean(
      overrides.isExpirationTimeEnabledForPendingOrder ??
      order?.isExpirationTimeEnabledForPendingOrder ??
      false,
    );
    payload.lotSizeForPendingOrders = toNumberOrZero(
      overrides.lotSizeForPendingOrders ??
        order?.lotSizeForPendingOrders ??
        order?.lotSize ??
        0,
    );
  }

  return payload;
};