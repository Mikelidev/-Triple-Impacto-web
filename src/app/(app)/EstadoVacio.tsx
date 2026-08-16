import Link from 'next/link';
import styles from './estado-vacio.module.css';

export default function EstadoVacio() {
  return (
    <div className={styles.wrap}>
      <div className="kicker">
        <span className="punto-alerta" />
        Primeros pasos
      </div>
      <h1 className={styles.titulo}>Todavía no hay datos cargados</h1>
      <p className={styles.texto}>
        El panorama, las fichas y los informes se arman a partir de la planilla de campaña.
        Importá la primera para empezar a ver los once establecimientos.
      </p>
      <Link className={styles.boton} href="/importar">
        Importar planilla
      </Link>
    </div>
  );
}
