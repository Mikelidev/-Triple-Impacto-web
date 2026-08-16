'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { leerHoja, type HojaLeida } from '@/lib/planilla';
import { validarHoja, type FilaValidada } from '@/lib/validacion';
import type { ImportarPayload, ImportarResumen } from '@/lib/importar-tipos';
import styles from './importar.module.css';

type HojaProcesada = { hoja: HojaLeida; filas: FilaValidada[] };
type Resultado = { hojas: HojaProcesada[]; problemas: string[] };

async function hashArchivo(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function ImportadorForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [archivoBuffer, setArchivoBuffer] = useState<ArrayBuffer | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resumenGuardado, setResumenGuardado] = useState<ImportarResumen | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  function procesarArchivo(file: File) {
    setErrorLectura(null);
    setResumenGuardado(null);
    setErrorGuardado(null);
    const fr = new FileReader();
    fr.onload = (ev) => {
      try {
        const buffer = ev.target!.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const hojas: HojaProcesada[] = [];
        const problemas: string[] = [];

        for (const nombre of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[nombre], {
            header: 1,
            defval: null,
            blankrows: true,
          }) as (string | number | null)[][];

          const leida = leerHoja(nombre, rows);
          if (!leida.ok) {
            problemas.push(`«${nombre}»: ${leida.error}`);
            continue;
          }
          const filas = validarHoja(leida.hoja.cria, leida.hoja.repo);
          hojas.push({ hoja: leida.hoja, filas });
        }

        if (!hojas.length && !problemas.length) {
          throw new Error('No se encontró ninguna campaña con datos.');
        }

        setArchivoBuffer(buffer);
        setNombreArchivo(file.name);
        setResultado({ hojas, problemas });
      } catch (err) {
        setErrorLectura(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
      }
    };
    fr.readAsArrayBuffer(file);
  }

  async function guardar() {
    if (!resultado || !archivoBuffer || !nombreArchivo) return;
    setGuardando(true);
    setErrorGuardado(null);
    try {
      const hash = await hashArchivo(archivoBuffer);
      const payload: ImportarPayload = {
        archivo: nombreArchivo,
        hash,
        hojas: resultado.hojas.map(({ hoja }) => ({
          nombre: hoja.nombre,
          cria: hoja.cria,
          repo: hoja.repo,
          objetivosCria: hoja.objetivosCria,
          objetivosRepo: hoja.objetivosRepo,
        })),
      };
      const res = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo guardar la importación.');
      setResumenGuardado(data as ImportarResumen);
      // El layout (buscador, selector de campaña) y el historial de esta misma página leyeron
      // sus datos una sola vez al entrar y no se vuelven a pedir solos. Sin este refresh, lo
      // recién importado no aparece en ningún lado hasta recargar la página a mano.
      router.refresh();
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : 'No se pudo guardar la importación.');
    } finally {
      setGuardando(false);
    }
  }

  const campanas = resultado
    ? [...new Set(resultado.hojas.flatMap((h) => h.filas.map((f) => f.campana)))].sort((a, b) => a - b)
    : [];
  const todasLasAlertas = resultado
    ? resultado.hojas.flatMap((h) => h.filas.flatMap((f) => f.alertas.map((a) => ({ ...a, establecimiento: h.hoja.nombre }))))
    : [];
  const errores = todasLasAlertas.filter((a) => a.severidad === 'err');
  const avisos = todasLasAlertas.filter((a) => a.severidad === 'warn');

  return (
    <div>
      <div
        className={`${styles.drop} ${arrastrando ? styles.hot : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          if (e.dataTransfer.files[0]) procesarArchivo(e.dataTransfer.files[0]);
        }}
      >
        <h2>{nombreArchivo ?? 'Soltá la planilla acá'}</h2>
        <p>{nombreArchivo ? 'Hacé clic para cargar otra planilla' : 'o hacé clic para elegirla · formato .xlsx'}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm"
          className={styles.hidden}
          onChange={(e) => e.target.files?.[0] && procesarArchivo(e.target.files[0])}
        />
      </div>

      {errorLectura && (
        <div className={`${styles.alert} ${styles.err}`} style={{ marginTop: 14 }}>
          <div className={styles.who}>No se pudo leer el archivo</div>
          <div className={styles.msg}>{errorLectura}</div>
        </div>
      )}

      {resultado && (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className="num">{resultado.hojas.length}</div>
              <div className={styles.k}>establecimientos</div>
            </div>
            <div className={styles.stat}>
              <div className="num">{resultado.hojas.reduce((s, h) => s + h.filas.length, 0)}</div>
              <div className={styles.k}>registros campo-campaña</div>
            </div>
            <div className={`${styles.stat} ${errores.length ? styles.bad : ''}`}>
              <div className="num">{errores.length}</div>
              <div className={styles.k}>errores que bloquean</div>
            </div>
            <div className={`${styles.stat} ${avisos.length ? styles.warn : ''}`}>
              <div className="num">{avisos.length}</div>
              <div className={styles.k}>avisos para revisar</div>
            </div>
          </div>

          {resultado.problemas.length > 0 && (
            <div className={`${styles.alert} ${styles.err}`}>
              <div className={styles.who}>Hojas que no siguen el formato esperado</div>
              <div className={styles.msg}>
                {resultado.problemas.map((p, i) => (
                  <div key={i}>{p}</div>
                ))}
              </div>
            </div>
          )}

          <section style={{ marginTop: 40 }}>
            <div className={styles.sechead}>
              <h2>Estado por campo y campaña</h2>
            </div>
            <div className={styles.matrix}>
              <table>
                <thead>
                  <tr>
                    <th />
                    {campanas.map((a) => (
                      <th key={a}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.hojas.map(({ hoja, filas }) => (
                    <tr key={hoja.nombre}>
                      <th>{hoja.nombre}</th>
                      {campanas.map((a) => {
                        const f = filas.find((x) => x.campana === a);
                        if (!f) return <td key={a}><div className={`${styles.cell} ${styles.none}`} /></td>;
                        return (
                          <td key={a}>
                            <div className={`${styles.cell} ${styles[f.estado]}`} title={`${f.alertas.length} alerta(s)`}>
                              {f.alertas.length || '·'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginTop: 40 }}>
            <div className={styles.sechead}>
              <h2>Qué hay que corregir</h2>
              <p>Los errores impiden confiar en los indicadores de esa campaña. Los avisos no bloquean.</p>
            </div>
            {!todasLasAlertas.length ? (
              <div className={styles.empty}>Los registros pasaron las 20 reglas de consistencia.</div>
            ) : (
              [...errores, ...avisos].map((a, i) => (
                <div key={i} className={`${styles.alert} ${styles[a.severidad]}`}>
                  <div className={styles.top}>
                    <span className={`${styles.tag} ${styles[a.severidad]}`}>{a.severidad === 'err' ? 'error' : 'aviso'}</span>
                    <span className={styles.who}>{a.establecimiento}</span>
                    <span className={styles.yr}>{a.campana} · {a.sistema}</span>
                    <span className={styles.yr} style={{ marginLeft: 'auto' }}>{a.regla}</span>
                  </div>
                  <div className={styles.msg}>{a.mensaje}</div>
                  <div className={styles.ev}>{a.detalle}</div>
                </div>
              ))
            )}
          </section>

          <section style={{ marginTop: 40 }}>
            <div className={styles.sechead}>
              <h2>Guardar</h2>
              <p>Se guardan los datos ingresados de las {resultado.hojas.length} hojas leídas. Reimportar la misma planilla actualiza, no duplica.</p>
            </div>
            {resumenGuardado ? (
              <div className={styles.empty}>
                Guardado: {resumenGuardado.establecimientos} establecimientos, {resumenGuardado.filas} registros
                ({resumenGuardado.errores} errores, {resumenGuardado.avisos} avisos).
              </div>
            ) : (
              <>
                <button className={styles.boton} onClick={guardar} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar en la base de datos'}
                </button>
                {errorGuardado && (
                  <div className={`${styles.alert} ${styles.err}`} style={{ marginTop: 14 }}>
                    <div className={styles.msg}>{errorGuardado}</div>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
