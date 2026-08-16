'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Establecimiento } from '@/lib/datos';
import { filasAlerta, mejorEvolucion, promedioGrupo } from '@/lib/comparacion';
import { definicionDe, INDICADOR_TITULAR, type Indicadores } from '@/lib/indicadores';
import { formatearValor } from '@/lib/formato';
import { pathSparkline } from '@/lib/sparkline';
import styles from './panorama.module.css';

/** Los mismos seis indicadores "principales" que se usan en la ficha y en Establecimientos. */
const INDICADORES_PROMEDIO: (keyof Indicadores)[] = [
  'kgTerneroDestetadoHa',
  'pctPrenez',
  'pctDesteteAjustado',
  'mermaPartoDestete',
  'cargaKgVacaHa',
  'ratioProduccionCarga',
];

export default function PanoramaVista({
  establecimientos,
  campana,
  anios,
  fechaUltimaImportacion,
}: {
  establecimientos: Establecimiento[];
  campana: number;
  anios: number[];
  fechaUltimaImportacion: string | null;
}) {
  const defTitular = definicionDe(INDICADOR_TITULAR);

  const sinDatos = useMemo(
    () => establecimientos.filter((e) => !e.registros.some((r) => r.campana === campana)),
    [establecimientos, campana]
  );

  const bloqueadasPorEstablecimiento = useMemo(() => {
    const mapa = new Map<string, { nombre: string; campanas: number[] }>();
    for (const e of establecimientos) {
      const campanas = e.registros.filter((r) => r.bloqueado).map((r) => r.campana);
      if (campanas.length) mapa.set(e.id, { nombre: e.nombre, campanas });
    }
    return [...mapa.values()];
  }, [establecimientos]);
  const totalBloqueadas = bloqueadasPorEstablecimiento.reduce((s, e) => s + e.campanas.length, 0);

  const resumen = useMemo(() => {
    let ha = 0;
    let vacas = 0;
    let kg = 0;
    let algunoConDatos = false;
    for (const e of establecimientos) {
      const r = e.registros.find((x) => x.campana === campana);
      if (!r || r.bloqueado || !r.cria) continue;
      algunoConDatos = true;
      ha += r.cria.supTotal ?? 0;
      vacas += r.cria.tactadas ?? 0;
      if (r.cria.destetados !== null && r.cria.pesoDestete !== null) {
        kg += r.cria.destetados * r.cria.pesoDestete;
      }
    }
    return algunoConDatos ? { ha, vacas, kg } : null;
  }, [establecimientos, campana]);

  const serieKgTotal = useMemo(
    () =>
      anios.map((a) => {
        let total = 0;
        let algunoConDatos = false;
        for (const e of establecimientos) {
          const r = e.registros.find((x) => x.campana === a);
          if (!r || r.bloqueado || !r.cria) continue;
          if (r.cria.destetados !== null && r.cria.pesoDestete !== null) {
            total += r.cria.destetados * r.cria.pesoDestete;
            algunoConDatos = true;
          }
        }
        return algunoConDatos ? total : null;
      }),
    [establecimientos, anios]
  );
  const svgTendencia = pathSparkline(serieKgTotal, 200, 44);

  const alertas = useMemo(() => filasAlerta(establecimientos, campana), [establecimientos, campana]);
  const destacado = useMemo(() => mejorEvolucion(establecimientos, campana), [establecimientos, campana]);

  const promedios = useMemo(
    () =>
      INDICADORES_PROMEDIO.map((clave) => {
        const def = definicionDe(clave);
        return { def, valor: promedioGrupo(establecimientos, campana, clave) };
      }).filter((p) => p.valor !== null),
    [establecimientos, campana]
  );

  return (
    <div>
      <div className={styles.headerRow}>
        <div className={styles.phead}>
          <div className="kicker">
            <span className="punto-alerta" />
            Campaña {campana}
          </div>
          <h1 style={{ marginTop: 10 }}>Panorama de establecimientos</h1>
          <p>Un vistazo rápido a lo que necesita atención esta campaña. Para comparar los once campos entre sí, andá a Establecimientos.</p>
          {fechaUltimaImportacion && (
            <p className={styles.actualizado}>Datos al {fechaUltimaImportacion}.</p>
          )}
        </div>

        {(alertas.length > 0 || destacado) && (
          <div className={styles.panelAlertas}>
            <div className="kicker">Necesitan atención</div>
            {alertas.length > 0 ? (
              <div className={styles.listaAlertas}>
                {alertas.map((f) => (
                  <Link
                    key={f.establecimiento.id}
                    href={`/establecimientos/${encodeURIComponent(f.establecimiento.nombre)}?campana=${campana}`}
                    className={styles.filaAlerta}
                  >
                    <span className="punto-alerta" />
                    <span className={styles.filaAlertaTexto}>
                      <span className={styles.filaAlertaNombre}>{f.establecimiento.nombre}</span>
                      <span className={styles.filaAlertaMotivo}>{f.motivo}</span>
                    </span>
                    <span className="chip chip-desfavorable num">
                      ↓ {formatearValor(Math.abs(f.valor), defTitular.formato)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.sinAlertas}>Ningún campo está cayendo ni por debajo de su objetivo.</p>
            )}
            {destacado && (
              <Link
                href={`/establecimientos/${encodeURIComponent(destacado.establecimiento.nombre)}?campana=${campana}`}
                className={styles.filaDestacado}
              >
                <span className={styles.filaAlertaMotivo}>Mejor evolución: {destacado.establecimiento.nombre}</span>
                <span className="chip chip-favorable num">
                  ↑ {formatearValor(destacado.tendencia, defTitular.formato)}
                </span>
              </Link>
            )}
          </div>
        )}
      </div>

      {totalBloqueadas > 0 && (
        <p className={styles.notaBloqueadas}>
          <span className="punto-alerta" />
          {totalBloqueadas === 1 ? 'Hay 1 campaña bloqueada' : `Hay ${totalBloqueadas} campañas bloqueadas`} por
          errores de validación sin resolver:{' '}
          {bloqueadasPorEstablecimiento.map((e, i) => (
            <span key={e.nombre}>
              {i > 0 && ', '}
              <Link href={`/establecimientos/${encodeURIComponent(e.nombre)}?campana=${e.campanas[0]}`}>
                {e.nombre}
              </Link>{' '}
              ({e.campanas.join(', ')})
            </span>
          ))}
          .
        </p>
      )}

      {sinDatos.length > 0 && (
        <p className={styles.notaIncompleta}>
          <span className="punto-alerta" />
          {sinDatos.length === 1
            ? `${sinDatos[0].nombre} todavía no tiene datos cargados para la campaña ${campana}.`
            : `${sinDatos.length} establecimientos todavía no tienen datos cargados para la campaña ${campana}: ${sinDatos.map((e) => e.nombre).join(', ')}.`}
        </p>
      )}

      {resumen && (
        <div className={styles.resumen}>
          <div className={styles.stat}>
            <div className={styles.statK}>Hectáreas totales</div>
            <div className={`${styles.statV} num`}>{formatearValor(resumen.ha, 'n0')}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statK}>Vacas tactadas</div>
            <div className={`${styles.statV} num`}>{formatearValor(resumen.vacas, 'n0')}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statK}>Kg de ternero producidos</div>
            <div className={`${styles.statV} num`}>{formatearValor(resumen.kg, 'n0')}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statK}>Tendencia, kg total por campaña</div>
            {svgTendencia ? (
              <svg width={svgTendencia.W} height={svgTendencia.H} viewBox={`0 0 ${svgTendencia.W} ${svgTendencia.H}`} aria-hidden style={{ marginTop: 6, display: 'block' }}>
                <path d={svgTendencia.d} fill="none" stroke="#4F6F52" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={svgTendencia.ultimo[0]} cy={svgTendencia.ultimo[1]} r={2.6} fill="#1E2B21" />
              </svg>
            ) : (
              <div className={styles.statV} style={{ fontSize: 13 }}>
                Sin historia suficiente
              </div>
            )}
          </div>
        </div>
      )}

      {promedios.length > 0 && (
        <>
          <h2>Promedio de los {establecimientos.length} campos</h2>
          <div className={styles.cards} style={{ marginTop: 14 }}>
            {promedios.map((p) => (
              <div className={styles.card} key={p.def.clave}>
                <div className="kicker">{p.def.etiqueta}</div>
                <div className={`${styles.big} num`}>{formatearValor(p.valor, p.def.formato)}</div>
                <div className={styles.sub}>Promedio del grupo, campaña {campana}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
