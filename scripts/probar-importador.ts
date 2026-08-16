import * as XLSX from 'xlsx';
import { leerHoja } from '../src/lib/planilla';
import { validarHoja } from '../src/lib/validacion';

const ruta = process.argv[2];
if (!ruta) throw new Error('Uso: tsx probar-importador.ts <ruta-al-xlsx>');

const wb = XLSX.readFile(ruta);
let totalFilas = 0;
let totalErr = 0;
let totalWarn = 0;
const problemas: string[] = [];
let casoMarilauquen: string | null = null;

for (const nombre of wb.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, defval: null, blankrows: true }) as (
    | string
    | number
    | null
  )[][];
  const leida = leerHoja(nombre, rows);
  if (!leida.ok) {
    problemas.push(`${nombre}: ${leida.error}`);
    continue;
  }
  const filas = validarHoja(leida.hoja.cria, leida.hoja.repo);
  totalFilas += filas.length;
  for (const f of filas) {
    for (const a of f.alertas) {
      if (a.severidad === 'err') totalErr++;
      else totalWarn++;
      if (nombre === 'Marilauquen' && f.campana === 2020 && a.regla === 'REPO-04') {
        casoMarilauquen = a.detalle;
      }
    }
    // NaN/Infinity check en los indicadores calculados
    const valores = [
      ...(f.cria ? Object.values(f.cria) : []),
    ];
    for (const v of valores) {
      if (typeof v === 'number' && (Number.isNaN(v) || !Number.isFinite(v))) {
        console.error(`  !! valor no finito en ${nombre} ${f.campana}`);
      }
    }
  }
}

console.log('Hojas leídas:', wb.SheetNames.length);
console.log('Problemas de forma:', problemas.length, problemas);
console.log('Filas campo-campaña:', totalFilas);
console.log('Errores (err):', totalErr);
console.log('Avisos (warn):', totalWarn);
console.log('Caso conocido Marilauquen 2020 REPO-04:', casoMarilauquen ?? 'NO DETECTADO (FALLA)');
