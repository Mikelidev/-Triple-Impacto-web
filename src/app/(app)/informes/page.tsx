import { obtenerEstablecimientos } from '@/lib/datos';
import EstadoVacio from '../EstadoVacio';
import InformeVista from './InformeVista';
import styles from './informes.module.css';

export default async function InformesPage({ searchParams }: PageProps<'/informes'>) {
  const sp = await searchParams;
  const establecimientos = await obtenerEstablecimientos();
  if (!establecimientos.length) return <EstadoVacio />;

  const anios = [...new Set(establecimientos.flatMap((e) => e.registros.map((r) => r.campana)))].sort(
    (a, b) => a - b
  );
  const campanaParam = Array.isArray(sp.campana) ? sp.campana[0] : sp.campana;
  const campana = Number(campanaParam) || anios[anios.length - 1];

  const nombreParam = Array.isArray(sp.establecimiento) ? sp.establecimiento[0] : sp.establecimiento;
  const nombreActual = establecimientos.find((e) => e.nombre === nombreParam)?.nombre ?? establecimientos[0].nombre;

  return (
    <div>
      <div className={styles.phead}>
        <div className="kicker">
          <span className="punto-alerta" />
          Campaña {campana}
        </div>
        <h1 style={{ marginTop: 10 }}>Informes</h1>
        <p>Una hoja por establecimiento, con cría y reposición, lista para imprimir o mandarle al dueño del campo.</p>
      </div>

      <InformeVista establecimientos={establecimientos} campana={campana} nombreActual={nombreActual} />
    </div>
  );
}
