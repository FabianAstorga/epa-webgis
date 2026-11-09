import type {
  ComparisonSelection,
  GeneratedReport,
  Incident,
  ReportMeta,
  SessionUser,
} from '@/types';
import { http, sleep, USE_MOCK } from './http';

export interface CreateReportInput {
  meta: ReportMeta;
  incidents: Incident[];
  comparison: ComparisonSelection | null;
  includeComparison: boolean;
  user: SessionUser;
}

/**
 * Contrato previsto:
 *   POST /api/v1/reportes
 *   { meta, incidentIds, comparison, includeComparison }
 *   -> 201 { id, numero, createdAt, fileName, ... }
 *
 * En el prototipo se simula la compilación y se devuelve la metadata del PDF.
 * La descarga real se hará contra /api/v1/reportes/{id}/pdf (QuestPDF).
 */
export const reportsService = {
  async createReport(input: CreateReportInput): Promise<GeneratedReport> {
    if (USE_MOCK) {
      await sleep(1100);
      const now = new Date();
      const counter = Number(localStorage.getItem('epa_report_counter') ?? '0') + 1;
      localStorage.setItem('epa_report_counter', String(counter));
      const numero = `INF-EPA-2026-${String(counter).padStart(3, '0')}`;
      const sector = input.meta.sectorId
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      return {
        id: `rep-${now.getTime()}`,
        numero,
        createdAt: now.toISOString(),
        totalIncidencias: input.incidents.length,
        sector,
        fileName: `${numero}_${sector.replaceAll(' ', '_')}.pdf`,
        sizeKb: 780 + input.incidents.length * 96 + (input.includeComparison ? 240 : 0),
      };
    }

    return http.post<GeneratedReport>('/api/v1/reportes', {
      meta: input.meta,
      incidentIds: input.incidents.map((incident) => incident.id),
      comparison: input.comparison,
      includeComparison: input.includeComparison,
    });
  },
};
