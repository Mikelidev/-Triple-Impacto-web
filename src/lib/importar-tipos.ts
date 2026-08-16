import type { CriaEntrada, ReposicionEntrada } from './indicadores';
import type { FilaLeida } from './planilla';

export type HojaPayload = {
  nombre: string;
  cria: FilaLeida<CriaEntrada>[];
  repo: FilaLeida<ReposicionEntrada>[];
  objetivosCria: Record<string, number>;
  objetivosRepo: Record<string, number>;
};

export type ImportarPayload = {
  archivo: string;
  hash: string;
  hojas: HojaPayload[];
};

export type ImportarResumen = {
  importacionId: string;
  establecimientos: number;
  filas: number;
  errores: number;
  avisos: number;
};
