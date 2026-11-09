import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Columns2,
  Download,
  Eye,
  FilePlus2,
  FileText,
  History,
  Images,
  Info,
  Layers3,
  ListChecks,
  Save,
  Search,
  SearchX,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  CategoryBadge,
  CategoryIcon,
  SeverityBadge,
  StatusBadge,
} from '@/components/Badges';
import { ReportStepper, type ReportStep } from '@/components/report/ReportStepper';
import { ReportPreview } from '@/components/report/ReportPreview';
import { GenerationModal } from '@/components/report/GenerationModal';
import { useAuth } from '@/context/AuthContext';
import { reportsService } from '@/services/reports.service';
import {
  CAPTURES,
  INCIDENTS,
  SECTORS,
  getCapture,
  getSector,
} from '@/mocks/data';
import type {
  GeneratedReport,
  Incident,
  IncidentCategory,
  IncidentStatus,
  ReportDraft,
  ReportMeta,
  ReportStage,
  ReportType,
  SectorId,
  SessionUser,
} from '@/types';
import { cn, formatDateShort, formatDateTime, formatNumber } from '@/utils/format';
import {
  addReportToHistory,
  buildDefaultReportMeta,
  clearReportDraft,
  getReportHistory,
  loadComparisonSelection,
  loadReportDraft,
  saveReportDraft,
} from '@/utils/reportStorage';
import { ui } from '@/utils/SwalService';

const FALLBACK_USER: SessionUser = {
  id: 0,
  nombre: 'Usuario EPA',
  email: 'usuario@puertoarica.cl',
  rol: 'Operador',
  unidad: 'EPA',
};

const REPORT_TYPES: ReportType[] = [
  'Inspección periódica',
  'Consolidado mensual',
  'Reporte de incidencia crítica',
];

const CATEGORIES: IncidentCategory[] = [
  'Congestión',
  'Daño de pavimento',
  'Residuos',
  'Luminaria',
  'Otro',
];

const CATEGORY_COLOR: Record<IncidentCategory, string> = {
  Congestión: '#2563eb',
  'Daño de pavimento': '#d97706',
  Residuos: '#059669',
  Luminaria: '#ca8a04',
  Otro: '#e11d48',
};

const INPUT =
  'w-full border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-[#002855] focus:bg-white focus:ring-2 focus:ring-blue-100';
const LABEL =
  'mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400';

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const Field = ({
  label,
  icon: Icon,
  children,
  className,
  hint,
}: {
  label: string;
  icon?: typeof FileText;
  children: ReactNode;
  className?: string;
  hint?: string;
}) => (
  <div className={className}>
    <span className={LABEL}>
      {Icon && <Icon className="h-3 w-3 text-slate-300" />}
      {label}
    </span>
    {children}
    {hint && (
      <p className="mt-1.5 text-[8px] font-medium leading-relaxed text-slate-400">
        {hint}
      </p>
    )}
  </div>
);

const StepHeader = ({
  number,
  eyebrow,
  title,
  description,
  right,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  right?: ReactNode;
}) => (
  <header className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
    <div className="flex items-center gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#002855] text-sm font-black text-white">
        {number}
      </span>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-600">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black uppercase leading-none tracking-tighter text-[#002855] md:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </div>
    {right}
  </header>
);

