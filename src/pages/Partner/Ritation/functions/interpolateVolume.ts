// components/functions/interpolateVolume.ts
export type TeraPoint = {
  height_mm: number; // pastikan mm
  qty_liter: number;
};

export interface InterpolateOptions {
  extrapolate?: boolean; // default false
  precision?: number;    // optional rounding
}

export function interpolateVolume(
  data: TeraPoint[],
  heightMm: number,
  options: InterpolateOptions = {}
): number | null {
  if (!data || data.length === 0 || heightMm == null || Number.isNaN(heightMm)) {
    return null;
  }

  const { extrapolate = false, precision } = options;

  // sort ascending by height_mm
  const sorted = [...data]
    .filter(d => d != null && !Number.isNaN(Number(d.height_mm)) && !Number.isNaN(Number(d.qty_liter)))
    .map(d => ({ height_mm: Number(d.height_mm), qty_liter: Number(d.qty_liter) }))
    .sort((a, b) => a.height_mm - b.height_mm);

  if (sorted.length === 0) return null;

  // exact match
  for (const p of sorted) {
    if (p.height_mm === heightMm) {
      return typeof precision === "number" ? round(p.qty_liter, precision) : p.qty_liter;
    }
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (heightMm < first.height_mm) return extrapolate ? roundOrNot(first.qty_liter, precision) : null;
  if (heightMm > last.height_mm) return extrapolate ? roundOrNot(last.qty_liter, precision) : null;

  // linear interpolation
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i];
    const p1 = sorted[i + 1];

    if (heightMm >= p0.height_mm && heightMm <= p1.height_mm) {
      const t = (heightMm - p0.height_mm) / (p1.height_mm - p0.height_mm);
      const qty = p0.qty_liter + t * (p1.qty_liter - p0.qty_liter);
      return roundOrNot(qty, precision);
    }
  }

  return null;
}

function roundOrNot(v: number, precision?: number) {
  if (typeof precision === "number") {
    const factor = Math.pow(10, precision);
    return Math.round(v * factor) / factor;
  }
  return v;
}
function round(qty_liter: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(qty_liter * factor) / factor;
}

