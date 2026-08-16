/**
 * Reglas de validación declarativas (CLAUDE.md §7).
 * Agregar una regla es agregar un objeto a REGLAS, nunca un `if` suelto.
 * `err` bloquea el uso de los indicadores de esa campaña; `warn` no bloquea.
 */
import type { CriaEntrada, IndicadoresCria, IndicadoresReposicion, ReposicionEntrada } from './indicadores';

export type Severidad = 'err' | 'warn';
export type Sistema = 'Cría' | 'Reposición' | 'Cruzada';

export type ContextoRegla = {
  cria: CriaEntrada | null;
  repo: ReposicionEntrada | null;
  indCria: IndicadoresCria | null;
  indRepo: IndicadoresReposicion | null;
  /** Claves de las entradas sin cargar en el bloque de cría de esta campaña. */
  faltantesCria: string[];
  /** Claves de las entradas sin cargar en el bloque de reposición de esta campaña. */
  faltantesRepo: string[];
};

export type Regla = {
  id: string;
  severidad: Severidad;
  sistema: Sistema;
  mensaje: string;
  /** Devuelve `false` si pasa, o un string con la evidencia numérica si dispara. */
  test: (ctx: ContextoRegla) => false | string;
};

const gt = (a: number | null, b: number | null) => a !== null && b !== null && a > b;
const lt = (a: number | null, b: number | null) => a !== null && b !== null && a < b;
const lte = (a: number | null, b: number | null) => a !== null && b !== null && a <= b;

