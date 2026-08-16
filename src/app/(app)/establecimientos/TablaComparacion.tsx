'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Establecimiento } from '@/lib/datos';
import { CATALOGO, type Indicadores } from '@/lib/indicadores';
import { armarRanking, MODOS, type Modo } from '@/lib/comparacion';
import { formatearValor, formatearDiferencia, claseDiferencia } from '@/lib/formato';
import styles from './establecimientos.module.css';

export default function TablaComparacion({
  establecimientos,
  campana,
}: {
  establecimientos: Establecimiento[];
  campana: number;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('obj');
  const [indicador, setIndicador] = useState<keyof Indicadores>('kgTerneroDestetadoHa');

  const def = CATALOGO.find((d) => d.clave === indicador)!;
  const filas = useMemo(
    () => armarRanking(establecimientos, campana, def, modo),
    [establecimientos, campana, def, modo]
  );
  // La lista tiene que mostrar los establecimientos activos, tengan o no un valor para
  // comparar en esta campaña — armarRanking excluye los que no tienen dato, así que se
  // agregan al final sin barra ni chip.
  const sinValor = useMemo(
    () => establecimientos.filter((e) => !filas.some((f) => f.establecimiento.id === e.id)),
    [establecimientos, filas]
  );
  const max = Math.max(1, ...filas.map((f) => Math.max(f.valor, f.referencia ?? 0)));

  return (
    <div style={{ marginTop: 48 }}>
      <h2>Comparación entre campos</h2>
      <div className={styles.ctl}>
        <div className={styles.seg} role="group" aria-label="Modo de lectura">
          {(Object.keys(MODOS) as Modo[]).map((m) => (
            <button key={m} aria-pressed={m === modo} onClick={() => setModo(m)}>
              {m === 'obj' ? 'Contra su objetivo' : m === 'grp' ? 'Contra el grupo' : 'Contra su historia'}
            </button>
          ))}
        </div>
        <select className={styles.pill} value={indicador} onChange={(e) => setIndicador(e.target.value as keyof Indicadores)}>
          {CATALOGO.map((c) => (
            <option key={c.clave} value={c.clave}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <p className={styles.note}>{MODOS[modo].texto}</p>

      <div className={styles.rank}>
        <div className={styles.rhead}>
          <div>Establecimiento</div>
          <div />
          <div>Valor</div>
          <div>{MODOS[modo].etiqueta}</div>
        </div>
        <div className={styles.rankScroll}>
          {filas.map((f) => {
            const w = Math.max(2, (f.valor / max) * 100);
            const rw = f.referencia !== null ? (f.referencia / max) * 100 : null;
            const clase = claseDiferencia(f.diferencia, def.sentido);
            return (
              <div
                key={f.establecimiento.id}
                className={styles.row}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/establecimientos/${encodeURIComponent(f.establecimiento.nombre)}?campana=${campana}`)}
              >
                <div className={styles.nm}>{f.establecimiento.nombre}</div>
                <div className={styles.track}>
                  <div className={`${styles.fill} ${styles[`fill-${clase}`]}`} style={{ width: `${w}%` }} />
                  {rw !== null && <div className={styles.ref} style={{ left: `${Math.min(rw, 99.4)}%` }} />}
                </div>
                <div className={`${styles.val} num`}>{formatearValor(f.valor, def.formato)}</div>
                <div className={`chip chip-${clase} num`}>{formatearDiferencia(f.diferencia, def.formato)}</div>
              </div>
            );
          })}
          {sinValor.map((e) => {
            const bloqueada = e.registros.find((r) => r.campana === campana)?.bloqueado ?? false;
            return (
              <div
                key={e.id}
                className={styles.row}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/establecimientos/${encodeURIComponent(e.nombre)}?campana=${campana}`)}
              >
                <div className={styles.nm}>
                  {bloqueada && <span className="punto-alerta" title="Campaña bloqueada por errores" />}
                  {e.nombre}
                </div>
                <div className={styles.track} />
                <div className={`${styles.val} num`}>—</div>
                <div className="chip chip-neutro num">{bloqueada ? 'bloqueada' : 'sin dato'}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p className={styles.note} style={{ marginTop: 14 }}>
        {def.sentido === 0
          ? 'Este indicador no tiene una dirección buena ni mala: se lee en contexto, por eso las diferencias van sin destacar.'
          : 'Ordenado por diferencia, no por valor absoluto. La línea vertical marca la referencia del modo activo.'}
      </p>
    </div>
  );
}
