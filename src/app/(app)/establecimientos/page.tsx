import { obtenerEstablecimientos } from '@/lib/datos';
import EstadoVacio from '../EstadoVacio';
import TablaComparacion from './TablaComparacion';
import TablaGeneral from './TablaGeneral';
import ComparadorLibre from './ComparadorLibre';
import styles from './establecimientos.module.css';

export default async function EstablecimientosPage({ searchParams }: PageProps<'/establecimientos'>) {
  const sp = await searchParams;
  const establecimientos = await obtenerEstablecimientos();
  if (!establecimientos.length) return <EstadoVacio />;

  const anios = [...new Set(establecimientos.flatMap((e) => e.registros.map((r) => r.campana)))].sort(
    (a, b) => a - b
  );
  const campanaParam = Array.isArray(sp.campana) ? sp.campana[0] : sp.campana;
  const campana = Number(campanaParam) || anios[anios.length - 1];

  return (
    <div>
      <div className={styles.phead}>
        <div className="kicker">
          <span className="punto-alerta" />
          Campaña {campana}
        </div>
        <h1 style={{ marginTop: 10 }}>Establecimientos</h1>
        <p>Los once campos activos, ordenados por la distancia a su referencia. Entrá a cualquiera para ver la serie completa.</p>
      </div>

      <TablaGeneral establecimientos={establecimientos} campana={campana} />
      <TablaComparacion establecimientos={establecimientos} campana={campana} />
      <ComparadorLibre establecimientos={establecimientos} campana={campana} />
    </div>
  );
}
