import { obtenerHistorialImportaciones } from '@/lib/datos';
import ImportadorForm from './ImportadorForm';
import styles from './importar.module.css';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

export default async function ImportarPage() {
  const historial = await obtenerHistorialImportaciones();

  return (
    <div>
      <div className={styles.phead}>
        <div className="kicker">
          <span className="punto-alerta" />
          Asesoramiento ganadero · control de datos
        </div>
        <h1 style={{ marginTop: 10 }}>Importador de planilla</h1>
        <p>
          Leé el archivo de campaña, verificá que los números cierren y guardalo en la base normalizada. Los
          indicadores no se importan: se recalculan al vuelo con una sola definición.
        </p>
      </div>

      <section style={{ marginBottom: 40 }}>
        <div className={styles.sechead}>
          <h2>Historial de importaciones</h2>
          <p>Para saber qué planilla es la vigente y cuándo se cargó por última vez.</p>
        </div>
        {historial.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--cuerpo)' }}>Todavía no se importó ninguna planilla.</p>
        ) : (
          <div className={styles.historial}>
            {historial.map((h, i) => (
              <div key={h.id} className={styles.historialFila}>
                <div className={styles.historialArchivo}>
                  {i === 0 && <span className={styles.actual}>Actual</span>}
                  {h.archivo}
                </div>
                <div className={`${styles.historialFecha} num`}>{formatoFecha.format(new Date(h.fecha))}</div>
                <div className={`${styles.historialStats} num`}>
                  {h.filasOk} registros
                  {h.alertas > 0 ? ` · ${h.alertas} alertas` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ImportadorForm />
    </div>
  );
}
