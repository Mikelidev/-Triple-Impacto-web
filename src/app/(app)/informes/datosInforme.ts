import type { Establecimiento } from '@/lib/datos';
import { CATALOGO, definicionDe } from '@/lib/indicadores';
import { objetivoDe, promedioGrupo, historiaDe, valorDe } from '@/lib/comparacion';
import { formatearValor, formatearDiferencia } from '@/lib/formato';

export type FilaInformeIndicador = {
  etiqueta: string;
  valor: string;
  objetivo: string;
  brecha: string;
  grupo: string;
};

export type DatosInforme = {
  establecimiento: Establecimiento;
  campana: number;
  leadTexto: string;
  filasCria: FilaInformeIndicador[];
  filasRepo: FilaInformeIndicador[];
  historia: { campana: number; valor: string }[];
};

/**
 * Arma todo el contenido de un informe para un establecimiento y campaña. Se usa tanto
 * para la vista en pantalla como para el PDF (individual o de todos), así el número que
 * ve el asesor es siempre el mismo que termina impreso.
 */
export function construirDatosInforme(
  establecimiento: Establecimiento,
  todos: Establecimiento[],
  campana: number
): DatosInforme {
  const defTitular = definicionDe('kgTerneroDestetadoHa');
  const v = valorDe(establecimiento, campana, defTitular.clave);
  const o = objetivoDe(establecimiento, defTitular);
  const g = promedioGrupo(todos, campana, defTitular.clave);
  const h = historiaDe(establecimiento, campana, defTitular.clave);
  const dif = (x: number | null) => (x === null || v === null ? null : v - x);

  const frase = [
    o !== null
      ? `${(dif(o) ?? 0) >= 0 ? 'supera' : 'queda debajo de'} su objetivo de ${formatearValor(o, 'n0')} por ${formatearValor(Math.abs(dif(o) ?? 0), 'n1')}`
      : null,
    g !== null
      ? `${(dif(g) ?? 0) >= 0 ? 'está por encima' : 'está por debajo'} del promedio de los establecimientos (${formatearValor(g, 'n1')})`
      : null,
    h !== null
      ? `y ${(dif(h) ?? 0) >= 0 ? 'mejora' : 'retrocede'} ${formatearValor(Math.abs(dif(h) ?? 0), 'n1')} contra su propio promedio histórico`
      : null,
  ]
    .filter(Boolean)
    .join(', ');

  const leadTexto = `Este campo produjo ${formatearValor(v, 'n1')} kg de ternero destetado por hectárea${frase ? `: ${frase}` : ''}.`;

  function filasPara(vq: boolean): FilaInformeIndicador[] {
    return CATALOGO.filter((c) => c.clave.startsWith('vq_') === vq).map((c) => {
      const val = valorDe(establecimiento, campana, c.clave);
      const ob = objetivoDe(establecimiento, c);
      const gr = promedioGrupo(todos, campana, c.clave);
      const brecha = val !== null && ob !== null ? val - ob : null;
      return {
        etiqueta: c.etiqueta,
        valor: formatearValor(val, c.formato),
        objetivo: formatearValor(ob, c.formato),
        brecha: formatearDiferencia(brecha, c.formato),
        grupo: formatearValor(gr, c.formato),
      };
    });
  }

  const anios = [...new Set(establecimiento.registros.map((r) => r.campana))].sort((a, b) => a - b);
  const historia = anios.map((a) => ({
    campana: a,
    valor: formatearValor(valorDe(establecimiento, a, defTitular.clave), defTitular.formato),
  }));

  return {
    establecimiento,
    campana,
    leadTexto,
    filasCria: filasPara(false),
    filasRepo: filasPara(true),
    historia,
  };
}
