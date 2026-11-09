import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/utils/format';

interface PageHeaderProps {
  eyebrow?: string;
  code?: string;
  title: string;
  accent?: string;
  description?: string;
  image?: string;
  carouselImages?: string[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const HeaderCarousel = ({ images }: { images: string[] }) => {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, duration: 30 },
    [Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: false })],
  );

  return (
    <div
      ref={emblaRef}
      className="absolute inset-0 overflow-hidden opacity-[0.32]"
      aria-hidden="true"
    >
      <div className="flex h-full">
        {images.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="relative h-full min-w-full"
          >
            <img src={src} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageHeader = ({
  eyebrow,
  code,
  title,
  accent,
  description,
  image = '/mock/aerial-patio-sur-b.svg',
  carouselImages,
  actions,
  children,
  className,
}: PageHeaderProps) => (
  <section
    className={cn(
      'relative overflow-hidden border-b border-white/10 bg-[#001a35] text-white',
      className,
    )}
  >
    {carouselImages && carouselImages.length > 0 ? (
      <HeaderCarousel images={carouselImages} />
    ) : (
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.22]"
        style={{ backgroundImage: `url('${image}')` }}
        aria-hidden="true"
      />
    )}
    <div
      className="absolute inset-0 bg-gradient-to-r from-[#001a35] via-[#001a35]/88 to-[#002855]/55"
      aria-hidden="true"
    />
    <div className="blueprint-grid absolute inset-0 opacity-40" aria-hidden="true" />
    <div
      className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
      aria-hidden="true"
    />

    <div className="relative mx-auto w-full max-w-[1500px] px-5 pb-9 pt-24 md:px-8 md:pb-12 md:pt-28">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="max-w-4xl"
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {eyebrow && (
              <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-blue-300">
                <span className="h-px w-8 bg-blue-400/70" />
                {eyebrow}
              </span>
            )}
            {code && (
              <span className="border border-white/15 bg-white/5 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white/55">
                {code}
              </span>
            )}
          </div>

          <h1 className="text-balance text-4xl font-black uppercase leading-[0.88] tracking-tighter md:text-6xl">
            {title}{' '}
            {accent && <span className="text-blue-400">{accent}</span>}
          </h1>

          {description && (
            <p className="mt-5 max-w-2xl text-xs font-medium leading-relaxed text-blue-100/60 md:text-sm">
              {description}
            </p>
          )}
        </motion.div>

        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="flex shrink-0 flex-wrap items-center gap-3"
          >
            {actions}
          </motion.div>
        )}
      </div>

      {children && <div className="mt-8">{children}</div>}
    </div>
  </section>
);
