import type { Capture, ComparisonSelection, Incident, ReportMeta } from '@/types';
import { Brand } from '@/components/Brand';
import { CAPTURES, getSector } from '@/mocks/data';
import { formatDateShort, formatDateTime } from '@/utils/format';

const STATUS_COLOR: Record<Incident['estado'], string> = {
  Pendiente: '#dc2626',
  'En Gestión': '#d97706',
  Resuelto: '#059669',
};

const PIN_POSITIONS = [
  { x: 26, y: 58 },
  { x: 48, y: 34 },
  { x: 63, y: 63 },
  { x: 76, y: 40 },
  { x: 40, y: 74 },
  { x: 70, y: 22 },
];

const SectionTitle = ({ number, title }: { number: string; title: string }) => (
  <div className="mb-[3mm] flex items-center gap-2 border-b border-slate-200 pb-[1.5mm]">
    <span className="grid h-[6mm] w-[6mm] place-items-center bg-[#002855] text-[8px] font-black text-white">
      {number}
    </span>
    <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#002855]">
      {title}
    </h2>
  </div>
);

interface ReportPreviewProps {
  meta: ReportMeta;
  incidents: Incident[];
  comparison: ComparisonSelection | null;
  includeComparison: boolean;
  reportNumber: string;
}

export const ReportPreview = ({
  meta,
  incidents,
  comparison,
  includeComparison,
  reportNumber,
}: ReportPreviewProps) => {
  const sector = getSector(meta.sectorId);
  const comparisonSector = comparison?.sectorId ?? meta.sectorId;
  const comparisonCaptures = CAPTURES.filter(
    (capture) => capture.sectorId === comparisonSector,
  );

  const baseA = comparison
    ? CAPTURES.find((capture) => capture.id === comparison.captureAId) ??
      comparisonCaptures[0]
    : comparisonCaptures[0];
  const baseB = comparison
    ? CAPTURES.find((capture) => capture.id === comparison.captureBId) ??
      comparisonCaptures[1] ??
      comparisonCaptures[0]
    : comparisonCaptures[1] ?? comparisonCaptures[0];

  const captureA = baseA
    ? { ...baseA, fecha: comparison?.captureADate ?? baseA.fecha }
    : undefined;
  const captureB = baseB
    ? { ...baseB, fecha: comparison?.captureBDate ?? baseB.fecha }
    : undefined;

  const showComparison = includeComparison && Boolean(captureA && captureB);
  const evidence = (captureB ?? captureA) as Capture;

  const counts = {
    total: incidents.length,
    pendientes: incidents.filter((i) => i.estado === 'Pendiente').length,
    gestion: incidents.filter((i) => i.estado === 'En Gestión').length,
    resueltos: incidents.filter((i) => i.estado === 'Resuelto').length,
    alta: incidents.filter((i) => i.severidad === 'Alta').length,
  };

  const section = (base: number) =>
    String(showComparison ? base : base - 1).padStart(2, '0');

  return (
    <article
      id="report-print-area"
      className="print-exact mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white text-slate-800 shadow-2xl"
    >
      {/* Membrete */}
      <header className="bg-[#001a35] px-[11mm] py-[7mm] text-white">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <Brand tone="light" size="sm" showSubtitle={false} />
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="text-[6.5px] font-black uppercase tracking-[0.28em] text-blue-300">
                Empresa Portuaria Arica
              </p>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-tight text-white">
                Gerencia de TI y Ciberseguridad
              </p>
              <p className="mt-0.5 text-[6px] font-medium uppercase tracking-[0.18em] text-white/45">
                Monitoreo e inspección geoespacial · WebGIS
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[6px] font-black uppercase tracking-[0.24em] text-blue-300">
              Informe ejecutivo
            </p>
            <p className="mt-1 font-mono text-[10px] font-bold text-white">
              {reportNumber}
            </p>
            <p className="mt-1 text-[6px] text-white/45">
              Emitido: {formatDateTime(new Date().toISOString())}
            </p>
          </div>
        </div>
      </header>

      <div className="px-[11mm] py-[8mm]">
        {/* Título */}
        <div className="border-b-4 border-[#002855] pb-[4mm]">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="bg-blue-600 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest text-white">
              {meta.tipo}
            </span>
            <span className="border border-slate-200 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest text-slate-500">
              {sector?.nombre}
            </span>
            <span className="border border-slate-200 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest text-slate-500">
              {formatDateShort(meta.fechaDesde)} — {formatDateShort(meta.fechaHasta)}
            </span>
          </div>
          <h1 className="text-balance text-[20px] font-black uppercase leading-[1.02] tracking-tighter text-[#002855]">
            {meta.titulo}
          </h1>
          <p className="mt-2 max-w-[150mm] text-[7.5px] font-medium leading-relaxed text-slate-500">
            Documento consolidado de hallazgos georreferenciados y evidencia
            fotográfica para la supervisión de la infraestructura portuaria.
          </p>
        </div>

        {/* Ficha */}
        <div className="mt-[4mm] grid grid-cols-4 gap-px border border-slate-200 bg-slate-200">
          {[
            { label: 'Sector inspeccionado', value: sector?.nombre ?? '—' },
            { label: 'Superficie', value: sector?.superficie ?? '—' },
            { label: 'Elaborado por', value: meta.elaboradoPor },
            { label: 'Destinatario', value: meta.destinatario },
          ].map((item) => (
            <div key={item.label} className="bg-white px-2 py-2">
              <p className="text-[5.5px] font-black uppercase tracking-[0.16em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 text-[6.5px] font-bold leading-snug text-[#002855]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* 1. Resumen */}
        <section className="mt-[6mm] break-inside-avoid">
          <SectionTitle number="01" title="Resumen ejecutivo" />
          <p className="text-[7.5px] font-medium leading-[1.75] text-slate-600">
            El presente informe consolida <strong>{counts.total} hallazgos</strong>{' '}
            detectados en <strong>{sector?.nombre}</strong> durante el período
            comprendido entre el {formatDateShort(meta.fechaDesde)} y el{' '}
            {formatDateShort(meta.fechaHasta)}. Del total, {counts.pendientes} se
            encuentran en estado Pendiente, {counts.gestion} en Gestión y{' '}
            {counts.resueltos} resueltos. Se identificaron{' '}
            <strong>{counts.alta} incidencias de severidad alta</strong> que requieren
            coordinación con las áreas operativas y el concesionario.
          </p>

          {counts.alta > 0 && (
            <div className="mt-[3mm] border-l-[3px] border-red-500 bg-red-50 px-3 py-2">
              <p className="text-[6.5px] font-black uppercase tracking-[0.14em] text-red-700">
                Atención prioritaria
              </p>
              <p className="mt-1 text-[7px] font-medium leading-relaxed text-red-700/80">
                Existen {counts.alta} hallazgos de severidad alta. Se recomienda
                verificar su estado en terreno antes del cierre del período y dejar
                registro fotográfico de la intervención.
              </p>
            </div>
          )}
        </section>

        {/* 2. Indicadores */}
        <section className="mt-[6mm] break-inside-avoid">
          <SectionTitle number="02" title="Indicadores del período" />
          <div className="grid grid-cols-5 gap-px border border-slate-200 bg-slate-200">
            {[
              { label: 'Total', value: counts.total, color: '#002855' },
              { label: 'Pendientes', value: counts.pendientes, color: '#dc2626' },
              { label: 'En Gestión', value: counts.gestion, color: '#d97706' },
              { label: 'Resueltos', value: counts.resueltos, color: '#059669' },
              { label: 'Severidad alta', value: counts.alta, color: '#7c3aed' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white px-2 py-2 text-center">
                <p
                  className="text-[16px] font-black leading-none tracking-tighter"
                  style={{ color: kpi.color }}
                >
                  {String(kpi.value).padStart(2, '0')}
                </p>
                <p className="mt-1 text-[5.5px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {kpi.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Comparación temporal */}
        {showComparison && (
          <section className="mt-[6mm] break-inside-avoid">
            <SectionTitle number="03" title="Comparación temporal de capturas" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { capture: captureA!, label: 'A', tone: 'bg-blue-600' },
                { capture: captureB!, label: 'B', tone: 'bg-[#d4a824]' },
              ].map(({ capture, label, tone }) => (
                <figure key={label} className="border border-slate-200 bg-slate-50">
                  <div className="relative h-[46mm] overflow-hidden">
                    <img
                      src={capture.src}
                      alt={`Captura ${label}`}
                      className="h-full w-full object-cover"
                    />
                    <span
                      className={`absolute left-1.5 top-1.5 grid h-4 w-4 place-items-center text-[6px] font-black text-white ${tone}`}
                    >
                      {label}
                    </span>
                  </div>
                  <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-[6px] font-black uppercase tracking-widest text-slate-500">
                      {formatDateShort(capture.fecha)} · {capture.hora}
                    </span>
                    <span className="font-mono text-[5.5px] text-slate-400">
                      {capture.altitud.toFixed(1)} m
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-2 text-[6.5px] font-medium leading-relaxed text-slate-500">
              El contraste visual evidencia cambios en la ocupación de bermas,
              condición del pavimento y presencia de residuos. La evaluación se
              realizó sobre capturas del mismo sector y encuadre.
            </p>
          </section>
        )}

        {/* Cartografía */}
        <section className="mt-[6mm] break-inside-avoid">
          <SectionTitle
            number={section(4)}
            title="Cartografía de hallazgos"
          />
          <div className="relative h-[56mm] overflow-hidden border border-slate-200 bg-slate-100">
            <img
              src={evidence.src}
              alt={`Cartografía de ${sector?.nombre}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[#001a35]/10" />

            {incidents.slice(0, 6).map((incident, index) => {
              const position = PIN_POSITIONS[index % PIN_POSITIONS.length];
              return (
                <div
                  key={incident.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                  <span
                    className="grid h-4 w-4 place-items-center rounded-full border-2 border-white text-[5px] font-black text-white shadow-lg"
                    style={{ backgroundColor: STATUS_COLOR[incident.estado] }}
                  >
                    {index + 1}
                  </span>
                </div>
              );
            })}

            <div className="absolute bottom-1.5 left-1.5 border border-white/20 bg-[#001a35]/85 px-2 py-1.5">
              <p className="text-[5.5px] font-black uppercase tracking-[0.16em] text-white/60">
                Referencias
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(
                  [
                    ['Pendiente', STATUS_COLOR.Pendiente],
                    ['En Gestión', STATUS_COLOR['En Gestión']],
                    ['Resuelto', STATUS_COLOR.Resuelto],
                  ] as const
                ).map(([label, color]) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 text-[5px] font-bold uppercase tracking-wider text-white/80"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="absolute right-1.5 top-1.5 border border-white/20 bg-[#001a35]/85 px-2 py-1 font-mono text-[5px] uppercase tracking-widest text-white/70">
              {sector?.nombre} · {sector?.superficie}
            </div>
          </div>
        </section>

        {/* Catastro */}
        <section className="mt-[6mm] break-inside-avoid">
          <SectionTitle
            number={section(5)}
            title="Catastro de incidencias"
          />
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#002855] text-white">
                {['N°', 'Código', 'Categoría', 'Fecha', 'Severidad', 'Estado'].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-1.5 py-1.5 text-[5.5px] font-black uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {incidents.slice(0, 12).map((incident, index) => (
                <tr
                  key={incident.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                >
                  <td className="border-b border-slate-100 px-1.5 py-1.5 text-[6px] font-black text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="border-b border-slate-100 px-1.5 py-1.5 font-mono text-[5.5px] font-bold text-[#002855]">
                    {incident.codigo}
                  </td>
                  <td className="border-b border-slate-100 px-1.5 py-1.5 text-[6px] font-bold uppercase text-slate-600">
                    {incident.categoria}
                  </td>
                  <td className="border-b border-slate-100 px-1.5 py-1.5 text-[6px] text-slate-500">
                    {formatDateShort(incident.fecha)}
                  </td>
                  <td className="border-b border-slate-100 px-1.5 py-1.5 text-[6px] font-black uppercase text-slate-600">
                    {incident.severidad}
                  </td>
                  <td className="border-b border-slate-100 px-1.5 py-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[5.5px] font-black uppercase tracking-wider"
                      style={{ color: STATUS_COLOR[incident.estado] }}
                    >
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[incident.estado] }}
                      />
                      {incident.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {incidents.length > 12 && (
            <p className="mt-1 text-right text-[5.5px] font-bold uppercase tracking-widest text-slate-400">
              + {incidents.length - 12} incidencias anexas en el sistema
            </p>
          )}
        </section>

        {/* Observaciones */}
        <section className="mt-[6mm] break-inside-avoid">
          <SectionTitle
            number={section(6)}
            title="Observaciones y recomendaciones"
          />
          <p className="text-[7px] font-medium leading-[1.7] text-slate-600">
            {meta.observaciones ||
              'Sin observaciones adicionales para el período informado.'}
          </p>
          <ul className="mt-2 space-y-1">
            {[
              'Programar una inspección en terreno de los puntos clasificados con severidad alta.',
              'Coordinar con las áreas operativas y el concesionario el despeje de bermas y la limpieza de residuos.',
              'Verificar la evolución de los hallazgos en el próximo vuelo programado y actualizar su estado.',
            ].map((recommendation) => (
              <li
                key={recommendation}
                className="flex gap-1.5 text-[6.5px] font-medium leading-relaxed text-slate-500"
              >
                <span className="mt-[1.5px] h-1 w-1 shrink-0 bg-blue-600" />
                {recommendation}
              </li>
            ))}
          </ul>
        </section>

        {/* Firmas */}
        <section className="mt-[7mm] grid grid-cols-3 gap-6 break-inside-avoid">
          {[
            { role: 'Elaborado por', name: meta.elaboradoPor },
            { role: 'Revisado por', name: 'Jorge Bernal Navarrete' },
            { role: 'Aprobado por', name: 'Gerencia EPA' },
          ].map((signature) => (
            <div key={signature.role} className="text-center">
              <div className="mx-auto h-[10mm] border-b border-slate-300" />
              <p className="mt-1.5 text-[5.5px] font-black uppercase tracking-[0.16em] text-slate-400">
                {signature.role}
              </p>
              <p className="mt-0.5 text-[6px] font-bold text-[#002855]">
                {signature.name}
              </p>
            </div>
          ))}
        </section>
      </div>

      {/* Pie */}
      <footer className="mt-auto border-t border-slate-200 px-[11mm] py-[4mm]">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[5.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Documento generado desde EPA WebGIS · Datos del prototipo
          </p>
          <p className="font-mono text-[5.5px] uppercase tracking-widest text-slate-400">
            {reportNumber} · Página 1 de 1
          </p>
        </div>
        <div className="mt-2 h-1 w-full bg-gradient-to-r from-[#002855] via-blue-500 to-[#ffd700]" />
      </footer>
    </article>
  );
};
