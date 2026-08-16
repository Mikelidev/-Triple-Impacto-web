import { obtenerEstablecimientos, obtenerHistorialImportaciones } from '@/lib/datos';
import EstadoVacio from '../EstadoVacio';
import PanoramaVista from './PanoramaVista';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long' });

export default async function PanoramaPage({ searchParams }: PageProps<'/panorama'>) {
  const sp = await searchParams;
  const establecimientos = await obtenerEstablecimientos();
  if (!establecimientos.length) return <EstadoVacio />;

  const anios = [...new Set(establecimientos.flatMap((e) => e.registros.map((r) => r.campana)))].sort(
    (a, b) => a - b
  );
  const campanaParam = Array.isArray(sp.campana) ? sp.campana[0] : sp.campana;
  const campana = Number(campanaParam) || anios[anios.length - 1];

  const [ultimaImportacion] = await obtenerHistorialImportaciones(1);
  const fechaUltimaImportacion = ultimaImportacion ? formatoFecha.format(new Date(ultimaImportacion.fecha)) : null;

  return (
    <PanoramaVista
      establecimientos={establecimientos}
      campana={campana}
      anios={anios}
      fechaUltimaImportacion={fechaUltimaImportacion}
    />
  );
}
