import styles from './cargando.module.css';

export default function Cargando() {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span className="kicker">Cargando</span>
    </div>
  );
}
