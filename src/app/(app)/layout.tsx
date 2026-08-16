import { obtenerEstablecimientos } from '@/lib/datos';
import Shell from './Shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const establecimientos = await obtenerEstablecimientos();
  const anios = [...new Set(establecimientos.flatMap((e) => e.registros.map((r) => r.campana)))].sort(
    (a, b) => a - b
  );

  return (
    <Shell
      anios={anios}
      establecimientos={establecimientos.map((e) => ({ id: e.id, nombre: e.nombre }))}
    >
      {children}
    </Shell>
  );
}
