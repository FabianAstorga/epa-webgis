import { Check, Eye, FileText, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/format';

export type ReportStep = 1 | 2 | 3;

const STEPS = [
  {
    id: 1 as ReportStep,
    label: 'Datos del informe',
    hint: 'Metadatos y período',
    icon: FileText,
  },
  {
    id: 2 as ReportStep,
    label: 'Selección de hallazgos',
    hint: 'Incidencias y evidencias',
    icon: ListChecks,
  },
  {
    id: 3 as ReportStep,
    label: 'Vista previa',
    hint: 'Documento A4 y PDF',
    icon: Eye,
  },
];

export const ReportStepper = ({
  current,
  onStepClick,
}: {
  current: ReportStep;
  onStepClick: (step: ReportStep) => void;
}) => (
  <div className="border border-slate-200 bg-white shadow-sm">
    <div className="grid grid-cols-1 sm:grid-cols-3">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const active = step.id === current;
        const completed = step.id < current;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick(step.id)}
            className={cn(
              'relative flex items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors sm:border-b-0 sm:border-r sm:last:border-r-0',
              active
                ? 'bg-[#002855] text-white'
                : completed
                  ? 'bg-emerald-50/50 text-slate-700 hover:bg-emerald-50'
                  : 'bg-white text-slate-400 hover:bg-slate-50',
            )}
            aria-current={active ? 'step' : undefined}
          >
            {active && (
              <motion.span
                layoutId="report-step-bar"
                className="absolute inset-x-0 top-0 h-1 bg-[#ffd700]"
                transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              />
            )}

            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center border text-[10px] font-black',
                active
                  ? 'border-white/20 bg-white/10 text-white'
                  : completed
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400',
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>

            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-mono text-[8px] font-bold uppercase tracking-widest',
                    active ? 'text-blue-300' : 'text-slate-300',
                  )}
                >
                  0{index + 1}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-black uppercase tracking-wider',
                    active ? 'text-white' : completed ? 'text-[#002855]' : '',
                  )}
                >
                  {step.label}
                </span>
              </span>
              <span
                className={cn(
                  'mt-0.5 block text-[8px] font-bold uppercase tracking-wide',
                  active ? 'text-blue-200/60' : 'text-slate-400',
                )}
              >
                {step.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
