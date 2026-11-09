import type {
  ComparisonSelection,
  GeneratedReport,
  ReportDraft,
  ReportMeta,
  SessionUser,
} from '@/types';

export const COMPARISON_KEY = 'epa_comparison_selection';
export const REPORT_DRAFT_KEY = 'epa_report_draft';
export const REPORT_HISTORY_KEY = 'epa_reports_history';

const readJSON = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // El almacenamiento puede estar lleno o deshabilitado.
  }
};

export const saveComparisonSelection = (selection: ComparisonSelection) =>
  writeJSON(COMPARISON_KEY, selection);

export const loadComparisonSelection = () =>
  readJSON<ComparisonSelection>(COMPARISON_KEY);

export const saveReportDraft = (draft: ReportDraft) =>
  writeJSON(REPORT_DRAFT_KEY, draft);

export const loadReportDraft = () => readJSON<ReportDraft>(REPORT_DRAFT_KEY);

export const clearReportDraft = () => localStorage.removeItem(REPORT_DRAFT_KEY);

export const getReportHistory = () =>
  readJSON<GeneratedReport[]>(REPORT_HISTORY_KEY) ?? [];

export const addReportToHistory = (report: GeneratedReport) => {
  const history = getReportHistory();
  writeJSON(REPORT_HISTORY_KEY, [report, ...history].slice(0, 12));
};

export const buildDefaultReportMeta = (user: SessionUser): ReportMeta => ({
  titulo: 'Informe de inspección — Patio Norte',
  tipo: 'Inspección periódica',
  sectorId: 'patio-norte',
  fechaDesde: '2026-09-01',
  fechaHasta: '2026-09-30',
  destinatario: 'Jorge Bernal Navarrete — Encargado de TI y Ciberseguridad',
  elaboradoPor: user.nombre,
  observaciones:
    'Se recomienda priorizar la revisión de los puntos con severidad alta y coordinar con las áreas operativas la limpieza y el despeje de las zonas afectadas.',
});
