/**
 * Única fuente de verdad de los indicadores (CLAUDE.md §6).
 * Nunca se persiste un valor calculado: todo sale de acá, siempre al vuelo.
 * División seguras: si el divisor es 0 o null, el resultado es null (nunca NaN/Infinity).
 */

export type CriaEntrada = {
  supTotal: number | null;
  pesoVaca: number | null;
  tactadas: number | null;
  prenadas: number | null;
  vendVacias: number | null;
  vendPrenadas: number | null;
  mermas: number | null;
  nacidos: number | null;
  destetados: number | null;
  pesoDestete: number | null;
};

export type ReposicionEntrada = {
  pesoVqServicio: number | null;
  ternerasRecriadas: number | null;
  pesoDesteteTernera: number | null;
  peso15m: number | null;
  supRecria: number | null;
  aptas: number | null;
  tactadas: number | null;
  prenadas: number | null;
  vendNoAptas: number | null;
  vendPrenadas: number | null;
  supParicion: number | null;
  nacidos: number | null;
  destetados: number | null;
  pesoDestete: number | null;
};

export type IndicadoresCria = {
  supAsignadaHa: number | null;
  pctPrenez: number | null;
  retenidasEnCampo: number | null;
  hembrasAParir: number | null;
  mermaPartoDestete: number | null;
  pctDesteteAjustado: number | null;
  kgTerneroDestetadoHa: number | null;
  cargaKgVacaHa: number | null;
  ratioProduccionCarga: number | null;
  kgTerneroPorKgPV: number | null;
  kgVacaVendidaHa: number | null;
};

export type IndicadoresReposicion = {
  vq_pctApto: number | null;
  vq_pctPrenez: number | null;
  vq_hembrasAParir: number | null;
  vq_mermaPartoDestete: number | null;
  vq_pctDesteteAjustado: number | null;
  vq_kgTerneroDestetadoHa: number | null;
  vq_cargaKgVqHa: number | null;
  vq_ratioProduccionCarga: number | null;
  vq_gananciaRecria: number | null;
};

const div = (a: number | null, b: number | null): number | null =>
  a === null || b === null || !b ? null : a / b;

const mul = (a: number | null, b: number | null): number | null =>
  a === null || b === null ? null : a * b;

const sub = (...xs: (number | null)[]): number | null =>
  xs.some((x) => x === null) ? null : (xs as number[]).reduce((acc, v, i) => (i === 0 ? v : acc - v));

export function calcularIndicadoresCria(
  c: CriaEntrada,
  repo: Pick<ReposicionEntrada, 'supRecria' | 'supParicion'> | null
): IndicadoresCria {
  const supVq = Math.max(repo?.supRecria ?? 0, repo?.supParicion ?? 0);
  const supAsignadaHa = c.supTotal === null ? null : c.supTotal - supVq;

  const retenidasEnCampo = sub(c.tactadas, c.vendVacias, c.vendPrenadas, c.mermas ?? 0);
  const hembrasAParir = sub(c.prenadas, c.vendPrenadas, c.mermas ?? 0);
  const kgTerneroDestetadoHa = div(mul(c.destetados, c.pesoDestete), supAsignadaHa);
  const cargaKgVacaHa = div(mul(retenidasEnCampo, c.pesoVaca), supAsignadaHa);

  return {
    supAsignadaHa,
    pctPrenez: div(c.prenadas, c.tactadas),
    retenidasEnCampo,
    hembrasAParir,
    mermaPartoDestete: sub(1, div(c.destetados, hembrasAParir)),
    pctDesteteAjustado: div(c.destetados, sub(c.tactadas, c.vendPrenadas)),
    kgTerneroDestetadoHa,
    cargaKgVacaHa,
    ratioProduccionCarga: div(kgTerneroDestetadoHa, cargaKgVacaHa),
    kgTerneroPorKgPV: div(c.pesoDestete, c.pesoVaca),
    kgVacaVendidaHa: div(
      c.vendVacias === null || c.vendPrenadas === null ? null : mul(c.vendVacias + c.vendPrenadas, c.pesoVaca),
      supAsignadaHa
    ),
  };
}

export function calcularIndicadoresReposicion(v: ReposicionEntrada): IndicadoresReposicion {
  const vq_hembrasAParir = sub(v.prenadas, v.vendPrenadas);
  const vq_kgTerneroDestetadoHa = div(mul(v.destetados, v.pesoDestete), v.supParicion);
  const vq_cargaKgVqHa = div(mul(vq_hembrasAParir, v.pesoVqServicio), v.supParicion);

  return {
    vq_pctApto: div(v.aptas, v.ternerasRecriadas),
    vq_pctPrenez: div(v.prenadas, v.tactadas),
    vq_hembrasAParir,
    vq_mermaPartoDestete: sub(1, div(v.destetados, vq_hembrasAParir)),
    vq_pctDesteteAjustado: div(v.destetados, sub(v.tactadas, v.vendPrenadas)),
    vq_kgTerneroDestetadoHa,
    vq_cargaKgVqHa,
    vq_ratioProduccionCarga: div(vq_kgTerneroDestetadoHa, vq_cargaKgVqHa),
    vq_gananciaRecria: sub(v.peso15m, v.pesoDesteteTernera),
  };
}

