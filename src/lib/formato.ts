import type { Formato } from './indicadores';

const nf = (decimales: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

const DECIMALES: Record<Formato, number> = { n0: 0, n1: 1, n2: 2, p: 1 };

/** Nunca NaN/Infinity a la vista: `null` se muestra como '—' (§10). */
export function formatearValor(v: number | null, formato: Formato): string {
  if (v === null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  if (formato === 'p') return `${nf(1).format(v * 100)}%`;
  return nf(DECIMALES[formato]).format(v);
}

/** Diferencia con flecha: la flecha carga el significado, no el color (§8). */
export function formatearDiferencia(v: number | null, formato: Formato): string {
  if (v === null || Number.isNaN(v) || !Number.isFinite(v)) return '—';
  const flecha = v >= 0 ? '↑' : '↓';
  const abs = Math.abs(v);
  if (formato === 'p') return `${flecha} ${nf(1).format(abs * 100)} pp`;
  return `${flecha} ${nf(DECIMALES[formato]).format(abs)}`;
}

export type Clase = 'favorable' | 'desfavorable' | 'neutro';

export function claseDiferencia(diferencia: number | null, sentido: 1 | -1 | 0): Clase {
  if (sentido === 0 || diferencia === null) return 'neutro';
  return diferencia * sentido >= 0 ? 'favorable' : 'desfavorable';
}
