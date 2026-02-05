import { useEffect, useState } from "react";
import { calculateMargin } from "../utils/calculateMargin";

const safeNumber = (value) => {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseLeverage = (leverage) => {
  if (leverage == null) return null;
  if (typeof leverage === "string" && leverage.includes(":")) {
    const parts = leverage.split(":");
    const n = safeNumber(parts[1]);
    return n ?? null;
  }
  return safeNumber(leverage);
};

/**
 * Custom hook to calculate margin based on selected symbol, volume, and live prices
 *
 * @param {Object} selectedSymbol - The selected symbol object (instrument)
 * @param {number|string} volume - Lot size
 * @param {number|string} leverage - Account leverage (e.g. 100 or "1:100")
 * @param {Object} livePrices - Live prices { [symbol]: { bid, ask } }
 * @param {number|string} entryPrice - Entry price for pending orders
 * @param {number|string} currentMarketPrice - Current market price (ask/bid)
 * @param {Array} allSymbols - All symbols for looking up marginInUSD symbol
 * @returns {Object} { margin: number, isCalculating: boolean, error: string|null }
 */
export function useMarginCalculation(
  selectedSymbol,
  volume,
  leverage,
  livePrices,
  entryPrice,
  currentMarketPrice,
  allSymbols = [],
) {
  const [margin, setMargin] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const lots = safeNumber(volume);
    const lev = parseLeverage(leverage);

    if (!selectedSymbol || !lots || !lev) {
      setMargin(0);
      setError(null);
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Try multiple possible API field names.
      const marginInUSDSymbolName =
        selectedSymbol.marginInUsdCode ||
        selectedSymbol.marginInUSDSymbol ||
        selectedSymbol.marginInUSD ||
        selectedSymbol.marginInUsd ||
        selectedSymbol.marginInUsdSymbol ||
        selectedSymbol.marginCurrency ||
        "";

      const marginInUSDSymbolObj = marginInUSDSymbolName
        ? allSymbols?.find((s) => s?.symbol === marginInUSDSymbolName)
        : null;

      // If margin currency conversion symbol exists, use its ask; otherwise fall back to contractValue or 1.
      const marginInUSDPrice =
        marginInUSDSymbolName && String(marginInUSDSymbolName).trim() !== ""
          ? (safeNumber(livePrices?.[marginInUSDSymbolName]?.ask) ??
            safeNumber(marginInUSDSymbolObj?.contractValue) ??
            1)
          : 1;

      const openMarketPrice =
        safeNumber(livePrices?.[selectedSymbol.symbol]?.ask) ??
        safeNumber(currentMarketPrice) ??
        0;

      const tradingType =
        String(selectedSymbol.marginCalculationType || "").trim() ||
        "Forex Direct";

      const effectiveEntryPrice = safeNumber(entryPrice) ?? openMarketPrice;

      const calculatedMargin = calculateMargin(tradingType, {
        lots,
        contractSize: safeNumber(selectedSymbol.contractSize) ?? 1,
        marginPercentage:
          (safeNumber(selectedSymbol.marginPercentage) ?? 100) / 100,
        marginInUSD: marginInUSDPrice,
        leverage: lev,
        entryPrice: effectiveEntryPrice,
        openMarketPrice,
        priceMargin: marginInUSDPrice,
      });

      setMargin(Number.isFinite(calculatedMargin) ? calculatedMargin : 0);
    } catch (err) {
      setError(
        err?.message ? String(err.message) : "Margin calculation failed",
      );
      setMargin(0);
    } finally {
      setIsCalculating(false);
    }
  }, [
    selectedSymbol,
    volume,
    leverage,
    livePrices,
    entryPrice,
    currentMarketPrice,
    allSymbols,
  ]);

  return { margin, isCalculating, error };
}