export type Indicadores = IndicadoresCria & IndicadoresReposicion;

export function calcularIndicadores(
  c: CriaEntrada,
  r: ReposicionEntrada | null
): Indicadores {
  const indCria = calcularIndicadoresCria(c, r);
  const indRepo = r
    ? calcularIndicadoresReposicion(r)
    : {
        vq_pctApto: null,
        vq_pctPrenez: null,
        vq_hembrasAParir: null,
        vq_mermaPartoDestete: null,
        vq_pctDesteteAjustado: null,
        vq_kgTerneroDestetadoHa: null,
        vq_cargaKgVqHa: null,
        vq_ratioProduccionCarga: null,
        vq_gananciaRecria: null,
      };
  return { ...indCria, ...indRepo };
}

export type Formato = 'n0' | 'n1' | 'n2' | 'p';
export type Sentido = 1 | -1 | 0;

export type DefinicionIndicador = {
  clave: keyof Indicadores;
  etiqueta: string;
  formato: Formato;
  sentido: Sentido;
  /** Clave del indicador en la tabla `objetivo` (sistema cria u reposicion). null si no tiene objetivo cargable. */
  objetivo: string | null;
  sistema: 'cria' | 'reposicion';
  titular?: boolean;
};

/**
 * Catálogo de indicadores COMPARABLES entre establecimientos (ratios de eficiencia).
 * Los conteos (retenidasEnCampo, hembrasAParir, vq_hembrasAParir) quedan afuera:
 * solo tienen sentido dentro de la serie histórica de un mismo campo (§3).
 */
export const CATALOGO: DefinicionIndicador[] = [
  { clave: 'kgTerneroDestetadoHa', etiqueta: 'kg de ternero destetado/ha', formato: 'n1', sentido: 1, objetivo: 'kgTerneroDestetadoHa', sistema: 'cria', titular: true },
  { clave: 'pctPrenez', etiqueta: '% de preñez (cría)', formato: 'p', sentido: 1, objetivo: 'pctPrenez', sistema: 'cria' },
  { clave: 'pctDesteteAjustado', etiqueta: '% de destete ajustado', formato: 'p', sentido: 1, objetivo: 'pctDesteteAjustado', sistema: 'cria' },
  { clave: 'mermaPartoDestete', etiqueta: 'Merma parto-destete', formato: 'p', sentido: -1, objetivo: null, sistema: 'cria' },
  { clave: 'ratioProduccionCarga', etiqueta: 'Producción sobre carga', formato: 'n2', sentido: 1, objetivo: 'ratioProduccionCarga', sistema: 'cria' },
  { clave: 'cargaKgVacaHa', etiqueta: 'Carga kg de vaca/ha', formato: 'n1', sentido: 0, objetivo: 'cargaKgVacaHa', sistema: 'cria' },
  { clave: 'kgTerneroPorKgPV', etiqueta: 'kg ternero / kg PV vaca', formato: 'n2', sentido: 1, objetivo: null, sistema: 'cria' },
  { clave: 'kgVacaVendidaHa', etiqueta: 'kg de vaca vendida/ha', formato: 'n1', sentido: 0, objetivo: null, sistema: 'cria' },
  { clave: 'vq_pctApto', etiqueta: '% apto a servicio (vaquillonas)', formato: 'p', sentido: 1, objetivo: 'pctApto', sistema: 'reposicion' },
  { clave: 'vq_pctPrenez', etiqueta: '% de preñez (vaquillonas)', formato: 'p', sentido: 1, objetivo: 'pctPrenez', sistema: 'reposicion' },
  { clave: 'vq_pctDesteteAjustado', etiqueta: '% destete ajustado (vaquillonas)', formato: 'p', sentido: 1, objetivo: 'pctDesteteAjustado', sistema: 'reposicion' },
  { clave: 'vq_kgTerneroDestetadoHa', etiqueta: 'kg ternero destetado/ha (vaquillonas)', formato: 'n1', sentido: 1, objetivo: 'kgTerneroDestetadoHa', sistema: 'reposicion' },
  { clave: 'vq_cargaKgVqHa', etiqueta: 'Carga kg de vaquillona/ha', formato: 'n1', sentido: 0, objetivo: 'cargaKgVqHa', sistema: 'reposicion' },
  { clave: 'vq_ratioProduccionCarga', etiqueta: 'Producción sobre carga (vaquillonas)', formato: 'n2', sentido: 1, objetivo: 'ratioProduccionCarga', sistema: 'reposicion' },
  { clave: 'vq_gananciaRecria', etiqueta: 'Ganancia de recría (kg)', formato: 'n0', sentido: 1, objetivo: null, sistema: 'reposicion' },
];

export const INDICADOR_TITULAR: keyof Indicadores = 'kgTerneroDestetadoHa';

export const definicionDe = (clave: keyof Indicadores) =>
  CATALOGO.find((d) => d.clave === clave)!;
