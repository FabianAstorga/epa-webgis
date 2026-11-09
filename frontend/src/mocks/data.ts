import type {
  Capture,
  Flight,
  Incident,
  Sector,
} from '@/types';

/**
 * Datos simulados del prototipo.
 * Cuando el backend ASP.NET Core esté disponible, estos arreglos se reemplazan
 * por las respuestas de /api/v1/sectores, /api/v1/vuelos, /api/v1/fotografias
 * e /api/v1/incidencias (ver src/services).
 */

export const SECTORS: Sector[] = [
  {
    id: 'patio-norte',
    nombre: 'Patio Norte',
    descripcion: 'Acopio de contenedores y zona de maniobra de camiones.',
    superficie: '18,4 ha',
    color: '#2563eb',
  },
  {
    id: 'patio-sur',
    nombre: 'Patio Sur',
    descripcion: 'Patio de contenedores, conexión ferroviaria y bodegas.',
    superficie: '14,8 ha',
    color: '#0f766e',
  },
  {
    id: 'muelle-1',
    nombre: 'Muelle 1',
    descripcion: 'Frente de atraque, grúas pórtico y explanada operativa.',
    superficie: '9,2 ha',
    color: '#b45309',
  },
  {
    id: 'acceso-vial',
    nombre: 'Acceso Vial',
    descripcion: 'Garitas, rotonda de ingreso y vías de circulación pesada.',
    superficie: '6,1 ha',
    color: '#7c3aed',
  },
  {
    id: 'zeap-c',
    nombre: 'ZEAP Sector C',
    descripcion: 'Zona de extensión, bermas de espera y patios de grava.',
    superficie: '22,6 ha',
    color: '#be123c',
  },
];

export const FLIGHTS: Flight[] = [
  {
    id: 'fl-20260614',
    codigo: 'VUELO-ZEAP-20260614',
    sectorId: 'patio-norte',
    fecha: '2026-06-14',
    hora: '10:42',
    operador: 'Fabián Astorga Castillo',
    dron: 'DJI Mavic 3 Multispectral',
    fotos: 148,
  },
  {
    id: 'fl-20260914',
    codigo: 'VUELO-ZEAP-20260914',
    sectorId: 'patio-norte',
    fecha: '2026-09-14',
    hora: '10:37',
    operador: 'Fabián Astorga Castillo',
    dron: 'DJI Mavic 3 Multispectral',
    fotos: 162,
  },
];

interface CaptureSeed {
  id: string;
  sectorId: Capture['sectorId'];
  fecha: string;
  hora: string;
  altitud: number;
  gimbal: number;
  lat: number;
  lng: number;
  letter: 'a' | 'b';
}

