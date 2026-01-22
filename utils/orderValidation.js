export function validateSlTpValues({ side, marketRef, stopLoss, takeProfit }) {
  const normalizedSide = String(side ?? '').toLowerCase();
  const isBuy = normalizedSide.includes('buy');
  const isSell = normalizedSide.includes('sell');

  const sl = Number(stopLoss) || 0;
  const tp = Number(takeProfit) || 0;
  const market = Number(marketRef) || 0;

  const result = { slError: null, tpError: null };
  if (!(market > 0) || !(isBuy || isSell)) return result;

  if (isBuy) {
    if (sl > 0 && sl >= market) result.slError = 'SL must be < Market for BUY.';
    if (tp > 0 && tp <= market) result.tpError = 'TP must be > Market for BUY.';
  }

  if (isSell) {
    if (sl > 0 && sl <= market) result.slError = 'SL must be > Market for SELL.';
    if (tp > 0 && tp >= market) result.tpError = 'TP must be < Market for SELL.';
  }

  return result;
}

export function validateLotRange({ lot, minLot = 0, maxLot = Infinity }) {
  const n = Number(lot) || 0;
  const min = Number(minLot) || 0;
  const max = Number(maxLot);

  if (!(n > 0)) return 'Lot size is required.';
  if (min > 0 && n < min) return `Lot size must be ≥ ${min}.`;
  if (Number.isFinite(max) && n > max) return `Lot size exceeds remaining lot (${max}).`;
  return null;
}
