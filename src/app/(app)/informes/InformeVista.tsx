'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Establecimiento } from '@/lib/datos';
import { construirDatosInforme, type FilaInformeIndicador } from './datosInforme';
import styles from './informes.module.css';

export default function InformeVista({
  establecimientos,
  campana,
  nombreActual,
}: {
  establecimientos: Establecimiento[];
  campana: number;
  nombreActual: string;
}) {
  const router = useRouter();
  const [generandoUno, setGenerandoUno] = useState(false);
  const [generandoTodos, setGenerandoTodos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const establecimiento = establecimientos.find((e) => e.nombre === nombreActual) ?? establecimientos[0];
  const datos = useMemo(
    () => construirDatosInforme(establecimiento, establecimientos, campana),
    [establecimiento, establecimientos, campana]
  );

  async function descargarUno() {
    setGenerandoUno(true);
    setError(null);
    try {
      const [{ default: jsPDF }, { default: autoTable }, { dibujarInforme, nombreArchivoInforme }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('./pdfInforme'),
      ]);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      dibujarInforme(doc, autoTable, datos);
      doc.save(nombreArchivoInforme(datos.establecimiento.nombre, campana));
    } catch {
      setError('No se pudo generar el PDF. Probá de nuevo.');
    } finally {
      setGenerandoUno(false);
    }
  }

  async function descargarTodos() {
    setGenerandoTodos(true);
    setError(null);
    try {
      const [{ default: jsPDF }, { default: autoTable }, { dibujarInforme }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('./pdfInforme'),
      ]);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const ordenados = [...establecimientos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      ordenados.forEach((e, i) => {
        if (i > 0) doc.addPage();
        dibujarInforme(doc, autoTable, construirDatosInforme(e, establecimientos, campana));
      });
      doc.save(`informes-campana-${campana}.pdf`);
    } catch {
      setError('No se pudieron generar los informes. Probá de nuevo.');
    } finally {
      setGenerandoTodos(false);
    }
  }

  return (
    <>
      <div className={`${styles.ctlwrap} noprint`}>
        <div className={styles.ctl}>
          <select
            className={styles.pill}
            value={datos.establecimiento.nombre}
            onChange={(e) => router.push(`/informes?establecimiento=${encodeURIComponent(e.target.value)}&campana=${campana}`)}
          >
            {establecimientos.map((e) => (
              <option key={e.id} value={e.nombre}>
                {e.nombre}
              </option>
            ))}
          </select>
          <button className={styles.botonSecundario} onClick={() => window.print()}>
            Imprimir
          </button>
          <button className={styles.botonSecundario} onClick={descargarUno} disabled={generandoUno}>
            {generandoUno ? 'Generando…' : 'Descargar PDF'}
          </button>
          <button className={styles.boton} onClick={descargarTodos} disabled={generandoTodos}>
            {generandoTodos ? 'Generando…' : `Descargar los ${establecimientos.length} informes`}
          </button>
        </div>
        {error && <p className={styles.errorPdf}>{error}</p>}
      </div>

      <div className={styles.rep}>
        <div className="kicker">
          <span className="punto-alerta" />
          Triple Impacto · informe de campaña {campana}
        </div>
        <h1>{datos.establecimiento.nombre}</h1>
        <p className={styles.lead}>{datos.leadTexto}</p>

        <h3 className={styles.subtitulo}>Cría</h3>
        <TablaInforme filas={datos.filasCria} />

        <h3 className={styles.subtitulo}>Reposición</h3>
        <TablaInforme filas={datos.filasRepo} />

        <h3 className={styles.subtitulo}>Historia de kg de ternero destetado/ha</h3>
        <div className={styles.tblwrap}>
          <table>
            <thead>
              <tr>
                {datos.historia.map((h) => (
                  <th key={h.campana}>{h.campana}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {datos.historia.map((h) => (
                  <td key={h.campana} className="num">
                    {h.valor}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function TablaInforme({ filas }: { filas: FilaInformeIndicador[] }) {
  return (
    <div className={styles.tblwrap}>
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            <th>Valor</th>
            <th>Objetivo</th>
            <th>Brecha</th>
            <th>Promedio del grupo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.etiqueta}>
              <td className={styles.txt}>{f.etiqueta}</td>
              <td>{f.valor}</td>
              <td>{f.objetivo}</td>
              <td>{f.brecha}</td>
              <td>{f.grupo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
