'use client';

import { useState } from 'react';
import { MODOS, type Modo } from '@/lib/comparacion';
import { formatearValor, formatearDiferencia, claseDiferencia } from '@/lib/formato';
import type { Formato, Indicadores, Sentido } from '@/lib/indicadores';
import { pathSparkline } from '@/lib/sparkline';
import styles from './ficha.module.css';

type Sparkline = {
  clave: keyof Indicadores;
  etiqueta: string;
  formato: Formato;
  sentido: Sentido;
  valor: number | null;
  serie: (number | null)[];
  refObj: number | null;
  refGrp: number | null;
  refTen: number | null;
};

export default function Ficha({
  sparklines,
  columnas,
  filas,
}: {
  sparklines: Sparkline[];
  columnas: { clave: keyof Indicadores; etiqueta: string; formato: Formato }[];
  filas: { campana: number; bloqueado: boolean; valores: string[] }[];
}) {
  const [modo, setModo] = useState<Modo>('obj');

  return (
    <>
      <div className={styles.ctl}>
        <div className={styles.seg} role="group" aria-label="Modo de lectura">
          {(Object.keys(MODOS) as Modo[]).map((m) => (
            <button key={m} aria-pressed={m === modo} onClick={() => setModo(m)}>
              {m === 'obj' ? 'Contra su objetivo' : m === 'grp' ? 'Contra el grupo' : 'Contra su historia'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.spark}>
        {sparklines.map((s) => {
          const ref = modo === 'obj' ? s.refObj : modo === 'grp' ? s.refGrp : s.refTen;
          const diff = s.valor !== null && ref !== null ? s.valor - ref : null;
          const clase = claseDiferencia(diff, s.sentido);
          const svg = pathSparkline(s.serie);
          return (
            <div className={styles.sp} key={s.clave}>
              <div className={styles.lab}>{s.etiqueta}</div>
              <div className={`${styles.v} num`}>{formatearValor(s.valor, s.formato)}</div>
              <div className={`${styles.d} num chip-${clase}`}>
                {diff === null ? 'sin referencia' : `${formatearDiferencia(diff, s.formato)} ${MODOS[modo].etiqueta}`}
              </div>
              {svg && (
                <svg width={svg.W} height={svg.H} viewBox={`0 0 ${svg.W} ${svg.H}`} aria-hidden style={{ marginTop: 9, display: 'block' }}>
                  <path d={svg.d} fill="none" stroke="#4F6F52" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={svg.ultimo[0]} cy={svg.ultimo[1]} r={2.6} fill="#1E2B21" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.tblwrap}>
        <table>
          <thead>
            <tr>
              <th>Campaña</th>
              {columnas.map((c) => (
                <th key={c.clave}>{c.etiqueta}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.campana}>
                <td className={styles.n}>
                  {f.campana}
                  {f.bloqueado && <span className="punto-alerta" title="Campaña con errores: no se usa en comparaciones" />}
                </td>
                {f.valores.map((v, i) => (
                  <td key={i}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
