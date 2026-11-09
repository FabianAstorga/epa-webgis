import type { Capture, Flight, Incident, Sector } from '@/types';
import { CAPTURES, FLIGHTS, INCIDENTS, SECTORS } from '@/mocks/data';
import { http, sleep, USE_MOCK } from './http';

/**
 * Contrato previsto con ASP.NET Core (PostgreSQL/PostGIS):
 *   GET /api/v1/sectores
 *   GET /api/v1/vuelos?sectorId=
 *   GET /api/v1/fotografias?sectorId=
 *   GET /api/v1/incidencias?sectorId=
 *
 * Los endpoints devolverán el mismo shape que los tipos de src/types.
 */
export const flightsService = {
  async getSectors(): Promise<Sector[]> {
    if (USE_MOCK) {
      await sleep(200);
      return SECTORS;
    }
    return http.get<Sector[]>('/api/v1/sectores');
  },

  async getFlights(sectorId?: string): Promise<Flight[]> {
    if (USE_MOCK) {
      await sleep(200);
      return sectorId ? FLIGHTS.filter((f) => f.sectorId === sectorId) : FLIGHTS;
    }
    const query = sectorId ? `?sectorId=${encodeURIComponent(sectorId)}` : '';
    return http.get<Flight[]>(`/api/v1/vuelos${query}`);
  },

  async getCaptures(sectorId?: string): Promise<Capture[]> {
    if (USE_MOCK) {
      await sleep(280);
      return sectorId
        ? CAPTURES.filter((c) => c.sectorId === sectorId)
        : CAPTURES;
    }
    const query = sectorId ? `?sectorId=${encodeURIComponent(sectorId)}` : '';
    return http.get<Capture[]>(`/api/v1/fotografias${query}`);
  },

  async getIncidents(sectorId?: string): Promise<Incident[]> {
    if (USE_MOCK) {
      await sleep(320);
      return sectorId
        ? INCIDENTS.filter((i) => i.sectorId === sectorId)
        : INCIDENTS;
    }
    const query = sectorId ? `?sectorId=${encodeURIComponent(sectorId)}` : '';
    return http.get<Incident[]>(`/api/v1/incidencias${query}`);
  },
};
