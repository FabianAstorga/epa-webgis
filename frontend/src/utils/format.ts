import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const MONTHS_SHORT = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Evita el desfase de un día al interpretar fechas ISO sin hora. */
export const parseISODate = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

export const formatDateShort = (iso: string): string => {
  if (!iso) return '—';
  const date = parseISODate(iso.slice(0, 10));
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatDateLong = (iso: string): string => {
  if (!iso) return '—';
  const date = parseISODate(iso.slice(0, 10));
  return `${date.getDate()} de ${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}`;
};

export const formatDateTime = (iso: string): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatCoords = (lat: number, lng: number): string =>
  `${Math.abs(lat).toFixed(5)}° S · ${Math.abs(lng).toFixed(5)}° O`;

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('es-CL').format(value);

export const roleLabel = (role?: string | null): string => {
  if (role === 'Directivo') return 'Jefatura';
  if (role === 'Operador') return 'Operador';
  return 'Sin rol';
};

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const todayISO = (): string => new Date().toISOString().slice(0, 10);