export const REGLAS: Regla[] = [
  // ---------- Cría ----------
  {
    id: 'CRIA-01', severidad: 'err', sistema: 'Cría', mensaje: 'Hay más vacas preñadas que tactadas.',
    test: ({ cria: c }) => c && gt(c.prenadas, c.tactadas) ? `preñadas ${c.prenadas} > tactadas ${c.tactadas}` : false,
  },
  {
    id: 'CRIA-02', severidad: 'err', sistema: 'Cría', mensaje: 'Se vendieron más vacas vacías de las que había.',
    test: ({ cria: c, indCria: i }) => {
      if (!c || !i) return false;
      const vacias = c.tactadas !== null && c.prenadas !== null ? c.tactadas - c.prenadas : null;
      return gt(c.vendVacias, vacias) ? `vendidas vacías ${c.vendVacias} > vacías ${vacias}` : false;
    },
  },
  {
    id: 'CRIA-03', severidad: 'err', sistema: 'Cría', mensaje: 'Se vendieron más vacas preñadas de las que había.',
    test: ({ cria: c }) => c && gt(c.vendPrenadas, c.prenadas) ? `vendidas preñadas ${c.vendPrenadas} > preñadas ${c.prenadas}` : false,
  },
  {
    id: 'CRIA-04', severidad: 'err', sistema: 'Cría', mensaje: 'Nacieron más terneros que hembras había para parir.',
    test: ({ cria: c, indCria: i }) => c && i && gt(c.nacidos, i.hembrasAParir) ? `nacidos ${c.nacidos} > a parir ${i.hembrasAParir}` : false,
  },
  {
    id: 'CRIA-05', severidad: 'err', sistema: 'Cría', mensaje: 'Se destetaron más terneros que los nacidos.',
    test: ({ cria: c }) => c && gt(c.destetados, c.nacidos) ? `destetados ${c.destetados} > nacidos ${c.nacidos}` : false,
  },
  {
    id: 'CRIA-06', severidad: 'err', sistema: 'Cría', mensaje: 'Falta la superficie total del campo.',
    test: ({ cria: c }) => c && (c.supTotal === null || c.supTotal <= 0) ? 'superficie total vacía o cero' : false,
  },
  {
    id: 'CRIA-07', severidad: 'warn', sistema: 'Cría', mensaje: 'La superficie asignada a cría quedó en cero o negativa.',
    test: ({ indCria: i }) => i && i.supAsignadaHa !== null && i.supAsignadaHa <= 0 ? `superficie asignada ${i.supAsignadaHa} ha` : false,
  },
  {
    id: 'CRIA-08', severidad: 'warn', sistema: 'Cría', mensaje: 'El peso de vaca está fuera del rango habitual (320-600 kg).',
    test: ({ cria: c }) => c && c.pesoVaca !== null && (c.pesoVaca < 320 || c.pesoVaca > 600) ? `peso vaca ${c.pesoVaca} kg` : false,
  },
  {
    id: 'CRIA-09', severidad: 'warn', sistema: 'Cría', mensaje: 'Faltan datos en la fila de cría.',
    test: ({ cria: c, faltantesCria }) => c && faltantesCria.length > 0 ? `sin cargar: ${faltantesCria.join(', ')}` : false,
  },

  // ---------- Reposición ----------
  {
    id: 'REPO-01', severidad: 'err', sistema: 'Reposición', mensaje: 'Hay más vaquillonas aptas que terneras recriadas.',
    test: ({ repo: r }) => r && gt(r.aptas, r.ternerasRecriadas) ? `aptas ${r.aptas} > recriadas ${r.ternerasRecriadas}` : false,
  },
  {
    id: 'REPO-02', severidad: 'err', sistema: 'Reposición', mensaje: 'Hay más vaquillonas preñadas que tactadas.',
    test: ({ repo: r }) => r && gt(r.prenadas, r.tactadas) ? `preñadas ${r.prenadas} > tactadas ${r.tactadas}` : false,
  },
  {
    id: 'REPO-03', severidad: 'err', sistema: 'Reposición', mensaje: 'Se vendieron más vaquillonas preñadas de las que había.',
    test: ({ repo: r }) => r && gt(r.vendPrenadas, r.prenadas) ? `vendidas preñadas ${r.vendPrenadas} > preñadas ${r.prenadas}` : false,
  },
  {
    id: 'REPO-04', severidad: 'err', sistema: 'Reposición', mensaje: 'Nacieron más terneros que vaquillonas había para parir.',
    test: ({ repo: r, indRepo: i }) => r && i && gt(r.nacidos, i.vq_hembrasAParir) ? `nacidos ${r.nacidos} > a parir ${i.vq_hembrasAParir}` : false,
  },
  {
    id: 'REPO-05', severidad: 'err', sistema: 'Reposición', mensaje: 'Se destetaron más terneros que los nacidos.',
    test: ({ repo: r }) => r && gt(r.destetados, r.nacidos) ? `destetados ${r.destetados} > nacidos ${r.nacidos}` : false,
  },
  {
    id: 'REPO-06', severidad: 'err', sistema: 'Reposición', mensaje: 'Falta la superficie asignada a recría o a parición.',
    test: ({ repo: r }) => {
      if (!r) return false;
      const faltaRecria = r.supRecria === null || r.supRecria <= 0;
      const faltaParicion = r.supParicion === null || r.supParicion <= 0;
      return faltaRecria || faltaParicion
        ? `recría ${r.supRecria ?? '—'} ha · parición ${r.supParicion ?? '—'} ha`
        : false;
    },
  },
  {
    id: 'REPO-07', severidad: 'warn', sistema: 'Reposición', mensaje: 'Las vaquillonas tactadas no coinciden con las aptas a servicio.',
    test: ({ repo: r }) => r && r.tactadas !== null && r.aptas !== null && r.tactadas !== r.aptas
      ? `tactadas ${r.tactadas} ≠ aptas ${r.aptas}` : false,
  },
  {
    id: 'REPO-08', severidad: 'warn', sistema: 'Reposición', mensaje: 'El peso a los 15 meses no supera al peso al destete.',
    test: ({ repo: r }) => r && lte(r.peso15m, r.pesoDesteteTernera)
      ? `15m ${r.peso15m} kg vs destete ${r.pesoDesteteTernera} kg` : false,
  },
  {
    id: 'REPO-09', severidad: 'warn', sistema: 'Reposición', mensaje: 'Faltan datos en la fila de reposición.',
    test: ({ repo: r, faltantesRepo }) => r && faltantesRepo.length > 0 ? `sin cargar: ${faltantesRepo.join(', ')}` : false,
  },

  // ---------- Cruzadas ----------
  {
    id: 'CRUZ-01', severidad: 'warn', sistema: 'Cruzada', mensaje: 'La superficie de vaquillonas supera la superficie total del campo.',
    test: ({ cria: c, repo: r }) => {
      if (!c || !r || c.supTotal === null) return false;
      const supVq = Math.max(r.supRecria ?? 0, r.supParicion ?? 0);
      return gt(supVq, c.supTotal) ? `vaquillonas ${supVq} ha > total ${c.supTotal} ha` : false;
    },
  },
  {
    id: 'CRUZ-02', severidad: 'warn', sistema: 'Cruzada', mensaje: 'Hay datos de cría sin su contraparte de reposición para esa campaña.',
    test: ({ cria: c, repo: r }) => (c && !r) ? 'la campaña existe en cría pero no en reposición' : false,
  },
];
