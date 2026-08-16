import { cache } from 'react';
import { crearClienteServidor } from './supabase/server';
import {
  calcularIndicadores,
  type CriaEntrada,
  type Indicadores,
  type ReposicionEntrada,
} from './indicadores';

export type RegistroCampana = {
  campana: number;
  cria: CriaEntrada | null;
  repo: ReposicionEntrada | null;
  ind: Indicadores;
  /** Tiene al menos una alerta de severidad 'err' vigente: sus indicadores no se usan en comparaciones (§7). */
  bloqueado: boolean;
};

export type Establecimiento = {
  id: string;
  nombre: string;
  registros: RegistroCampana[];
  /** clave = `${sistema}:${indicador}` (mismo vocabulario que la tabla objetivo) */
  objetivos: Record<string, number>;
};

const CRIA_VACIA: CriaEntrada = {
  supTotal: null, pesoVaca: null, tactadas: null, prenadas: null, vendVacias: null,
  vendPrenadas: null, mermas: null, nacidos: null, destetados: null, pesoDestete: null,
};

const REPO_VACIA: ReposicionEntrada = {
  pesoVqServicio: null, ternerasRecriadas: null, pesoDesteteTernera: null, peso15m: null,
  supRecria: null, aptas: null, tactadas: null, prenadas: null, vendNoAptas: null,
  vendPrenadas: null, supParicion: null, nacidos: null, destetados: null, pesoDestete: null,
};

function mapCria(row: Record<string, unknown>): CriaEntrada {
  return {
    supTotal: row.sup_total as number | null,
    pesoVaca: row.peso_vaca as number | null,
    tactadas: row.tactadas as number | null,
    prenadas: row.prenadas as number | null,
    vendVacias: row.vend_vacias as number | null,
    vendPrenadas: row.vend_prenadas as number | null,
    mermas: row.mermas as number | null,
    nacidos: row.nacidos as number | null,
    destetados: row.destetados as number | null,
    pesoDestete: row.peso_destete as number | null,
  };
}

function mapRepo(row: Record<string, unknown>): ReposicionEntrada {
  return {
    pesoVqServicio: row.peso_vq_servicio as number | null,
    ternerasRecriadas: row.terneras_recriadas as number | null,
    pesoDesteteTernera: row.peso_destete_ternera as number | null,
    peso15m: row.peso_15m as number | null,
    supRecria: row.sup_recria as number | null,
    aptas: row.aptas as number | null,
    tactadas: row.tactadas as number | null,
    prenadas: row.prenadas as number | null,
    vendNoAptas: row.vend_no_aptas as number | null,
    vendPrenadas: row.vend_prenadas as number | null,
    supParicion: row.sup_paricion as number | null,
    nacidos: row.nacidos as number | null,
    destetados: row.destetados as number | null,
    pesoDestete: row.peso_destete as number | null,
  };
}

export const obtenerEstablecimientos = cache(async (): Promise<Establecimiento[]> => {
  const supabase = await crearClienteServidor();

  const [{ data: estabs }, { data: crias }, { data: repos }, { data: objetivos }, { data: alertasErr }] = await Promise.all([
    supabase.from('establecimiento').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('cria_registro').select('*'),
    supabase.from('reposicion_registro').select('*'),
    supabase.from('objetivo').select('establecimiento_id, campana, sistema, indicador, valor'),
    supabase.from('alerta').select('establecimiento_id, campana').eq('severidad', 'err'),
  ]);

  const bloqueadas = new Set((alertasErr ?? []).map((a) => `${a.establecimiento_id}:${a.campana}`));

  const out: Establecimiento[] = [];

  for (const e of estabs ?? []) {
    const criasEst = (crias ?? []).filter((r) => r.establecimiento_id === e.id);
    const reposEst = (repos ?? []).filter((r) => r.establecimiento_id === e.id);
    const objetivosEst = (objetivos ?? []).filter((o) => o.establecimiento_id === e.id);

    const campanas = [...new Set([...criasEst.map((c) => c.campana), ...reposEst.map((r) => r.campana)])].sort(
      (a, b) => a - b
    );

    const registros: RegistroCampana[] = campanas.map((campana) => {
      const filaCria = criasEst.find((c) => c.campana === campana);
      const filaRepo = reposEst.find((r) => r.campana === campana);
      const cria = filaCria ? mapCria(filaCria) : CRIA_VACIA;
      const repo = filaRepo ? mapRepo(filaRepo) : null;
      return {
        campana,
        cria: filaCria ? cria : null,
        repo,
        ind: calcularIndicadores(cria, repo ?? REPO_VACIA),
        bloqueado: bloqueadas.has(`${e.id}:${campana}`),
      };
    });

    // Un solo objetivo por (sistema, indicador): si hay más de una campaña cargada, gana la más reciente.
    const objetivosOrdenados = [...objetivosEst].sort((a, b) => a.campana - b.campana);
    const objetivosPlano: Record<string, number> = {};
    for (const o of objetivosOrdenados) {
      objetivosPlano[`${o.sistema}:${o.indicador}`] = Number(o.valor);
    }

    out.push({ id: e.id, nombre: e.nombre, registros, objetivos: objetivosPlano });
  }

  return out;
});

export type ImportacionResumen = {
  id: string;
  archivo: string;
  fecha: string;
  filasOk: number;
  alertas: number;
};

export const obtenerHistorialImportaciones = cache(
  async (limite = 8): Promise<ImportacionResumen[]> => {
    const supabase = await crearClienteServidor();
    const { data } = await supabase
      .from('importacion')
      .select('id, archivo, fecha, filas_ok, alertas')
      .order('fecha', { ascending: false })
      .limit(limite);

    return (data ?? []).map((r) => ({
      id: r.id as string,
      archivo: r.archivo as string,
      fecha: r.fecha as string,
      filasOk: r.filas_ok as number,
      alertas: r.alertas as number,
    }));
  }
);
