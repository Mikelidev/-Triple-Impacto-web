'use client';

import { Fragment, useState } from 'react';
import type { Establecimiento } from '@/lib/datos';
import { CATALOGO } from '@/lib/indicadores';
import { valorDe } from '@/lib/comparacion';
import { formatearValor } from '@/lib/formato';
import styles from './establecimientos.module.css';

export default function ComparadorLibre({
  establecimientos,
  campana,
}: {
  establecimientos: Establecimiento[];
  campana: number;
}) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  function alternar(id: string) {
    setSeleccionados((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  const ordenados = [...establecimientos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const elegidos = ordenados.filter((e) => seleccionados.has(e.id));

  return (
    <div style={{ marginTop: 48 }}>
      <h2>Comparar los establecimientos que elijas</h2>
      <p className={styles.note}>
        Elegí uno o más campos para ver, lado a lado, los quince indicadores comparables de la campaña {campana} —
        cría y reposición juntos.
      </p>

      <div className={styles.chips}>
        {ordenados.map((e) => (
          <button
            key={e.id}
            type="button"
            className={styles.chipToggle}
            aria-pressed={seleccionados.has(e.id)}
            onClick={() => alternar(e.id)}
          >
            {e.nombre}
          </button>
        ))}
      </div>

      {elegidos.length === 0 ? (
        <p className={styles.note} style={{ marginTop: 16 }}>
          Elegí al menos un establecimiento para empezar.
        </p>
      ) : (
        <div className={styles.tblwrap} style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                {elegidos.map((e) => (
                  <th key={e.id}>{e.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATALOGO.map((c, i) => {
                const nuevoSistema = i === 0 || CATALOGO[i - 1].sistema !== c.sistema;
                return (
                  <Fragment key={c.clave}>
                    {nuevoSistema && (
                      <tr>
                        <td colSpan={elegidos.length + 1} className={styles.tdSeparador}>
                          {c.sistema === 'cria' ? 'Cría' : 'Reposición'}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className={styles.tdIndicador}>{c.etiqueta}</td>
                      {elegidos.map((e) => (
                        <td key={e.id} className="num">
                          {formatearValor(valorDe(e, campana, c.clave), c.formato)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
