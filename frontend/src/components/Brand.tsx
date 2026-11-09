import { cn } from '@/utils/format';

interface BrandProps {
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

const SIZES = {
  sm: { box: 'h-9 w-9', title: 'text-base', sub: 'text-[7px]' },
  md: { box: 'h-11 w-11', title: 'text-xl', sub: 'text-[8px]' },
  lg: { box: 'h-14 w-14', title: 'text-2xl', sub: 'text-[9px]' },
};

/** Identidad propia del prototipo: sin logos ni material de terceros. */
export const Brand = ({
  tone = 'light',
  size = 'md',
  showSubtitle = true,
  className,
}: BrandProps) => {
  const s = SIZES[size];
  const isLight = tone === 'light';

  return (
    <div className={cn('flex items-center gap-3 select-none', className)}>
      <div
        className={cn(
          'relative grid shrink-0 place-items-center overflow-hidden border shadow-lg',
          s.box,
          isLight ? 'border-white/20' : 'border-[#002855]/15',
        )}
        style={{ backgroundColor: '#001a35' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <rect width="64" height="64" fill="#001a35" />
          <rect x="0" y="52" width="64" height="12" fill="#003385" />
          <path
            d="M14 14v32M14 17h30l-5 6H14"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
          />
          <path d="M41 23v9" stroke="#93c5fd" strokeWidth="2.5" />
          <circle cx="41" cy="35" r="3" fill="none" stroke="#ffd700" strokeWidth="2.5" />
          <rect x="12" y="42" width="12" height="5" fill="#ffffff" />
          <rect x="27" y="42" width="12" height="5" fill="#93c5fd" />
          <rect x="20" y="49" width="20" height="5" fill="#ffd700" />
        </svg>
      </div>

      <div className="min-w-0 leading-none">
        <div
          className={cn(
            'flex items-baseline gap-1.5 font-black uppercase tracking-tighter',
            s.title,
            isLight ? 'text-white' : 'text-[#002855]',
          )}
        >
          EPA
          <span className={isLight ? 'text-blue-300' : 'text-blue-600'}>WebGIS</span>
        </div>
        {showSubtitle && (
          <p
            className={cn(
              'mt-1 font-bold uppercase tracking-[0.22em]',
              s.sub,
              isLight ? 'text-white/45' : 'text-slate-400',
            )}
          >
            Empresa Portuaria Arica
          </p>
        )}
      </div>
    </div>
  );
};
