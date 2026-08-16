'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { crearClienteNavegador } from '@/lib/supabase/client';
import styles from './shell.module.css';

type EstablecimientoResumen = { id: string; nombre: string };

export default function Shell({
  anios,
  establecimientos,
  children,
}: {
  anios: number[];
  establecimientos: EstablecimientoResumen[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);

  const campanaActual = Number(searchParams.get('campana')) || anios[anios.length - 1];

  function cambiarCampana(valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('campana', valor);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function cerrarSesion() {
    const supabase = crearClienteNavegador();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const coincidencias = establecimientos
    .filter((e) => !q || e.nombre.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 6);

  const enlaces = [
    { href: '/panorama', label: 'Panorama' },
    { href: '/establecimientos', label: 'Establecimientos' },
    { href: '/informes', label: 'Informes' },
  ];

  return (
    <div className={styles.app}>
      <aside className={styles.aside}>
        <div className={styles.brand}>
          <div className={styles.brandKicker}>
            <span className="punto-alerta" />
            Gestión de datos
          </div>
          <div className={styles.brandName}>Triple Impacto</div>
        </div>
        <nav className={styles.nav}>
          {enlaces.map((l) => (
            <Link
              key={l.href}
              href={`${l.href}?campana=${campanaActual}`}
              aria-current={pathname.startsWith(l.href) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className={styles.asidefoot}>
          <button className={styles.salir} onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.searchwrap}>
            <input
              type="search"
              placeholder="Buscar un establecimiento"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setAbierto(true)}
              onBlur={() => setTimeout(() => setAbierto(false), 140)}
            />
            {abierto && coincidencias.length > 0 && (
              <div className={styles.sugg} role="listbox">
                {coincidencias.map((e) => (
                  <button
                    key={e.id}
                    onMouseDown={() => router.push(`/establecimientos/${encodeURIComponent(e.nombre)}?campana=${campanaActual}`)}
                  >
                    {e.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.campanawrap}>
            <label htmlFor="campana">Campaña</label>
            <select id="campana" value={campanaActual} onChange={(e) => cambiarCampana(e.target.value)}>
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <Link className={styles.importar} href="/importar">
            Importar planilla
          </Link>
        </div>
        <div className={styles.page}>{children}</div>
      </div>
    </div>
  );
}
