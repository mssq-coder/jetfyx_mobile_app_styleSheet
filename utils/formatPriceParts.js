export function formatPriceParts(p, precision = 5) {
  if (p == null || p === '') return { base: '-', decimals: [] };
  let num = p;
  // Normalize numeric precision
  if (typeof num === 'number' && isFinite(num)) {
    num = num.toFixed(precision);
  } else if (typeof num === 'string') {
    const parsed = Number(num);
    if (!isNaN(parsed)) num = parsed.toFixed(precision);
    else num = num.trim();
  } else {
    num = String(num);
  }
  const [intPart, rawDec = ''] = num.split('.');
  const dec = rawDec.padEnd(precision, '0').slice(0, precision);
  const chars = dec.split('');
  const decimals = chars.map((ch, idx) => {
    const isLast = idx === precision - 1;
    const isBoldZone = precision > 2 && idx >= precision - 3; // last 3 digits bold
    const isAllBold = precision <= 2; // 2 or fewer → all bold
    return {
      ch,
      weight: isAllBold || isBoldZone ? 'bold' : 'normal',
      superscript: isLast && precision > 2,
      size: isBoldZone ? 'large' : 'normal',
    };
  });
  return { base: intPart, decimals };
}
