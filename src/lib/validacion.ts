/**
 * Corre las 20 reglas (§7) sobre las filas leídas de una hoja. Puro y compartido:
 * lo usa tanto la vista previa del importador (cliente) como la persistencia (servidor),
 * así el estado que ve el asesor es siempre el mismo que termina guardado.
 */
import { calcularIndicadoresCria, calcularIndicadoresReposicion, type CriaEntrada, type ReposicionEntrada } from './indicadores';
import { REGLAS, type ContextoRegla } from './reglas';
import type { FilaLeida } from './planilla';

export type AlertaGenerada = {
  campana: number;
  regla: string;
  severidad: 'err' | 'warn';
  sistema: string;
  mensaje: string;
  detalle: string;
};

export type EstadoCampana = 'ok' | 'warn' | 'err';

export type FilaValidada = {
  campana: number;
  cria: CriaEntrada | null;
  repo: ReposicionEntrada | null;
  faltantesCria: string[];
  faltantesRepo: string[];
  alertas: AlertaGenerada[];
  estado: EstadoCampana;
};

export function validarHoja(
  cria: FilaLeida<CriaEntrada>[],
  repo: FilaLeida<ReposicionEntrada>[]
): FilaValidada[] {
  const campanas = [...new Set([...cria.map((c) => c.campana), ...repo.map((r) => r.campana)])].sort(
    (a, b) => a - b
  );

  return campanas.map((campana) => {
    const filaCria = cria.find((c) => c.campana === campana) ?? null;
    const filaRepo = repo.find((r) => r.campana === campana) ?? null;

    const indCria = filaCria ? calcularIndicadoresCria(filaCria.entrada, filaRepo?.entrada ?? null) : null;
    const indRepo = filaRepo ? calcularIndicadoresReposicion(filaRepo.entrada) : null;

    const ctx: ContextoRegla = {
      cria: filaCria?.entrada ?? null,
      repo: filaRepo?.entrada ?? null,
      indCria,
      indRepo,
      faltantesCria: filaCria?.faltantes ?? [],
      faltantesRepo: filaRepo?.faltantes ?? [],
    };

    const alertas: AlertaGenerada[] = [];
    for (const regla of REGLAS) {
      const resultado = regla.test(ctx);
      if (resultado !== false) {
        alertas.push({
          campana,
          regla: regla.id,
          severidad: regla.severidad,
          sistema: regla.sistema,
          mensaje: regla.mensaje,
          detalle: resultado,
        });
      }
    }

    const estado: EstadoCampana = alertas.some((a) => a.severidad === 'err')
      ? 'err'
      : alertas.length
        ? 'warn'
        : 'ok';

    return {
      campana,
      cria: filaCria?.entrada ?? null,
      repo: filaRepo?.entrada ?? null,
      faltantesCria: filaCria?.faltantes ?? [],
      faltantesRepo: filaRepo?.faltantes ?? [],
      alertas,
      estado,
    };
  });
}
