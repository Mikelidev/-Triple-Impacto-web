'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Establecimiento } from '@/lib/datos';
import { definicionDe, type Indicadores } from '@/lib/indicadores';
import { valorDe } from '@/lib/comparacion';
import { formatearValor } from '@/lib/formato';
import styles from './establecimientos.module.css';

type Formato = 'n0' | 'n1' | 'n2' | 'p';

type Columna = {
  clave: string;
  corta: string;
  completa: string;
  formato: Formato;
  valor: (e: Establecimiento, campana: number) => number | null;
};

function columnasIndicadores(claves: (keyof Indicadores)[], cortas: Record<string, string>): Columna[] {
  return claves.map((clave) => {
    const def = definicionDe(clave);
    return {
      clave,
      corta: cortas[clave] ?? def.etiqueta,
      completa: def.etiqueta,
      formato: def.formato,
      valor: (e, campana) => valorDe(e, campana, clave),
    };
  });
}

const COLUMNAS_CRIA: Columna[] = [
  {
    clave: 'supTotal',
    corta: 'Superficie ha',
    completa: 'Superficie total (ha)',
    formato: 'n0',
    valor: (e, campana) => e.registros.find((r) => r.campana === campana)?.cria?.supTotal ?? null,
  },
  {
    clave: 'tactadas',
    corta: 'Vacas tactadas',
    completa: 'Vacas tactadas',
    formato: 'n0',
    valor: (e, campana) => e.registros.find((r) => r.campana === campana)?.cria?.tactadas ?? null,
  },
  ...columnasIndicadores(
    ['kgTerneroDestetadoHa', 'pctPrenez', 'pctDesteteAjustado', 'mermaPartoDestete', 'cargaKgVacaHa', 'ratioProduccionCarga'],
    {
      kgTerneroDestetadoHa: 'kg tern/ha',
      pctPrenez: '% preñez',
      pctDesteteAjustado: '% destete aj.',
      mermaPartoDestete: 'Merma p-d',
      cargaKgVacaHa: 'Carga kg/ha',
      ratioProduccionCarga: 'Prod/carga',
    }
  ),
];

const COLUMNAS_REPO: Columna[] = columnasIndicadores(
  ['vq_pctApto', 'vq_pctPrenez', 'vq_pctDesteteAjustado', 'vq_kgTerneroDestetadoHa', 'vq_cargaKgVqHa', 'vq_ratioProduccionCarga'],
  {
    vq_pctApto: '% apto',
    vq_pctPrenez: '% preñez',
    vq_pctDesteteAjustado: '% destete aj.',
    vq_kgTerneroDestetadoHa: 'kg tern/ha',
    vq_cargaKgVqHa: 'Carga kg/ha',
    vq_ratioProduccionCarga: 'Prod/carga',
  }
);

type Orden = { columna: string; direccion: 'asc' | 'desc' } | null;

function Tabla({
  descripcion,
  establecimientos,
  campana,
  columnas,
  bloqueadas,
}: {
  descripcion: string;
  establecimientos: Establecimiento[];
  campana: number;
  columnas: Columna[];
  bloqueadas: Set<string>;
}) {
  const [orden, setOrden] = useState<Orden>(null);

  const filas = useMemo(() => {
    const base = [...establecimientos];
    if (!orden) return base.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const col = columnas.find((c) => c.clave === orden.columna);
    if (!col) return base.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return base.sort((a, b) => {
      const va = col.valor(a, campana);
      const vb = col.valor(b, campana);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return orden.direccion === 'asc' ? va - vb : vb - va;
    });
  }, [establecimientos, campana, orden, columnas]);

  function alClicEncabezado(clave: string) {
    setOrden((actual) => {
      if (!actual || actual.columna !== clave) return { columna: clave, direccion: 'desc' };
      if (actual.direccion === 'desc') return { columna: clave, direccion: 'asc' };
      return null;
    });
  }

  return (
    <div>
      <p className={styles.note} style={{ marginTop: 12 }}>{descripcion}</p>
      <div className={styles.tblwrap}>
        <table>
          <thead>
            <tr>
              <th
                className={styles.thOrdenable}
                onClick={() => setOrden(null)}
                title="Orden alfabético"
              >
                Establecimiento
              </th>
              {columnas.map((c) => (
                <th
                  key={c.clave}
                  title={c.completa}
                  className={styles.thOrdenable}
                  onClick={() => alClicEncabezado(c.clave)}
                  aria-sort={orden?.columna === c.clave ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.corta}
                  {orden?.columna === c.clave && (orden.direccion === 'asc' ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((e) => (
              <tr key={e.id}>
                <td className={styles.tdNombre}>
                  {bloqueadas.has(e.id) && <span className="punto-alerta" title="Tiene una campaña bloqueada por errores" />}
                  <Link href={`/establecimientos/${encodeURIComponent(e.nombre)}?campana=${campana}`}>{e.nombre}</Link>
                </td>
                {columnas.map((c) => (
                  <td key={c.clave} className="num">
                    {formatearValor(c.valor(e, campana), c.formato)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Sistema = 'cria' | 'recria';

export default function TablaGeneral({
  establecimientos,
  campana,
}: {
  establecimientos: Establecimiento[];
  campana: number;
}) {
  const [sistema, setSistema] = useState<Sistema>('cria');

  const bloqueadas = useMemo(() => {
    const set = new Set<string>();
    for (const e of establecimientos) {
      if (e.registros.some((r) => r.campana === campana && r.bloqueado)) set.add(e.id);
    }
    return set;
  }, [establecimientos, campana]);

  return (
    <div>
      <h2>Todos los indicadores</h2>
      <div className={styles.seg} role="group" aria-label="Sistema">
        <button aria-pressed={sistema === 'cria'} onClick={() => setSistema('cria')}>
          Cría
        </button>
        <button aria-pressed={sistema === 'recria'} onClick={() => setSistema('recria')}>
          Re-cría
        </button>
      </div>
      <Tabla
        key={sistema}
        descripcion={
          sistema === 'cria'
            ? `Un registro por establecimiento con superficie, vacas tactadas y sus indicadores principales de cría de la campaña ${campana}. Hacé clic en un encabezado para ordenar.`
            : `Lo mismo para las vaquillonas de reposición de la campaña ${campana}.`
        }
        establecimientos={establecimientos}
        campana={campana}
        columnas={sistema === 'cria' ? COLUMNAS_CRIA : COLUMNAS_REPO}
        bloqueadas={bloqueadas}
      />
    </div>
  );
}