const SummaryRow = ({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-2.5 last:border-b-0">
    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
      {label}
    </span>
    <span
      className={cn(
        'max-w-[62%] text-right text-[10px] font-bold leading-snug',
        strong ? 'font-black uppercase text-[#002855]' : 'text-slate-600',
      )}
    >
      {value}
    </span>
  </div>
);

export const ReportCreatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = user ?? FALLBACK_USER;

  const [initialDraft] = useState(loadReportDraft);
  const [initialComparison] = useState(
    () => initialDraft?.comparison ?? loadComparisonSelection(),
  );
  const [importedFromComparator] = useState(() =>
    Boolean((location.state as { fromComparator?: boolean } | null)?.fromComparator),
  );

  const [meta, setMeta] = useState<ReportMeta>(() => {
    if (initialDraft) return initialDraft.meta;
    const base = buildDefaultReportMeta(currentUser);
    if (initialComparison) {
      return {
        ...base,
        sectorId: initialComparison.sectorId,
        titulo: `Informe de inspección — ${
          getSector(initialComparison.sectorId)?.nombre ?? 'Sector EPA'
        }`,
      };
    }
    return base;
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialDraft) return initialDraft.incidentIds;
    const sectorId = initialComparison?.sectorId ?? 'patio-norte';
    return INCIDENTS.filter(
      (incident) => incident.sectorId === sectorId && incident.estado !== 'Resuelto',
    )
      .slice(0, 4)
      .map((incident) => incident.id);
  });

  const [comparison, setComparison] = useState(initialComparison);
  const [includeComparison, setIncludeComparison] = useState(
    initialDraft?.includeComparison ?? Boolean(initialComparison),
  );
  const [step, setStep] = useState<ReportStep>(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialDraft?.savedAt ?? null,
  );
  const [showImportedBanner, setShowImportedBanner] = useState(
    importedFromComparator && Boolean(initialComparison),
  );

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | IncidentCategory>(
    'Todas',
  );
  const [statusFilter, setStatusFilter] = useState<'Todos' | IncidentStatus>('Todos');
  const [sectorFilter, setSectorFilter] = useState<'Todos' | SectorId>(meta.sectorId);

  const [history, setHistory] = useState<GeneratedReport[]>(getReportHistory);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [generationStage, setGenerationStage] = useState<ReportStage>('idle');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);

  const sector = getSector(meta.sectorId);
  const comparisonSector = comparison?.sectorId ?? meta.sectorId;
  const comparisonSectorCaptures = CAPTURES.filter(
    (capture) => capture.sectorId === comparisonSector,
  );

  const comparisonBaseA = comparison
    ? getCapture(comparison.captureAId) ?? comparisonSectorCaptures[0]
    : comparisonSectorCaptures[0];
  const comparisonBaseB = comparison
    ? getCapture(comparison.captureBId) ??
      comparisonSectorCaptures[1] ??
      comparisonSectorCaptures[0]
    : comparisonSectorCaptures[1] ?? comparisonSectorCaptures[0];

  const comparisonCaptureA = comparisonBaseA
    ? {
        ...comparisonBaseA,
        fecha: comparison?.captureADate ?? comparisonBaseA.fecha,
      }
    : undefined;
  const comparisonCaptureB = comparisonBaseB
    ? {
        ...comparisonBaseB,
        fecha: comparison?.captureBDate ?? comparisonBaseB.fecha,
      }
    : undefined;

  const selectedIncidents = useMemo(
    () => INCIDENTS.filter((incident) => selectedIds.includes(incident.id)),
    [selectedIds],
  );

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return INCIDENTS.filter((incident) => {
      const matchesSearch =
        !query ||
        [incident.codigo, incident.descripcion, incident.categoria].some((value) =>
          value.toLowerCase().includes(query),
        );
      const matchesCategory =
        categoryFilter === 'Todas' || incident.categoria === categoryFilter;
      const matchesStatus =
        statusFilter === 'Todos' || incident.estado === statusFilter;
      const matchesSector =
        sectorFilter === 'Todos' || incident.sectorId === sectorFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesSector;
    });
  }, [search, categoryFilter, statusFilter, sectorFilter]);

  const categoryBreakdown = CATEGORIES.map((category) => ({
    category,
    count: selectedIncidents.filter((incident) => incident.categoria === category)
      .length,
  })).filter((item) => item.count > 0);

  const statusCounts = {
    Pendiente: selectedIncidents.filter((i) => i.estado === 'Pendiente').length,
    'En Gestión': selectedIncidents.filter((i) => i.estado === 'En Gestión').length,
    Resuelto: selectedIncidents.filter((i) => i.estado === 'Resuelto').length,
  };

  const highSeverity = selectedIncidents.filter(
    (incident) => incident.severidad === 'Alta',
  ).length;

  // Borrador automático: misma estrategia que SISAC (localStorage por formulario).
  // Se escribe con un pequeño debounce para no guardar en cada pulsación.
  useEffect(() => {
    const savedAt = new Date().toISOString();
    const draft: ReportDraft = {
      meta,
      incidentIds: selectedIds,
      includeComparison,
      comparison,
      savedAt,
    };
    const timer = window.setTimeout(() => {
      saveReportDraft(draft);
      setLastSavedAt(savedAt);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [meta, selectedIds, includeComparison, comparison]);

  const validateMeta = (): string | null => {
    if (!meta.titulo.trim()) return 'Ingresa un título para el informe.';
    if (!meta.sectorId) return 'Selecciona el sector del informe.';
    if (!meta.fechaDesde || !meta.fechaHasta)
      return 'Define el período de análisis (desde y hasta).';
    if (meta.fechaDesde > meta.fechaHasta)
      return 'La fecha de inicio no puede ser posterior a la fecha de término.';
    if (!meta.destinatario.trim()) return 'Indica el destinatario del informe.';
    if (!meta.elaboradoPor.trim()) return 'Indica quién elabora el informe.';
    return null;
  };

  const goNext = () => {
    if (step === 1) {
      const error = validateMeta();
      if (error) {
        setFormError(error);
        return;
      }
    }
    if (step === 2 && selectedIncidents.length === 0) {
      setFormError('Selecciona al menos un hallazgo para incluir en el informe.');
      return;
    }
    setFormError(null);
    setStep((current) => Math.min(3, current + 1) as ReportStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setFormError(null);
    setStep((current) => Math.max(1, current - 1) as ReportStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpTo = (target: ReportStep) => {
    setFormError(null);
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectSector = (nextSectorId: SectorId) => {
    setMeta((previous) => ({
      ...previous,
      sectorId: nextSectorId,
      titulo: previous.titulo.startsWith('Informe de inspección')
        ? `Informe de inspección — ${getSector(nextSectorId)?.nombre ?? 'Sector EPA'}`
        : previous.titulo,
    }));
    setSectorFilter(nextSectorId);
    setSelectedIds(
      INCIDENTS.filter(
        (incident) =>
          incident.sectorId === nextSectorId && incident.estado !== 'Resuelto',
      )
        .slice(0, 4)
        .map((incident) => incident.id),
    );
    if (comparison && comparison.sectorId !== nextSectorId) {
      setComparison(null);
      setIncludeComparison(false);
    }
  };

  const toggleIncident = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
    setFormError(null);
  };

  const selectVisible = () => {
    const visibleIds = filteredIncidents.map((incident) => incident.id);
    setSelectedIds((previous) => Array.from(new Set([...previous, ...visibleIds])));
    setFormError(null);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setFormError(null);
  };

  const goToComparator = () => {
    const savedAt = new Date().toISOString();
    saveReportDraft({
      meta,
      incidentIds: selectedIds,
      includeComparison,
      comparison,
      savedAt,
    });
    navigate('/comparador');
  };

  const handleSaveDraft = () => {
    const savedAt = new Date().toISOString();
    saveReportDraft({
      meta,
      incidentIds: selectedIds,
      includeComparison,
      comparison,
      savedAt,
    });
    setLastSavedAt(savedAt);
    ui.exito('Borrador guardado', 'Puedes continuar más tarde desde este navegador.');
  };

  const handleDiscardDraft = () => {
    clearReportDraft();
    const base = buildDefaultReportMeta(currentUser);
    setMeta(base);
    setComparison(null);
    setIncludeComparison(false);
    setSelectedIds(
      INCIDENTS.filter(
        (incident) =>
          incident.sectorId === base.sectorId && incident.estado !== 'Resuelto',
      )
        .slice(0, 4)
        .map((incident) => incident.id),
    );
    setSectorFilter(base.sectorId);
    setStep(1);
    setFormError(null);
    setShowImportedBanner(false);
    ui.info(
      'Borrador descartado',
      'El formulario volvió a sus valores iniciales. Los reportes ya generados no se eliminan.',
    );
  };

  const startGeneration = async () => {
    const error = validateMeta();
    if (error) {
      setStep(1);
      setFormError(error);
      return;
    }
    if (selectedIncidents.length === 0) {
      setStep(2);
      setFormError('Selecciona al menos un hallazgo para incluir en el informe.');
      return;
    }

    setFormError(null);
    setGeneratedReport(null);
    setGenerationStage('compiling-map');
    setGenerationProgress(8);
    setGenerationOpen(true);

    await wait(650);
    setGenerationProgress(30);
    setGenerationStage('attaching-evidence');

    await wait(750);
    setGenerationProgress(55);
    setGenerationStage('rendering-tables');

    await wait(700);
    setGenerationProgress(78);
    setGenerationStage('generating-pdf');
    setGenerationProgress(92);

    try {
      const report = await reportsService.createReport({
        meta,
        incidents: selectedIncidents,
        comparison,
        includeComparison,
        user: currentUser,
      });
      setGeneratedReport(report);
      addReportToHistory(report);
      setHistory(getReportHistory());
      setGenerationProgress(100);
      setGenerationStage('done');
      clearReportDraft();
    } catch (requestError) {
      setGenerationOpen(false);
      setGenerationStage('idle');
      setGenerationProgress(0);
      ui.error(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible generar el reporte.',
      );
    }
  };

  const handleDownload = () => {
    setGenerationOpen(false);
    window.setTimeout(() => window.print(), 320);
  };

  const handleNewReport = () => {
    setGenerationOpen(false);
    setGenerationStage('idle');
    setGenerationProgress(0);
    setGeneratedReport(null);
    const base = buildDefaultReportMeta(currentUser);
    setMeta(base);
    setComparison(null);
    setIncludeComparison(false);
    setSelectedIds(
      INCIDENTS.filter(
        (incident) =>
          incident.sectorId === base.sectorId && incident.estado !== 'Resuelto',
      )
        .slice(0, 4)
        .map((incident) => incident.id),
    );
    setSectorFilter(base.sectorId);
    setStep(1);
    setFormError(null);
    setShowImportedBanner(false);
    clearReportDraft();
    ui.exito('Nuevo reporte', 'El formulario quedó listo para un nuevo informe.');
  };

  const reportNumber = generatedReport?.numero ?? 'INF-EPA-2026-BORRADOR';
  const savedTime = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Reportería y decisiones · Informe ejecutivo"
        code="RF-09 / CU-08"
        title="Nuevo"
        accent="reporte"
        description="Compila la cartografía, la comparación temporal y el catastro de hallazgos en un documento A4 listo para jefatura y gerencia."
        image="/mock/aerial-muelle-1-b.svg"
        actions={
          <>
            <span className="flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/60">
              <Save className="h-3.5 w-3.5 text-emerald-400" />
              {savedTime ? `Autoguardado ${savedTime}` : 'Borrador sin guardar'}
            </span>
            <button
              type="button"
              onClick={goToComparator}
              className="group flex items-center gap-2 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-[#002855] shadow-xl transition-all hover:bg-blue-50 active:scale-[0.98]"
            >
              <Columns2 className="h-4 w-4" />
              Ir al comparador
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">
          <span className="flex items-center gap-1.5">
            <ListChecks className="h-3 w-3 text-blue-400" />
            {selectedIncidents.length} hallazgos seleccionados
          </span>
          <span className="flex items-center gap-1.5">
            <Layers3 className="h-3 w-3 text-blue-400" />
            {sector?.nombre} · {sector?.superficie}
          </span>
          <span className="flex items-center gap-1.5">
            <Images className="h-3 w-3 text-blue-400" />
            {includeComparison ? 'Comparación A/B incluida' : 'Sin comparación'}
          </span>
        </div>
      </PageHeader>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
        <AnimatePresence>
          {showImportedBanner && comparison && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 flex items-start justify-between gap-4 border-l-4 border-blue-600 bg-blue-50 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <Columns2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-800">
                    Comparación importada desde el comparador
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-blue-700/75">
                    {getSector(comparison.sectorId)?.nombre} ·{' '}
                    {comparisonCaptureA && formatDateShort(comparisonCaptureA.fecha)} →{' '}
                    {comparisonCaptureB && formatDateShort(comparisonCaptureB.fecha)}. El
                    par A/B se incluirá en la sección de comparación temporal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportedBanner(false)}
                className="p-1 text-blue-400 transition-colors hover:text-blue-700"
                aria-label="Ocultar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <ReportStepper current={step} onStepClick={jumpTo} />

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-red-700"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {formError}
              </motion.div>
            )}

            {step === 1 && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 bg-white shadow-xl"
              >
                <StepHeader
                  number="01"
                  eyebrow="Metadatos del documento"
                  title="Datos del informe"
                  description="Define el alcance, el período y los responsables del documento."
                  right={
                    <span className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Guardado automático
                    </span>
                  }
                />

                <div className="space-y-5 p-4 md:p-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field
                      label="Título del informe"
                      icon={FileText}
                      className="md:col-span-2"
                    >
                      <input
                        type="text"
                        value={meta.titulo}
                        onChange={(event) =>
                          setMeta((previous) => ({
                            ...previous,
                            titulo: event.target.value,
                          }))
                        }
                        placeholder="Informe de inspección — Patio Norte"
                        className={INPUT}
                      />
                    </Field>

                    <Field label="Tipo de informe" icon={ListChecks}>
                      <select
                        value={meta.tipo}
                        onChange={(event) =>
                          setMeta((previous) => ({
                            ...previous,
                            tipo: event.target.value as ReportType,
                          }))
                        }
                        className={INPUT}
                      >
                        {REPORT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Sector inspeccionado" icon={Layers3}>
                      <select
                        value={meta.sectorId}
                        onChange={(event) =>
                          selectSector(event.target.value as SectorId)
                        }
                        className={INPUT}
                      >
                        {SECTORS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre} · {item.superficie}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Período desde" icon={CalendarDays}>
                      <input
                        type="date"
                        value={meta.fechaDesde}
                        onChange={(event) =>
                          setMeta((previous) => ({
                            ...previous,
                            fechaDesde: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </Field>

                    <Field label="Período hasta" icon={CalendarDays}>
                      <input
                        type="date"
                        value={meta.fechaHasta}
                        onChange={(event) =>
                          setMeta((previous) => ({
                            ...previous,
                            fechaHasta: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </Field>

                    <div className="md:col-span-2 -mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Períodos sugeridos
                      </span>
                      {[
                        { label: 'Septiembre 2026', from: '2026-09-01', to: '2026-09-30' },
                        { label: 'Junio → Septiembre', from: '2026-06-14', to: '2026-09-14' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setMeta((previous) => ({
                              ...previous,
                              fechaDesde: preset.from,
                              fechaHasta: preset.to,
                            }))
                          }
                          className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <Field label="Elaborado por" icon={UserRound}>
                      <input
                        type="text"
                        value={meta.elaboradoPor}
                        onChange={(event) =>
                          setMeta((previous) => ({
                            ...previous,
                            elaboradoPor: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </Field>

                    <Field label="Destinatario" icon={UserRound}>
                      <input
                        type="text"
                        value={meta.destinatario}
                        onChange={(event) =>
                          setMeta((previous) => ({
                            ...previous,
                            destinatario: event.target.value,
                          }))
                        }
                        className={INPUT}
                      />
                    </Field>

                    <Field
                      label="Observaciones generales"
                      icon={FileText}
                      className="md:col-span-2"
                      hint="Este texto aparecerá en la sección de observaciones y recomendaciones del PDF."
                    >
                      <textarea
                        rows={4}
                        value={meta.observaciones}
                        onChange={(event) =>
                          setMeta((previous) => ({
                            ...previous,
                            observaciones: event.target.value,
                          }))
                        }
                        placeholder="Observaciones, acuerdos o recomendaciones para jefatura..."
                        className={cn(INPUT, 'resize-y leading-relaxed')}
                      />
                    </Field>
                  </div>

                  <div className="border border-slate-200">
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Columns2 className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#002855]">
                            Comparación temporal vinculada
                          </p>
                          <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                            {comparisonCaptureA && comparisonCaptureB
                              ? `${formatDateShort(comparisonCaptureA.fecha)} → ${formatDateShort(comparisonCaptureB.fecha)}`
                              : 'Sin capturas disponibles para el sector'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={includeComparison}
                        onClick={() => setIncludeComparison((value) => !value)}
                        className={cn(
                          'flex items-center gap-2 border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest transition-colors',
                          includeComparison
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-400',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-4 w-4 place-items-center border',
                            includeComparison
                              ? 'border-white/30 bg-white/15'
                              : 'border-slate-200 bg-slate-50',
                          )}
                        >
                          {includeComparison && <Check className="h-2.5 w-2.5" />}
                        </span>
                        {includeComparison ? 'Incluida' : 'Incluir'}
                      </button>
                    </div>

                    <div className="grid gap-3 p-4 sm:grid-cols-2">
                      {comparisonCaptureA && comparisonCaptureB ? (
                        <>
                          {[comparisonCaptureA, comparisonCaptureB].map(
                            (capture, index) => (
                              <div
                                key={capture.id}
                                className="flex items-center gap-3 border border-slate-200 bg-white p-2"
                              >
                                <img
                                  src={capture.src}
                                  alt=""
                                  className="h-12 w-20 shrink-0 object-cover"
                                />
                                <div className="min-w-0">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    Captura {index === 0 ? 'A' : 'B'}
                                  </p>
                                  <p className="mt-0.5 text-[10px] font-black uppercase tracking-tight text-[#002855]">
                                    {formatDateShort(capture.fecha)}
                                  </p>
                                  <p className="font-mono text-[8px] text-slate-400">
                                    {capture.altitud.toFixed(1)} m · {capture.hora}
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                            <button
                              type="button"
                              onClick={goToComparator}
                              className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-[8px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-700"
                            >
                              <Columns2 className="h-3 w-3" />
                              Cambiar par en el comparador
                            </button>
                            <span className="text-[8px] font-medium text-slate-400">
                              Si se omite, el informe no incluirá la sección de
                              comparación temporal.
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="sm:col-span-2 flex flex-col items-start gap-2 border border-dashed border-slate-200 bg-slate-50 p-4">
                          <p className="text-[10px] font-medium leading-relaxed text-slate-500">
                            No hay una comparación vinculada. Puedes seleccionar un par
                            A/B en el comparador y volver a este formulario.
                          </p>
                          <button
                            type="button"
                            onClick={goToComparator}
                            className="flex items-center gap-2 bg-[#002855] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white"
                          >
                            Ir al comparador
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-[#002855]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar borrador
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDiscardDraft}
                      className="flex items-center justify-center gap-2 px-3 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="group flex items-center justify-center gap-2 bg-[#003385] px-5 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#002a66]"
                    >
                      Continuar a hallazgos
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </footer>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 bg-white shadow-xl"
              >
                <StepHeader
                  number="02"
                  eyebrow="Catastro de incidencias"
                  title="Selección de hallazgos"
                  description="Elige los registros que respaldarán el informe ejecutivo."
                  right={
                    <span className="flex items-center gap-2 border border-[#002855] bg-[#002855] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white">
                      <ListChecks className="h-3.5 w-3.5 text-blue-300" />
                      {selectedIncidents.length} seleccionados
                    </span>
                  }
                />

                <div className="space-y-4 p-4 md:p-6">
                  <div className="flex flex-col gap-3 border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar por código, categoría o descripción..."
                        className="w-full border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[#002855]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={sectorFilter}
                        onChange={(event) =>
                          setSectorFilter(event.target.value as 'Todos' | SectorId)
                        }
                        className="border border-slate-200 bg-white px-2.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 outline-none focus:border-[#002855]"
                        aria-label="Filtrar por sector"
                      >
                        <option value="Todos">Todos los sectores</option>
                        {SECTORS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre}
                          </option>
                        ))}
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(
                            event.target.value as 'Todos' | IncidentStatus,
                          )
                        }
                        className="border border-slate-200 bg-white px-2.5 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-500 outline-none focus:border-[#002855]"
                        aria-label="Filtrar por estado"
                      >
                        <option value="Todos">Todos los estados</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Gestión">En Gestión</option>
                        <option value="Resuelto">Resuelto</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Categoría
                    </span>
                    {(['Todas', ...CATEGORIES] as const).map((category) => {
                      const active = categoryFilter === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() =>
                            setCategoryFilter(
                              category as 'Todas' | IncidentCategory,
                            )
                          }
                          className={cn(
                            'flex items-center gap-1.5 border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider transition-colors',
                            active
                              ? 'border-[#002855] bg-[#002855] text-white'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-[#002855]',
                          )}
                        >
                          {category !== 'Todas' && (
                            <CategoryIcon
                              category={category as IncidentCategory}
                              className="h-3 w-3"
                            />
                          )}
                          {category}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      {formatNumber(filteredIncidents.length)} hallazgos visibles
                      {sectorFilter !== 'Todos' && ` · ${getSector(sectorFilter)?.nombre}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectVisible}
                        className="text-[8px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:text-blue-800"
                      >
                        Seleccionar visibles
                      </button>
                      <span className="text-slate-200">|</span>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-[8px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-red-600"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden border border-slate-200">
                    <div className="hidden grid-cols-[32px_88px_118px_minmax(0,1fr)_86px_112px] items-center gap-3 border-b border-slate-200 bg-[#002855] px-3 py-2 text-[7px] font-black uppercase tracking-[0.16em] text-white/50 md:grid">
                      <span />
                      <span>Evidencia</span>
                      <span>Registro</span>
                      <span>Hallazgo</span>
                      <span>Severidad</span>
                      <span>Estado</span>
                    </div>

                    {filteredIncidents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                        <SearchX className="h-8 w-8 text-slate-200" />
                        <p className="mt-3 text-xs font-black uppercase tracking-wider text-slate-400">
                          Sin resultados
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">
                          Ajusta los filtros o la búsqueda para ver otros hallazgos.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredIncidents.map((incident) => (
                          <IncidentRow
                            key={incident.id}
                            incident={incident}
                            selected={selectedIds.includes(incident.id)}
                            onToggle={() => toggleIncident(incident.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="flex items-start gap-2 border border-blue-100 bg-blue-50 px-3 py-2.5 text-[9px] font-medium leading-relaxed text-blue-800/75">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                    El informe toma el estado actual de cada incidencia. La
                    cartografía usa el sector principal del formulario; el catastro
                    puede incluir hallazgos de otros sectores si se cambia el filtro.
                  </p>
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-[#002855]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a datos
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="group flex items-center justify-center gap-2 bg-[#003385] px-5 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#002a66]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver vista previa
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </footer>
              </motion.section>
            )}

            {step === 3 && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 bg-white shadow-xl"
              >
                <StepHeader
                  number="03"
                  eyebrow="Documento final"
                  title="Vista previa A4"
                  description="Revisa el informe antes de generar el PDF ejecutivo."
                  right={
                    <div className="flex items-center gap-2">
                      <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-widest text-slate-500">
                        210 × 297 mm
                      </span>
                      <span className="border border-yellow-300 bg-yellow-50 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-yellow-800">
                        Borrador
                      </span>
                    </div>
                  }
                />

                <div className="bg-slate-200/70 p-3 md:p-6">
                  <div className="overflow-x-auto pb-3">
                    <div className="mx-auto w-fit">
                      <ReportPreview
                        meta={meta}
                        incidents={selectedIncidents}
                        comparison={comparison}
                        includeComparison={includeComparison}
                        reportNumber={reportNumber}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-center text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    Desliza horizontalmente para ver el documento completo
                  </p>
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-[#002855]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Volver a hallazgos
                    </button>
                    <button
                      type="button"
                      onClick={goToComparator}
                      className="hidden items-center justify-center gap-2 px-3 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-blue-700 sm:flex"
                    >
                      <Columns2 className="h-3.5 w-3.5" />
                      Comparador
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        ui.info(
                          'Vista previa',
                          'El PDF se genera en el navegador con la impresión del documento A4. En producción lo compilará el backend ASP.NET Core.',
                        )
                      }
                      className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-3 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-[#002855]"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Ayuda
                    </button>
                    <button
                      type="button"
                      onClick={startGeneration}
                      className="group flex items-center justify-center gap-2 bg-[#003385] px-5 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-[#002a66]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Generar reporte PDF
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </footer>
              </motion.section>
            )}
          </div>

          {/* Resumen lateral */}
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <div className="border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-[#002855] px-4 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.22em] text-blue-300">
                  Resumen del informe
                </p>
                <p className="mt-1 font-mono text-[10px] font-bold text-white">
                  {generatedReport?.numero ?? 'Se asigna al generar'}
                </p>
              </header>

              <div>
                <SummaryRow label="Sector" value={sector?.nombre ?? '—'} strong />
                <SummaryRow
                  label="Período"
                  value={`${formatDateShort(meta.fechaDesde)} — ${formatDateShort(meta.fechaHasta)}`}
                />
                <SummaryRow
                  label="Hallazgos"
                  value={`${selectedIncidents.length} seleccionados`}
                  strong
                />
                <SummaryRow
                  label="Severidad alta"
                  value={String(highSeverity).padStart(2, '0')}
                />
                <SummaryRow
                  label="Comparación A/B"
                  value={
                    includeComparison
                      ? comparisonCaptureA && comparisonCaptureB
                        ? `${formatDateShort(comparisonCaptureA.fecha)} → ${formatDateShort(comparisonCaptureB.fecha)}`
                        : 'Par del sector'
                      : 'Omitida'
                  }
                />
                <SummaryRow
                  label="Destinatario"
                  value={meta.destinatario}
                />
              </div>

              <div className="border-t border-slate-100 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Composición
                  </p>
                  <p className="font-mono text-[8px] text-slate-400">
                    {selectedIncidents.length} reg.
                  </p>
                </div>

                {categoryBreakdown.length === 0 ? (
                  <p className="text-[9px] font-medium text-slate-400">
                    Sin hallazgos seleccionados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categoryBreakdown.map((item) => {
                      const width = Math.max(
                        8,
                        (item.count / Math.max(1, selectedIncidents.length)) * 100,
                      );
                      return (
                        <div key={item.category}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                              <CategoryIcon
                                category={item.category}
                                className="h-3 w-3"
                              />
                              {item.category}
                            </span>
                            <span className="font-mono text-[8px] font-bold text-slate-500">
                              {item.count}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 bg-slate-100">
                            <div
                              className="h-full transition-all"
                              style={{
                                width: `${width}%`,
                                backgroundColor: CATEGORY_COLOR[item.category],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-px border border-slate-200 bg-slate-200">
                  {(
                    [
                      ['Pendiente', statusCounts.Pendiente, 'text-red-600'],
                      ['En Gestión', statusCounts['En Gestión'], 'text-amber-600'],
                      ['Resuelto', statusCounts.Resuelto, 'text-emerald-600'],
                    ] as const
                  ).map(([label, value, color]) => (
                    <div key={label} className="bg-white px-2 py-2 text-center">
                      <p className={cn('text-lg font-black leading-none', color)}>
                        {value}
                      </p>
                      <p className="mt-1 text-[6px] font-black uppercase tracking-wide text-slate-400">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 p-4">
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="group flex w-full items-center justify-center gap-2 bg-[#003385] px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#002a66]"
                  >
                    {step === 1 ? 'Continuar' : 'Vista previa'}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startGeneration}
                    className="group flex w-full items-center justify-center gap-2 bg-[#003385] px-4 py-3 text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#002a66]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Generar PDF
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="flex w-full items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-[#002855]"
                >
                  <Save className="h-3 w-3" />
                  Guardar borrador
                </button>
              </div>
            </div>

            <div className="border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-slate-300" />
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Historial reciente
                  </p>
                </div>
                <span className="grid h-5 min-w-5 place-items-center bg-slate-100 px-1 font-mono text-[8px] font-bold text-slate-500">
                  {history.length}
                </span>
              </header>

              {history.length === 0 ? (
                <p className="px-4 py-4 text-[9px] font-medium leading-relaxed text-slate-400">
                  Aún no hay reportes generados en este navegador. Al generar el
                  primero aparecerá aquí.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {history.slice(0, 4).map((report) => (
                    <li key={report.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center bg-red-50 text-red-600">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[8px] font-bold uppercase text-[#002855]">
                          {report.numero}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] font-medium text-slate-500">
                          {report.sector} · {report.totalIncidencias} hallazgos
                        </p>
                        <p className="mt-0.5 font-mono text-[7px] uppercase tracking-wider text-slate-400">
                          {formatDateTime(report.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-l-4 border-[#ffd700] bg-[#001a35] p-4 text-white">
              <p className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-yellow-300">
                <FilePlus2 className="h-3.5 w-3.5" />
                Prototipo Parte 2
              </p>
              <p className="mt-2 text-[9px] font-medium leading-relaxed text-blue-100/55">
                El documento se compone en el cliente a partir de los mocks. La
                estructura de datos ya está alineada con la API ASP.NET Core y
                PostgreSQL/PostGIS.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <GenerationModal
        open={generationOpen}
        stage={generationStage}
        progress={generationProgress}
        report={generatedReport}
        onClose={() => setGenerationOpen(false)}
        onDownload={handleDownload}
        onNewReport={handleNewReport}
      />
    </>
  );
};

const IncidentRow = ({
  incident,
  selected,
  onToggle,
}: {
  incident: Incident;
  selected: boolean;
  onToggle: () => void;
}) => {
  const sector = getSector(incident.sectorId);

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        'relative cursor-pointer px-3 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-300',
        selected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50',
      )}
    >
      {selected && (
        <span className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
      )}

      <div className="grid gap-3 md:grid-cols-[32px_88px_118px_minmax(0,1fr)_86px_112px] md:items-center">
        <span
          className={cn(
            'hidden h-5 w-5 place-items-center border md:grid',
            selected
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-300 bg-white text-transparent',
          )}
        >
          <Check className="h-3 w-3" />
        </span>

        <div className="relative hidden aspect-[16/10] w-[88px] overflow-hidden border border-slate-200 bg-slate-100 md:block">
          <img
            src={incident.evidencia}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-x-0 bottom-0 bg-[#001a35]/75 px-1 py-0.5 text-center font-mono text-[6px] uppercase tracking-wider text-white/80">
            Evidencia
          </span>
        </div>

        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#002855]">
            {incident.codigo}
          </p>
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400">
            {formatDateShort(incident.fecha)}
          </p>
          <p className="mt-0.5 text-[8px] font-medium text-slate-400">
            {sector?.nombre}
          </p>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={incident.categoria} />
            <span className="md:hidden">
              <SeverityBadge severity={incident.severidad} />
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-relaxed text-slate-500">
            {incident.descripcion}
          </p>
        </div>

        <div className="hidden md:block">
          <SeverityBadge severity={incident.severidad} />
        </div>

        <div className="flex items-center justify-between gap-2 md:block">
          <StatusBadge status={incident.estado} />
          <span
            className={cn(
              'grid h-5 w-5 place-items-center border md:hidden',
              selected
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-transparent',
            )}
          >
            <Check className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