const CAPTURE_SEEDS: CaptureSeed[] = [
  // Patio Norte
  { id: 'cap-pn-a', sectorId: 'patio-norte', fecha: '2026-06-14', hora: '10:42:18', altitud: 78.4, gimbal: -90, lat: -18.47482, lng: -70.31162, letter: 'a' },
  { id: 'cap-pn-b', sectorId: 'patio-norte', fecha: '2026-09-14', hora: '10:37:54', altitud: 76.1, gimbal: -90, lat: -18.47479, lng: -70.31158, letter: 'b' },
  // Patio Sur
  { id: 'cap-ps-a', sectorId: 'patio-sur', fecha: '2026-06-14', hora: '11:05:42', altitud: 82.7, gimbal: -90, lat: -18.47836, lng: -70.30951, letter: 'a' },
  { id: 'cap-ps-b', sectorId: 'patio-sur', fecha: '2026-09-14', hora: '11:02:09', altitud: 81.3, gimbal: -88, lat: -18.47833, lng: -70.30947, letter: 'b' },
  // Muelle 1
  { id: 'cap-m1-a', sectorId: 'muelle-1', fecha: '2026-06-14', hora: '09:58:03', altitud: 94.2, gimbal: -90, lat: -18.47251, lng: -70.31721, letter: 'a' },
  { id: 'cap-m1-b', sectorId: 'muelle-1', fecha: '2026-09-14', hora: '09:55:37', altitud: 92.8, gimbal: -90, lat: -18.47248, lng: -70.31717, letter: 'b' },
  // Acceso Vial
  { id: 'cap-av-a', sectorId: 'acceso-vial', fecha: '2026-06-14', hora: '12:14:26', altitud: 71.6, gimbal: -87, lat: -18.48103, lng: -70.30584, letter: 'a' },
  { id: 'cap-av-b', sectorId: 'acceso-vial', fecha: '2026-09-14', hora: '12:11:49', altitud: 73.2, gimbal: -88, lat: -18.48101, lng: -70.30579, letter: 'b' },
  // ZEAP Sector C
  { id: 'cap-zc-a', sectorId: 'zeap-c', fecha: '2026-06-14', hora: '10:22:11', altitud: 88.9, gimbal: -90, lat: -18.48741, lng: -70.29812, letter: 'a' },
  { id: 'cap-zc-b', sectorId: 'zeap-c', fecha: '2026-09-14', hora: '10:19:33', altitud: 87.5, gimbal: -90, lat: -18.48738, lng: -70.29808, letter: 'b' },
];

export const CAPTURES: Capture[] = CAPTURE_SEEDS.map((seed) => ({
  id: seed.id,
  sectorId: seed.sectorId,
  fecha: seed.fecha,
  hora: seed.hora,
  altitud: seed.altitud,
  gimbal: seed.gimbal,
  lat: seed.lat,
  lng: seed.lng,
  archivo: `DJI_${seed.fecha.replaceAll('-', '')}_${seed.hora.replaceAll(':', '').slice(0, 6)}_${seed.letter.toUpperCase()}.JPG`,
  src: `/mock/aerial-${seed.sectorId}-${seed.letter}.svg`,
  vuelo: seed.fecha === '2026-06-14' ? 'VUELO-ZEAP-20260614' : 'VUELO-ZEAP-20260914',
  operador: 'Fabián Astorga Castillo',
}));

