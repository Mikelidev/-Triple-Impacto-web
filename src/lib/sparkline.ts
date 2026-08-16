export type SvgSparkline = { d: string; ultimo: [number, number]; W: number; H: number };

/** Genera el path SVG de una serie simple, ignorando huecos (null). */
export function pathSparkline(serie: (number | null)[], W = 132, H = 30): SvgSparkline | null {
  const ok = serie.filter((v): v is number => v !== null);
  if (ok.length < 2) return null;
  const mn = Math.min(...ok);
  const mx = Math.max(...ok);
  const rango = mx - mn || 1;
  const puntos = serie
    .map((v, i) => (v === null ? null : [(i / (serie.length - 1)) * W, H - ((v - mn) / rango) * (H - 6) - 3] as [number, number]))
    .filter((p): p is [number, number] => p !== null);
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return { d, ultimo: puntos[puntos.length - 1], W, H };
}
