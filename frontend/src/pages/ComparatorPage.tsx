import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileDown,
  FilePlus2,
  Image as ImageIcon,
  MapPin,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { CurtainComparator } from '@/components/CurtainComparator';
import { CAPTURES, SECTORS, getSector } from '@/mocks/data';
import type { Capture, SectorId } from '@/types';
import { cn, formatDateShort } from '@/utils/format';
import { saveComparisonSelection } from '@/utils/reportStorage';

const HEADER_IMAGES = CAPTURES.filter((capture) =>
  capture.id.endsWith('-b'),
).map((capture) => capture.src);

const PLACE_BUTTON =
  'flex w-full items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-4 py-3.5 text-left outline-none transition-all focus:border-[#002855] focus:bg-white focus:ring-2 focus:ring-blue-100';

const DATE_INPUT =
  'w-full border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-[#002855] focus:bg-white focus:ring-2 focus:ring-blue-100';

interface PlaceSelectProps {
  value: SectorId | '';
  onChange: (value: SectorId | '') => void;
}

const PlaceSelect = ({ value, onChange }: PlaceSelectProps) => {
  const [open, setOpen] = useState(false);
  const selected = value ? getSector(value) : undefined;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={PLACE_BUTTON}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <span
            className={cn(
              'truncate text-sm',
              selected
                ? 'font-semibold text-slate-800'
                : 'font-medium text-slate-400',
            )}
          >
            {selected?.nombre ?? 'Selecciona un lugar'}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Cerrar lista de lugares"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <motion.ul
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: 0.16 }}
              role="listbox"
              aria-label="Lugares"
              className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-2xl"
            >
              {SECTORS.map((sector) => {
                const active = sector.id === value;
                return (
                  <li key={sector.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(sector.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                        active
                          ? 'bg-[#002855] text-white'
                          : 'text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: sector.color }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-black uppercase tracking-wide">
                          {sector.nombre}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 block font-mono text-[8px] uppercase tracking-wider',
                            active ? 'text-blue-200/70' : 'text-slate-400',
                          )}
                        >
                          {sector.superficie}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CaptureSlotProps {
  slot: 'A' | 'B';
  label: string;
  date: string;
  onChange: (value: string) => void;
  capture?: Capture;
  enabled: boolean;
  min?: string;
  max?: string;
}

const CaptureSlot = ({
  slot,
  label,
  date,
  onChange,
  capture,
  enabled,
  min,
  max,
}: CaptureSlotProps) => (
  <article className="overflow-hidden border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid h-6 w-6 place-items-center text-[10px] font-black',
            slot === 'A'
              ? 'bg-blue-600 text-white'
              : 'bg-[#ffd700] text-[#001a35]',
          )}
        >
          {slot}
        </span>
        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
      </div>
    </header>

    <div className="border-b border-slate-100 p-3">
      <input
        type="date"
        value={date}
        min={min}
        max={max}
        disabled={!enabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Seleccionar ${label.toLowerCase()} de la comparación`}
        className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#002855] focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>

    <div className="relative h-48 bg-slate-50 sm:h-56 lg:h-64">
      {capture ? (
        <img
          src={capture.src}
          alt={`Captura ${slot}, ${formatDateShort(capture.fecha)}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-2 flex items-center justify-center border border-dashed border-slate-200 bg-slate-50/70">
          <ImageIcon className="h-6 w-6 text-slate-300" />
        </div>
      )}
    </div>
  </article>
);

const ComparisonPrint = ({
  sectorName,
  captureA,
  captureB,
}: {
  sectorName: string;
  captureA: Capture;
  captureB: Capture;
}) => (
  <div
    id="comparison-print-area"
    className="comparison-print print-exact bg-white p-[14mm] text-slate-900"
  >
    <header className="flex items-start justify-between gap-6 border-b-4 border-[#002855] pb-4">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-blue-700">
          EPA WebGIS
        </p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-tighter text-[#002855]">
          Comparación temporal
        </h1>
      </div>
      <div className="text-right">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          {sectorName}
        </p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-400">
          {formatDateShort(captureA.fecha)} — {formatDateShort(captureB.fecha)}
        </p>
      </div>
    </header>

    <div className="mt-6 grid grid-cols-2 gap-4">
      {[
        { capture: captureA, label: 'A', hint: 'Fecha anterior' },
        { capture: captureB, label: 'B', hint: 'Fecha posterior' },
      ].map(({ capture, label, hint }) => (
        <figure key={label} className="border border-slate-200">
          <div className="relative aspect-[16/9]">
            <img
              src={capture.src}
              alt={`Captura ${label}`}
              className="h-full w-full object-cover"
            />
            <span
              className={cn(
                'absolute left-2 top-2 grid h-5 w-5 place-items-center text-[8px] font-black',
                label === 'A'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#ffd700] text-[#001a35]',
              )}
            >
              {label}
            </span>
          </div>
          <figcaption className="flex items-center justify-between gap-2 px-2 py-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              {hint}
            </span>
            <span className="font-mono text-[8px] font-bold text-slate-500">
              {formatDateShort(capture.fecha)}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>

    <footer className="mt-8 border-t border-slate-200 pt-3 text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">
      Documento generado desde el prototipo EPA WebGIS
    </footer>
  </div>
);

export const ComparatorPage = () => {
  const navigate = useNavigate();

  const [sectorId, setSectorId] = useState<SectorId | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [captureADate, setCaptureADate] = useState('');
  const [captureBDate, setCaptureBDate] = useState('');

  const sector = sectorId ? getSector(sectorId) : undefined;
  const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);
  const datesComplete = Boolean(fromDate && toDate && !rangeInvalid);
  const baseReady = Boolean(sectorId && datesComplete);

  const sectorCaptures = useMemo(
    () =>
      sectorId
        ? CAPTURES.filter((capture) => capture.sectorId === sectorId)
        : [],
    [sectorId],
  );

  const buildCapture = (
    variant: 'A' | 'B',
    date: string,
  ): Capture | undefined => {
    if (!sectorId || !date || sectorCaptures.length === 0) return undefined;
    const base =
      (variant === 'A' ? sectorCaptures[0] : sectorCaptures[1]) ??
      sectorCaptures[0];

    return {
      ...base,
      id: `${variant}-${date}`,
      fecha: date,
      archivo: `${sectorId}_${variant}_${date}.JPG`,
    };
  };

  const captureA = buildCapture('A', captureADate);
  const captureB = buildCapture('B', captureBDate);

  const comparison =
    captureA && captureB && captureADate < captureBDate
      ? { captureA, captureB }
      : null;

  const changeSector = (value: SectorId | '') => {
    setSectorId(value);
    setCaptureADate('');
    setCaptureBDate('');
  };

  const changeFromDate = (value: string) => {
    setFromDate(value);
    setCaptureADate('');
    setCaptureBDate('');
  };

  const changeToDate = (value: string) => {
    setToDate(value);
    setCaptureADate('');
    setCaptureBDate('');
  };

  const changeADate = (value: string) => {
    setCaptureADate(value);
    if (value && captureBDate && value >= captureBDate) {
      setCaptureBDate('');
    }
  };

  const changeBDate = (value: string) => {
    setCaptureBDate(value);
    if (value && captureADate && value <= captureADate) {
      setCaptureADate('');
    }
  };

  const includeInReport = () => {
    if (!comparison || !sectorId || sectorCaptures.length === 0) return;
    saveComparisonSelection({
      sectorId,
      captureAId: sectorCaptures[0].id,
      captureBId: (sectorCaptures[1] ?? sectorCaptures[0]).id,
      captureADate,
      captureBDate,
    });
    navigate('/reportes/nuevo', { state: { fromComparator: true } });
  };

  return (
    <>
      <PageHeader
        title="Comparador"
        accent="temporal"
        description="Selecciona un lugar y un rango de fechas para contrastar dos capturas del mismo sector y revisar los cambios."
        carouselImages={HEADER_IMAGES}
      />

      <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-7 md:px-8 md:py-9">
        <section className="border border-slate-200 bg-white shadow-xl">
          <header className="flex items-center gap-4 border-b border-slate-200 px-4 py-4 md:px-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#002855] text-sm font-black text-white">
              01
            </span>
            <h2 className="text-xl font-black uppercase leading-none tracking-tighter text-[#002855] md:text-2xl">
              Escoge lugar y fecha
            </h2>
          </header>

          <div className="space-y-5 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <MapPin className="h-3 w-3 text-slate-300" />
                  Lugar
                </span>
                <PlaceSelect value={sectorId} onChange={changeSector} />
              </div>

              <div>
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  <CalendarDays className="h-3 w-3 text-slate-300" />
                  Rango de fechas
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      Desde
                    </span>
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(event) => changeFromDate(event.target.value)}
                      className={DATE_INPUT}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[8px] font-bold uppercase tracking-wider text-slate-400">
                      Hasta
                    </span>
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(event) => changeToDate(event.target.value)}
                      className={DATE_INPUT}
                    />
                  </label>
                </div>
                {rangeInvalid && (
                  <p className="mt-2 text-[9px] font-medium text-red-600">
                    La fecha desde debe ser anterior a la fecha hasta.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <CaptureSlot
                slot="A"
                label="Fecha anterior"
                date={captureADate}
                onChange={changeADate}
                capture={captureA}
                enabled={baseReady}
                min={fromDate || undefined}
                max={captureBDate || toDate || undefined}
              />
              <CaptureSlot
                slot="B"
                label="Fecha posterior"
                date={captureBDate}
                onChange={changeBDate}
                capture={captureB}
                enabled={baseReady}
                min={captureADate || fromDate || undefined}
                max={toDate || undefined}
              />
            </div>
          </div>
        </section>

        {comparison && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-3"
          >
            <div className="border border-white/10 bg-[#001a35] p-2 shadow-2xl md:p-3">
              <CurtainComparator
                key={`${comparison.captureA.id}-${comparison.captureB.id}`}
                captureA={comparison.captureA}
                captureB={comparison.captureB}
              />
            </div>

            <div className="grid gap-2 border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3">
              <button
                type="button"
                onClick={includeInReport}
                className="flex items-center justify-center gap-2 bg-[#003385] px-4 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#002a66]"
              >
                <FilePlus2 className="h-4 w-4" />
                Ingresar en reporte
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 transition-colors hover:border-slate-300 hover:text-[#002855]"
              >
                <FileDown className="h-4 w-4" />
                Exportar incidencia a PDF
              </button>
              <button
                type="button"
                onClick={() => navigate('/reportes/nuevo')}
                className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 transition-colors hover:border-slate-300 hover:text-[#002855]"
              >
                <ClipboardList className="h-4 w-4" />
                Ir a reportes
              </button>
            </div>
          </motion.section>
        )}
      </div>

      {comparison && (
        <ComparisonPrint
          sectorName={sector?.nombre ?? 'Sector EPA'}
          captureA={comparison.captureA}
          captureB={comparison.captureB}
        />
      )}
    </>
  );
};
