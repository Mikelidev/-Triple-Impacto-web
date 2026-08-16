import { NextResponse } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/server';
import { validarHoja } from '@/lib/validacion';
import type { ImportarPayload, ImportarResumen } from '@/lib/importar-tipos';
import type { CriaEntrada, ReposicionEntrada } from '@/lib/indicadores';

function criaARow(e: CriaEntrada) {
  return {
    sup_total: e.supTotal,
    peso_vaca: e.pesoVaca,
    tactadas: e.tactadas,
    prenadas: e.prenadas,
    vend_vacias: e.vendVacias,
    vend_prenadas: e.vendPrenadas,
    mermas: e.mermas,
    nacidos: e.nacidos,
    destetados: e.destetados,
    peso_destete: e.pesoDestete,
  };
}

function repoARow(e: ReposicionEntrada) {
  return {
    peso_vq_servicio: e.pesoVqServicio,
    terneras_recriadas: e.ternerasRecriadas,
    peso_destete_ternera: e.pesoDesteteTernera,
    peso_15m: e.peso15m,
    sup_recria: e.supRecria,
    aptas: e.aptas,
    tactadas: e.tactadas,
    prenadas: e.prenadas,
    vend_no_aptas: e.vendNoAptas,
    vend_prenadas: e.vendPrenadas,
    sup_paricion: e.supParicion,
    nacidos: e.nacidos,
    destetados: e.destetados,
    peso_destete: e.pesoDestete,
  };
}

export async function POST(request: Request) {
  const supabase = await crearClienteServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const payload = (await request.json()) as ImportarPayload;
  if (!payload?.hojas?.length) {
    return NextResponse.json({ error: 'La planilla no tiene hojas para importar.' }, { status: 400 });
  }

  const { data: importacion, error: errorImportacion } = await supabase
    .from('importacion')
    .insert({ archivo: payload.archivo, hash: payload.hash })
    .select('id')
    .single();

  if (errorImportacion || !importacion) {
    return NextResponse.json({ error: `No se pudo registrar la importación: ${errorImportacion?.message}` }, { status: 500 });
  }

  let totalFilas = 0;
  let totalErrores = 0;
  let totalAvisos = 0;

  for (const hoja of payload.hojas) {
    const { data: establecimiento, error: errorEstab } = await supabase
      .from('establecimiento')
      .upsert({ nombre: hoja.nombre, hoja_origen: hoja.nombre }, { onConflict: 'nombre' })
      .select('id')
      .single();

    if (errorEstab || !establecimiento) {
      return NextResponse.json(
        { error: `No se pudo guardar el establecimiento «${hoja.nombre}»: ${errorEstab?.message}` },
        { status: 500 }
      );
    }
    const establecimientoId = establecimiento.id as string;

    if (hoja.cria.length) {
      const filas = hoja.cria.map((f) => ({
        establecimiento_id: establecimientoId,
        campana: f.campana,
        importacion_id: importacion.id,
        ...criaARow(f.entrada),
      }));
      const { error } = await supabase.from('cria_registro').upsert(filas, { onConflict: 'establecimiento_id,campana' });
      if (error) return NextResponse.json({ error: `Error guardando cría de «${hoja.nombre}»: ${error.message}` }, { status: 500 });
    }

    if (hoja.repo.length) {
      const filas = hoja.repo.map((f) => ({
        establecimiento_id: establecimientoId,
        campana: f.campana,
        importacion_id: importacion.id,
        ...repoARow(f.entrada),
      }));
      const { error } = await supabase
        .from('reposicion_registro')
        .upsert(filas, { onConflict: 'establecimiento_id,campana' });
      if (error) return NextResponse.json({ error: `Error guardando reposición de «${hoja.nombre}»: ${error.message}` }, { status: 500 });
    }

    // La planilla trae un único objetivo sin año: se asigna a la campaña más reciente de la hoja (§5).
    const campanaMasReciente = Math.max(
      ...hoja.cria.map((f) => f.campana),
      ...hoja.repo.map((f) => f.campana)
    );
    if (Number.isFinite(campanaMasReciente)) {
      const filasObjetivo = [
        ...Object.entries(hoja.objetivosCria).map(([indicador, valor]) => ({
          establecimiento_id: establecimientoId,
          campana: campanaMasReciente,
          sistema: 'cria',
          indicador,
          valor,
        })),
        ...Object.entries(hoja.objetivosRepo).map(([indicador, valor]) => ({
          establecimiento_id: establecimientoId,
          campana: campanaMasReciente,
          sistema: 'reposicion',
          indicador,
          valor,
        })),
      ];
      if (filasObjetivo.length) {
        const { error } = await supabase
          .from('objetivo')
          .upsert(filasObjetivo, { onConflict: 'establecimiento_id,campana,sistema,indicador' });
        if (error) return NextResponse.json({ error: `Error guardando objetivos de «${hoja.nombre}»: ${error.message}` }, { status: 500 });
      }
    }

    // Revalidar server-side (nunca confiar en el cálculo del cliente) y refrescar las alertas de este establecimiento.
    const filasValidadas = validarHoja(hoja.cria, hoja.repo);
    totalFilas += filasValidadas.length;

    await supabase.from('alerta').delete().eq('establecimiento_id', establecimientoId);

    const nuevasAlertas = filasValidadas.flatMap((f) =>
      f.alertas.map((a) => ({
        importacion_id: importacion.id,
        establecimiento_id: establecimientoId,
        hoja_origen: hoja.nombre,
        campana: a.campana,
        regla: a.regla,
        severidad: a.severidad,
        sistema: a.sistema,
        mensaje: a.mensaje,
        detalle: a.detalle,
      }))
    );
    totalErrores += nuevasAlertas.filter((a) => a.severidad === 'err').length;
    totalAvisos += nuevasAlertas.filter((a) => a.severidad === 'warn').length;

    if (nuevasAlertas.length) {
      const { error } = await supabase.from('alerta').insert(nuevasAlertas);
      if (error) return NextResponse.json({ error: `Error guardando alertas de «${hoja.nombre}»: ${error.message}` }, { status: 500 });
    }
  }

  await supabase
    .from('importacion')
    .update({ filas_ok: totalFilas, alertas: totalErrores + totalAvisos })
    .eq('id', importacion.id);

  const resumen: ImportarResumen = {
    importacionId: importacion.id,
    establecimientos: payload.hojas.length,
    filas: totalFilas,
    errores: totalErrores,
    avisos: totalAvisos,
  };
  return NextResponse.json(resumen);
}
