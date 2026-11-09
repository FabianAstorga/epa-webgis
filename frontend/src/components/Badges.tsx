import {
  AlertTriangle,
  Construction,
  Lightbulb,
  Trash2,
  Truck,
} from 'lucide-react';
import type {
  IncidentCategory,
  IncidentStatus,
  Severity,
} from '@/types';
import { cn } from '@/utils/format';

export const StatusBadge = ({
  status,
  className,
}: {
  status: IncidentStatus;
  className?: string;
}) => {
  const map: Record<IncidentStatus, string> = {
    Pendiente: 'bg-red-50 text-red-700 border-red-200',
    'En Gestión': 'bg-amber-50 text-amber-800 border-amber-200',
    Resuelto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const dot: Record<IncidentStatus, string> = {
    Pendiente: 'bg-red-500',
    'En Gestión': 'bg-amber-500',
    Resuelto: 'bg-emerald-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] font-black uppercase tracking-widest',
        map[status],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot[status])} />
      {status}
    </span>
  );
};

export const SeverityBadge = ({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) => {
  const map: Record<Severity, string> = {
    Alta: 'bg-[#002855] text-white border-[#002855]',
    Media: 'bg-slate-100 text-slate-700 border-slate-200',
    Baja: 'bg-white text-slate-500 border-slate-200',
  };
  return (
    <span
      className={cn(
        'inline-flex border px-2 py-1 text-[9px] font-black uppercase tracking-widest',
        map[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
};

export const CategoryIcon = ({
  category,
  className,
}: {
  category: IncidentCategory;
  className?: string;
}) => {
  const icons = {
    Congestión: Truck,
    'Daño de pavimento': Construction,
    Residuos: Trash2,
    Luminaria: Lightbulb,
    Otro: AlertTriangle,
  } as const;
  const Icon = icons[category];
  return <Icon className={cn('h-3.5 w-3.5', className)} />;
};

export const CategoryBadge = ({
  category,
  className,
}: {
  category: IncidentCategory;
  className?: string;
}) => {
  const map: Record<IncidentCategory, string> = {
    Congestión: 'bg-blue-50 text-blue-700 border-blue-200',
    'Daño de pavimento': 'bg-amber-50 text-amber-800 border-amber-200',
    Residuos: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Luminaria: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    Otro: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] font-black uppercase tracking-wider',
        map[category],
        className,
      )}
    >
      <CategoryIcon category={category} />
      {category}
    </span>
  );
};

export const DemoBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-yellow-300',
      className,
    )}
  >
    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
    Modo demo · sin backend
  </span>
);
