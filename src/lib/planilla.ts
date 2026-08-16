/**
 * Contrato de la planilla (CLAUDE.md §4). Anclas explícitas, nunca un offset calculado:
 * los bloques de datos están separados por 23 filas pero las de resumen por 24
 * (el bloque de vaquillonas tiene una fila en blanco de más).
 */
import type { CriaEntrada, ReposicionEntrada } from './indicadores';

type Celda = string | number | null;
type Fila = Celda[];

type Anclas = {
  check: [number, number, string][];
  first: number;
  last: number;
  obj: number;
};

export const CRIA_ANCLAS: Anclas = {
  check: [
    [5, 5, 'vacas tactadas'],
    [5, 13, 'terneros nacidos'],
  ],
  first: 6,
  last: 16,
  obj: 19,
};

export const REPO_ANCLAS: Anclas = {
  check: [
    [28, 5, 'terneras recriadas'],
    [28, 12, 'vaquillonas recriadas'],
  ],
  first: 29,
  last: 39,
  obj: 43,
};

const CRIA_COLS = {
  anio: 1, supTotal: 2, pesoVaca: 4, tactadas: 5, prenadas: 6,
  vendVacias: 9, vendPrenadas: 10, mermas: 11, nacidos: 13, destetados: 14, pesoDestete: 17,
} as const;

const REPO_COLS = {
  anio: 1, pesoVqServicio: 2, ternerasRecriadas: 5, pesoDesteteTernera: 6, peso15m: 7,
  supRecria: 8, aptas: 9, tactadas: 11, prenadas: 12, vendNoAptas: 15, vendPrenadas: 16,
  supParicion: 17, nacidos: 19, destetados: 20, pesoDestete: 23,
} as const;

/** Columnas *(objetivo)* del §4: únicas que se leen de la fila de Objetivo. */
const CRIA_OBJETIVO_COLS: Record<string, number> = {
  pctPrenez: 8, pctDesteteAjustado: 16, kgTerneroDestetadoHa: 18, cargaKgVacaHa: 19, ratioProduccionCarga: 20,
};
const REPO_OBJETIVO_COLS: Record<string, number> = {
  pctApto: 10, pctPrenez: 14, pctDesteteAjustado: 22, kgTerneroDestetadoHa: 24, cargaKgVqHa: 25, ratioProduccionCarga: 26,
};

function at(rows: Fila[], r: number, c: number): Celda {
  const row = rows[r];
  if (!row) return null;
  const v = row[c];
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
}

function numAt(rows: Fila[], r: number, c: number): number | null {
  const v = at(rows, r, c);
  return typeof v === 'number' ? v : null;
}

export function verificarForma(rows: Fila[], anclas: Anclas, etiqueta: string): string | null {
  for (const [r, c, fragmento] of anclas.check) {
    const v = at(rows, r, c);
    if (typeof v !== 'string' || !v.toLowerCase().includes(fragmento)) {
      return `no se encontró "${fragmento}" donde corresponde en el bloque de ${etiqueta}`;
    }
  }
  return null;
}

export type FilaLeida<T> = {
  campana: number;
  filaExcel: number;
  entrada: T;
  faltantes: string[];
};

function leerBloque<T extends Record<string, number | null>>(
  rows: Fila[],
  anclas: Anclas,
  cols: Record<string, number>
): FilaLeida<T>[] {
  const out: FilaLeida<T>[] = [];
  for (let r = anclas.first; r <= anclas.last; r++) {
    const campana = numAt(rows, r, cols.anio);
    if (campana === null) continue;

    const entrada: Record<string, number | null> = {};
    const faltantes: string[] = [];
    for (const [clave, col] of Object.entries(cols)) {
      if (clave === 'anio') continue;
      const v = numAt(rows, r, col);
      entrada[clave] = v;
      if (v === null) faltantes.push(clave);
    }

    const cargados = Object.keys(cols).length - 1 - faltantes.length;
    if (cargados === 0) continue;

    out.push({ campana, filaExcel: r + 1, entrada: entrada as T, faltantes });
  }
  return out;
}

function leerObjetivos(rows: Fila[], anclas: Anclas, cols: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [clave, col] of Object.entries(cols)) {
    const v = numAt(rows, anclas.obj, col);
    if (v !== null) out[clave] = v;
  }
  return out;
}

export type HojaLeida = {
  nombre: string;
  cria: FilaLeida<CriaEntrada>[];
  repo: FilaLeida<ReposicionEntrada>[];
  objetivosCria: Record<string, number>;
  objetivosRepo: Record<string, number>;
};

export type ResultadoLectura =
  | { ok: true; hoja: HojaLeida }
  | { ok: false; nombre: string; error: string };

export function leerHoja(nombre: string, rows: Fila[]): ResultadoLectura {
  const e1 = verificarForma(rows, CRIA_ANCLAS, 'cría');
  const e2 = verificarForma(rows, REPO_ANCLAS, 'reposición');
  if (e1 || e2) return { ok: false, nombre, error: e1 || e2! };

  return {
    ok: true,
    hoja: {
      nombre,
      cria: leerBloque<CriaEntrada>(rows, CRIA_ANCLAS, CRIA_COLS),
      repo: leerBloque<ReposicionEntrada>(rows, REPO_ANCLAS, REPO_COLS),
      objetivosCria: leerObjetivos(rows, CRIA_ANCLAS, CRIA_OBJETIVO_COLS),
      objetivosRepo: leerObjetivos(rows, REPO_ANCLAS, REPO_OBJETIVO_COLS),
    },
  };
}