export const INCIDENTS: Incident[] = [
  {
    id: 'inc-014',
    codigo: 'INC-2026-014',
    sectorId: 'patio-norte',
    categoria: 'Congestión',
    descripcion:
      'Fila de camiones ocupa la berma norte del patio y reduce el carril de maniobra frente al portón 2.',
    estado: 'Pendiente',
    severidad: 'Alta',
    fecha: '2026-09-14',
    lat: -18.47491,
    lng: -70.31144,
    evidencia: '/mock/aerial-patio-norte-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-015',
    codigo: 'INC-2026-015',
    sectorId: 'acceso-vial',
    categoria: 'Daño de pavimento',
    descripcion:
      'Fisura longitudinal con hundimiento leve en la curva de ingreso a la garita A1. Se solicita inspección estructural.',
    estado: 'En Gestión',
    severidad: 'Alta',
    fecha: '2026-09-14',
    lat: -18.48095,
    lng: -70.30571,
    evidencia: '/mock/aerial-acceso-vial-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-016',
    codigo: 'INC-2026-016',
    sectorId: 'zeap-c',
    categoria: 'Residuos',
    descripcion:
      'Acumulación de pallets y residuos de embalaje junto al muro perimetral del sector C.',
    estado: 'Pendiente',
    severidad: 'Media',
    fecha: '2026-09-14',
    lat: -18.48752,
    lng: -70.29824,
    evidencia: '/mock/aerial-zeap-c-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-017',
    codigo: 'INC-2026-017',
    sectorId: 'muelle-1',
    categoria: 'Luminaria',
    descripcion:
      'Luminaria del sector de grúas 2 y 3 sin funcionamiento durante la inspección nocturna.',
    estado: 'Resuelto',
    severidad: 'Media',
    fecha: '2026-09-10',
    lat: -18.47246,
    lng: -70.31734,
    evidencia: '/mock/aerial-muelle-1-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-018',
    codigo: 'INC-2026-018',
    sectorId: 'patio-sur',
    categoria: 'Congestión',
    descripcion:
      'Camiones en espera ocupan la vía ferroviaria de servicio, impidiendo el paso del personal de mantenimiento.',
    estado: 'En Gestión',
    severidad: 'Alta',
    fecha: '2026-09-14',
    lat: -18.47845,
    lng: -70.30962,
    evidencia: '/mock/aerial-patio-sur-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-019',
    codigo: 'INC-2026-019',
    sectorId: 'patio-norte',
    categoria: 'Daño de pavimento',
    descripcion:
      'Baches en la calzada interior entre los bloques C y D. Riesgo para montacargas y vehículos livianos.',
    estado: 'Pendiente',
    severidad: 'Media',
    fecha: '2026-09-14',
    lat: -18.47474,
    lng: -70.31187,
    evidencia: '/mock/aerial-patio-norte-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-020',
    codigo: 'INC-2026-020',
    sectorId: 'acceso-vial',
    categoria: 'Luminaria',
    descripcion:
      'Poste de iluminación inclinado en la rotonda de acceso; no cubre el carril de salida de camiones.',
    estado: 'Pendiente',
    severidad: 'Baja',
    fecha: '2026-09-14',
    lat: -18.48112,
    lng: -70.30554,
    evidencia: '/mock/aerial-acceso-vial-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-021',
    codigo: 'INC-2026-021',
    sectorId: 'patio-sur',
    categoria: 'Residuos',
    descripcion:
      'Restos de carga y plásticos dispersos en el borde del patio de contenedores.',
    estado: 'Resuelto',
    severidad: 'Baja',
    fecha: '2026-09-12',
    lat: -18.47828,
    lng: -70.30933,
    evidencia: '/mock/aerial-patio-sur-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-022',
    codigo: 'INC-2026-022',
    sectorId: 'muelle-1',
    categoria: 'Otro',
    descripcion:
      'Mancha de aceite sobre la explanada de atraque, próxima a la zona de circulación de grúas.',
    estado: 'Pendiente',
    severidad: 'Alta',
    fecha: '2026-09-14',
    lat: -18.47266,
    lng: -70.31701,
    evidencia: '/mock/aerial-muelle-1-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-023',
    codigo: 'INC-2026-023',
    sectorId: 'zeap-c',
    categoria: 'Congestión',
    descripcion:
      'Ocupación de berma por camiones sin guía de patio; se observa aumento sostenido respecto de junio.',
    estado: 'En Gestión',
    severidad: 'Media',
    fecha: '2026-09-14',
    lat: -18.48729,
    lng: -70.29794,
    evidencia: '/mock/aerial-zeap-c-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
  {
    id: 'inc-024',
    codigo: 'INC-2026-024',
    sectorId: 'patio-norte',
    categoria: 'Luminaria',
    descripcion:
      'Luminaria intermitente en el acceso al bloque F; se verificó funcionamiento normal tras mantención.',
    estado: 'Resuelto',
    severidad: 'Baja',
    fecha: '2026-09-08',
    lat: -18.47461,
    lng: -70.31152,
    evidencia: '/mock/aerial-patio-norte-b.svg',
    reportadoPor: 'Fabián Astorga Castillo',
  },
];

export const getSector = (id: string) => SECTORS.find((s) => s.id === id);
export const getCapture = (id: string) => CAPTURES.find((c) => c.id === id);
export const getCapturesBySector = (sectorId: string) =>
  CAPTURES.filter((c) => c.sectorId === sectorId);
export const getIncidentsBySector = (sectorId: string) =>
  INCIDENTS.filter((i) => i.sectorId === sectorId);
