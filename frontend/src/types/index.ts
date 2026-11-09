/** Tipos compartidos por los tres artefactos de interfaz. */

export type Role = 'Operador' | 'Directivo';

export interface SessionUser {
  id: number;
  nombre: string;
  email: string;
  rol: Role;
  unidad: string;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
}

export type SectorId =
  | 'patio-norte'
  | 'patio-sur'
  | 'muelle-1'
  | 'acceso-vial'
  | 'zeap-c';

export interface Sector {
  id: SectorId;
  nombre: string;
  descripcion: string;
  superficie: string;
  color: string;
}

export interface Flight {
  id: string;
  codigo: string;
  sectorId: SectorId;
  fecha: string;
  hora: string;
  operador: string;
  dron: string;
  fotos: number;
}

export interface Capture {
  id: string;
  sectorId: SectorId;
  fecha: string;
  hora: string;
  altitud: number;
  gimbal: number;
  lat: number;
  lng: number;
  archivo: string;
  src: string;
  vuelo: string;
  operador: string;
}

export type IncidentCategory =
  | 'Congestión'
  | 'Daño de pavimento'
  | 'Residuos'
  | 'Luminaria'
  | 'Otro';

export type IncidentStatus = 'Pendiente' | 'En Gestión' | 'Resuelto';

export type Severity = 'Alta' | 'Media' | 'Baja';

export interface Incident {
  id: string;
  codigo: string;
  sectorId: SectorId;
  categoria: IncidentCategory;
  descripcion: string;
  estado: IncidentStatus;
  severidad: Severity;
  fecha: string;
  lat: number;
  lng: number;
  evidencia: string;
  reportadoPor: string;
}

export type ReportType =
  | 'Inspección periódica'
  | 'Consolidado mensual'
  | 'Reporte de incidencia crítica';

export interface ReportMeta {
  titulo: string;
  tipo: ReportType;
  sectorId: SectorId;
  fechaDesde: string;
  fechaHasta: string;
  destinatario: string;
  elaboradoPor: string;
  observaciones: string;
}

export interface ReportDraft {
  meta: ReportMeta;
  incidentIds: string[];
  includeComparison: boolean;
  comparison: ComparisonSelection | null;
  savedAt?: string;
}

export interface ComparisonSelection {
  sectorId: SectorId;
  captureAId: string;
  captureBId: string;
  captureADate?: string;
  captureBDate?: string;
}

export interface GeneratedReport {
  id: string;
  numero: string;
  createdAt: string;
  totalIncidencias: number;
  sector: string;
  fileName: string;
  sizeKb: number;
}

export type ReportStage =
  | 'idle'
  | 'compiling-map'
  | 'attaching-evidence'
  | 'rendering-tables'
  | 'generating-pdf'
  | 'done';
