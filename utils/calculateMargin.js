export function calculateMargin(tradingType, params = {}) {
  const type = String(tradingType || "")
    .trim()
    .toLowerCase();

  const lots = Number(params.lots ?? 0) || 0;
  const contractSize = Number(params.contractSize ?? 1) || 1;
  const marginPercentage = Number(params.marginPercentage ?? 1);
  const marginPct = Number.isFinite(marginPercentage) ? marginPercentage : 1;

  const leverage = Number(params.leverage ?? 1);
  const lev = Number.isFinite(leverage) && leverage > 0 ? leverage : 1;

  const entryPrice = Number(params.entryPrice ?? 0) || 0;
  const openMarketPrice = Number(params.openMarketPrice ?? entryPrice) || 0;

  const marginInUSD = Number(params.marginInUSD ?? 1);
  const marginMultiplier =
    Number.isFinite(marginInUSD) && marginInUSD > 0 ? marginInUSD : 1;

  // Base notional used for margin calc
  const notional = lots * contractSize * (openMarketPrice || entryPrice || 0);
  if (!Number.isFinite(notional) || notional <= 0) return 0;

  // Heuristics by type. This keeps behavior stable even if server sends slightly different labels.
  // Defaults to a Forex-like formula.
  const isForexLike = type.includes("forex");
  const isCfdLike = type.includes("cfd");
  const isNoLeverage =
    type.includes("no leverage") || type.includes("noleverage");

  if (isCfdLike && (isNoLeverage || lev === 1)) {
    // No leverage CFD: use margin percentage directly.
    const v = notional * marginPct * marginMultiplier;
    return Number.isFinite(v) ? v : 0;
  }

  // Forex/CFD with leverage: divide by leverage.
  // Apply margin percentage (often 1.0 == 100%) and conversion multiplier.
  const v = (notional * marginPct * marginMultiplier) / lev;
  return Number.isFinite(v) ? v : 0;
}
