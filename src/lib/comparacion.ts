/**
 * Motor de comparación entre establecimientos (CLAUDE.md §3).
 * Tres modos excluyentes de referencia: objetivo propio, promedio del grupo, historia propia.
 * El ranking siempre ordena por diferencia contra la referencia, nunca por valor absoluto.
 */
import type { Establecimiento } from './datos';
import { definicionDe, INDICADOR_TITULAR, type DefinicionIndicador, type Indicadores } from './indicadores';
import { formatearValor } from './formato';

export type Modo = 'obj' | 'grp' | 'ten';

export const MODOS: Record<Modo, { etiqueta: string; texto: string }> = {
  obj: {
    etiqueta: 'vs objetivo',
    texto: 'Cada campo se mide contra el objetivo que le pusiste. El orden muestra quién está más lejos de su propia meta, no quién produce más.',
  },
  grp: {
    etiqueta: 'vs grupo',
    texto: 'Cada campo se mide contra el promedio de los once en esa campaña. Muestra quién tracciona y quién arrastra, pero ignora que cada uno parte de una situación distinta.',
  },
  ten: {
    etiqueta: 'vs su historia',
    texto: 'Cada campo se mide contra su propio promedio de campañas anteriores. Es el único modo que detecta un campo que produce bien pero viene empeorando.',
  },
};

/** Un registro bloqueado (alerta `err` vigente) nunca entra en comparaciones (§7). */
export function valorDe(e: Establecimiento, campana: number, clave: keyof Indicadores): number | null {
  const r = e.registros.find((r) => r.campana === campana);
  if (!r || r.bloqueado) return null;
  return r.ind[clave] ?? null;
}

export function objetivoDe(e: Establecimiento, def: DefinicionIndicador): number | null {
  if (!def.objetivo) return null;
  return e.objetivos[`${def.sistema}:${def.objetivo}`] ?? null;
}

export function historiaDe(e: Establecimiento, campana: number, clave: keyof Indicadores): number | null {
  const previos = e.registros
    .filter((r) => r.campana < campana && !r.bloqueado)
    .map((r) => r.ind[clave])
    .filter((v): v is number => v !== null);
  return previos.length ? previos.reduce((s, v) => s + v, 0) / previos.length : null;
}

export function promedioGrupo(estabs: Establecimiento[], campana: number, clave: keyof Indicadores): number | null {
  const valores = estabs.map((e) => valorDe(e, campana, clave)).filter((v): v is number => v !== null);
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null;
}

export function referencia(
  estabs: Establecimiento[],
  e: Establecimiento,
  campana: number,
  def: DefinicionIndicador,
  modo: Modo
): number | null {
  if (modo === 'obj') return objetivoDe(e, def);
  if (modo === 'ten') return historiaDe(e, campana, def.clave);
  return promedioGrupo(estabs, campana, def.clave);
}

export type FilaRanking = {
  establecimiento: Establecimiento;
  valor: number;
  referencia: number | null;
  diferencia: number | null;
};

/** Ordenado por diferencia contra la referencia (§3): nunca por valor absoluto. */
export function armarRanking(
  estabs: Establecimiento[],
  campana: number,
  def: DefinicionIndicador,
  modo: Modo
): FilaRanking[] {
  const filas = estabs
    .map((e) => {
      const valor = valorDe(e, campana, def.clave);
      if (valor === null) return null;
      const ref = referencia(estabs, e, campana, def, modo);
      const diferencia = ref !== null ? valor - ref : null;
      return { establecimiento: e, valor, referencia: ref, diferencia };
    })
    .filter((f): f is FilaRanking => f !== null);

  filas.sort((p, q) => {
    if (def.sentido === 0) return q.valor - p.valor;
    if (p.diferencia === null || q.diferencia === null) return q.valor - p.valor;
    return (q.diferencia - p.diferencia) * def.sentido;
  });

  return filas;
}

export type FilaAlerta = {
  establecimiento: Establecimiento;
  motivo: string;
  valor: number;
};

/**
 * Un registro por establecimiento que necesita atención (cayendo desde el primer año
 * cargado y/o por debajo de su objetivo), siempre sobre el indicador titular (§3).
 * Ordenado del peor al menos malo.
 */
export function filasAlerta(estabs: Establecimiento[], campana: number): FilaAlerta[] {
  const def = definicionDe(INDICADOR_TITULAR);
  const todasLasCampanas = estabs.flatMap((e) => e.registros.map((r) => r.campana));
  if (!todasLasCampanas.length) return [];
  const primerCampana = Math.min(...todasLasCampanas);

  const filas: FilaAlerta[] = [];
  for (const e of estabs) {
    const v = valorDe(e, campana, def.clave);
    if (v === null) continue;
    const p0 = valorDe(e, primerCampana, def.clave);
    const o = objetivoDe(e, def);
    const deriva = p0 !== null ? v - p0 : null;
    const brecha = o !== null ? v - o : null;
    const cayendo = deriva !== null && deriva < 0;
    const bajoObjetivo = brecha !== null && brecha < 0;
    if (!cayendo && !bajoObjetivo) continue;

    const motivos: string[] = [];
    if (cayendo) motivos.push(`en caída desde ${primerCampana}`);
    if (bajoObjetivo) motivos.push('por debajo del objetivo');
    filas.push({
      establecimiento: e,
      motivo: motivos.join(' · '),
      valor: bajoObjetivo ? brecha! : deriva!,
    });
  }

  return filas.sort((a, b) => a.valor - b.valor);
}

export type MejorEvolucion = { establecimiento: Establecimiento; valor: number; tendencia: number };

/** El establecimiento que más mejoró contra su propio promedio histórico, si hay alguno. */
export function mejorEvolucion(estabs: Establecimiento[], campana: number): MejorEvolucion | null {
  const def = definicionDe(INDICADOR_TITULAR);
  let mejor: MejorEvolucion | null = null;
  for (const e of estabs) {
    const v = valorDe(e, campana, def.clave);
    const h = historiaDe(e, campana, def.clave);
    if (v === null || h === null) continue;
    const tendencia = v - h;
    if (tendencia > 0 && (!mejor || tendencia > mejor.tendencia)) {
      mejor = { establecimiento: e, valor: v, tendencia };
    }
  }
  return mejor;
}
