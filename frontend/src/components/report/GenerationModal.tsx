import { motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  Images,
  Loader2,
  Map,
  RotateCcw,
  Table2,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { GeneratedReport, ReportStage } from '@/types';
import { cn, formatDateTime } from '@/utils/format';

const STAGES: Array<{
  id: ReportStage;
  label: string;
  detail: string;
  icon: typeof FileText;
}> = [
  {
    id: 'compiling-map',
    label: 'Compilando cartografía',
    detail: 'Sector, capas base y marcas de hallazgos',
    icon: Map,
  },
  {
    id: 'attaching-evidence',
    label: 'Adjuntando evidencias',
    detail: 'Capturas A/B y miniaturas de respaldo',
    icon: Images,
  },
  {
    id: 'rendering-tables',
    label: 'Componiendo catastro',
    detail: 'Tabla de incidencias, severidades y estados',
    icon: Table2,
  },
  {
    id: 'generating-pdf',
    label: 'Renderizando PDF',
    detail: 'Membrete, firmas y numeración del informe',
    icon: FileText,
  },
];

interface GenerationModalProps {
  open: boolean;
  stage: ReportStage;
  progress: number;
  report: GeneratedReport | null;
  onClose: () => void;
  onDownload: () => void;
  onNewReport: () => void;
}

export const GenerationModal = ({
  open,
  stage,
  progress,
  report,
  onClose,
  onDownload,
  onNewReport,
}: GenerationModalProps) => {
  const done = stage === 'done';
  const activeIndex = STAGES.findIndex((item) => item.id === stage);

  return (
    <Modal
      open={open}
      onClose={done ? onClose : () => undefined}
      hideClose={!done}
      className="max-w-xl"
      eyebrow={done ? 'Proceso completado' : 'Generación en curso'}
      title={done ? 'Reporte generado' : 'Compilando informe ejecutivo'}
    >
      {!done ? (
        <div className="p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Progreso de compilación
              </p>
              <p className="mt-1 text-5xl font-black leading-none tracking-tighter text-[#002855]">
                {Math.round(progress)}
                <span className="text-xl text-blue-500">%</span>
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center border border-slate-200 bg-slate-50">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden bg-slate-100">
            <motion.div
              className="h-full bg-gradient-to-r from-[#002855] via-blue-600 to-[#ffd700]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="mt-7 space-y-2">
            {STAGES.map((item, index) => {
              const Icon = item.icon;
              const completed = activeIndex > index || done;
              const active = activeIndex === index;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 border px-3 py-3 transition-colors',
                    active
                      ? 'border-blue-200 bg-blue-50'
                      : completed
                        ? 'border-emerald-100 bg-emerald-50/60'
                        : 'border-slate-100 bg-white',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center border',
                      completed
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                        : active
                          ? 'border-blue-200 bg-blue-600 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-400',
                    )}
                  >
                    {completed ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-[10px] font-black uppercase tracking-wider',
                        completed
                          ? 'text-emerald-800'
                          : active
                            ? 'text-[#002855]'
                            : 'text-slate-400',
                      )}
                    >
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                      {item.detail}
                    </p>
                  </div>
                  {completed && (
                    <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-emerald-600">
                      OK
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-5 border-l-2 border-blue-300 bg-slate-50 px-3 py-2 text-[9px] font-medium leading-relaxed text-slate-500">
            El procesamiento se ejecuta en el navegador para esta demostración. En
            producción, el backend ASP.NET Core compilará el PDF con QuestPDF y
            devolverá el archivo desde <span className="font-mono">/api/v1/reportes/</span>.
          </p>
        </div>
      ) : (
        <div className="p-6 md:p-8">
          <div className="flex flex-col items-center text-center">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 16, stiffness: 200 }}
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-600"
            >
              <CheckCircle2 className="h-10 w-10" />
            </motion.span>
            <h3 className="mt-4 text-2xl font-black uppercase leading-none tracking-tighter text-[#002855]">
              Informe listo
            </h3>
            <p className="mt-2 max-w-sm text-xs font-medium leading-relaxed text-slate-500">
              El documento fue compilado y guardado en el historial local del
              prototipo. Puedes descargarlo en formato PDF.
            </p>
          </div>

          <div className="mt-6 border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center bg-red-50 text-red-600">
                  <FileDown className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-wider text-[#002855]">
                    {report?.fileName}
                  </p>
                  <p className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-slate-400">
                    {report?.numero} · PDF · {report?.sizeKb ?? 0} KB
                  </p>
                </div>
              </div>
              <span className="shrink-0 bg-emerald-50 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-700">
                Listo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-px bg-slate-200">
              {[
                { label: 'Sector', value: report?.sector ?? '—' },
                { label: 'Hallazgos', value: String(report?.totalIncidencias ?? 0) },
                {
                  label: 'Emitido',
                  value: report ? formatDateTime(report.createdAt) : '—',
                },
              ].map((item) => (
                <div key={item.label} className="bg-white px-3 py-2.5">
                  <p className="text-[7px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[9px] font-bold leading-snug text-[#002855]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center justify-center gap-2 bg-[#003385] px-4 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#002a66]"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
            <button
              type="button"
              onClick={onNewReport}
              className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-slate-300 hover:text-[#002855]"
            >
              <RotateCcw className="h-4 w-4" />
              Nuevo reporte
            </button>
          </div>

          <p className="mt-4 text-center text-[8px] font-medium leading-relaxed text-slate-400">
            La descarga usa la impresión del navegador (Guardar como PDF). El informe
            se imprimirá en tamaño A4, sin encabezados ni pies del navegador.
          </p>
        </div>
      )}
    </Modal>
  );
};
