import { notFound } from 'next/navigation';
import Link from 'next/link';
import { obtenerEstablecimientos } from '@/lib/datos';
import { CATALOGO, definicionDe, type Indicadores } from '@/lib/indicadores';
import { objetivoDe, historiaDe, promedioGrupo } from '@/lib/comparacion';
import { formatearValor } from '@/lib/formato';
import Ficha from './Ficha';

const INDICADORES_FICHA: (keyof Indicadores)[] = [
  'kgTerneroDestetadoHa',
  'pctPrenez',
  'pctDesteteAjustado',
  'mermaPartoDestete',
  'cargaKgVacaHa',
  'ratioProduccionCarga',
];

export const COLUMNAS_HISTORIA: { clave: keyof Indicadores; etiqueta: string; formato: 'n0' | 'n1' | 'n2' | 'p' }[] = [
  { clave: 'pctPrenez', etiqueta: '% preñez', formato: 'p' },
  { clave: 'mermaPartoDestete', etiqueta: 'Merma p-d', formato: 'p' },
  { clave: 'pctDesteteAjustado', etiqueta: '% destete aj.', formato: 'p' },
  { clave: 'retenidasEnCampo', etiqueta: 'Retenidas', formato: 'n0' },
  { clave: 'hembrasAParir', etiqueta: 'A parir', formato: 'n0' },
  { clave: 'kgTerneroDestetadoHa', etiqueta: 'kg tern/ha', formato: 'n1' },
  { clave: 'cargaKgVacaHa', etiqueta: 'Carga kg/ha', formato: 'n1' },
  { clave: 'ratioProduccionCarga', etiqueta: 'Prod/carga', formato: 'n2' },
  { clave: 'vq_pctPrenez', etiqueta: '% preñez vq', formato: 'p' },
  { clave: 'vq_kgTerneroDestetadoHa', etiqueta: 'kg tern/ha vq', formato: 'n1' },
];

export default async function FichaPage({
  params,
  searchParams,
}: PageProps<'/establecimientos/[nombre]'>) {
  // Comprobado en runtime: Next (Turbopack, App Router) NO decodifica el segmento dinámico acá
  // -- params.nombre llega literalmente como "El%20Boyero". Hay que decodificarlo a mano.
  // decodeURIComponent puede tirar URIError si el nombre trae un '%' mal formado; se cubre igual.
  const { nombre } = await params;
  const sp = await searchParams;
  let nombreDecodificado: string;
  try {
    nombreDecodificado = decodeURIComponent(nombre);
  } catch {
    notFound();
  }

  const establecimientos = await obtenerEstablecimientos();
  const establecimiento = establecimientos.find((e) => e.nombre === nombreDecodificado);
  if (!establecimiento) notFound();

  const anios = [...new Set(establecimientos.flatMap((e) => e.registros.map((r) => r.campana)))].sort(
    (a, b) => a - b
  );
  const campanaParam = Array.isArray(sp.campana) ? sp.campana[0] : sp.campana;
  const campana = Number(campanaParam) || anios[anios.length - 1];

  const sparklines = INDICADORES_FICHA.map((clave) => {
    const def = definicionDe(clave);
    const registro = establecimiento.registros.find((r) => r.campana === campana);
    const valor = registro && !registro.bloqueado ? registro.ind[clave] ?? null : null;
    return {
      clave,
      etiqueta: def.etiqueta,
      formato: def.formato,
      sentido: def.sentido,
      valor,
      serie: anios.map((a) => {
        const r = establecimiento.registros.find((r) => r.campana === a);
        return r && !r.bloqueado ? r.ind[clave] ?? null : null;
      }),
      refObj: objetivoDe(establecimiento, def),
      refGrp: promedioGrupo(establecimientos, campana, clave),
      refTen: historiaDe(establecimiento, campana, clave),
    };
  });

  const filasHistoria = establecimiento.registros.map((r) => ({
    campana: r.campana,
    bloqueado: r.bloqueado,
    valores: COLUMNAS_HISTORIA.map((c) => formatearValor(r.ind[c.clave], c.formato)),
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div className="kicker">Ficha de establecimiento</div>
          <h2 style={{ marginTop: 8 }}>{establecimiento.nombre}</h2>
        </div>
        <Link href={`/establecimientos?campana=${campana}`} style={{ fontSize: 13.5, color: 'var(--tinta)', borderBottom: '1px solid var(--primario)' }}>
          Volver a la lista
        </Link>
      </div>

      <Ficha sparklines={sparklines} columnas={COLUMNAS_HISTORIA} filas={filasHistoria} />
    </div>
  );
}
