import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, MapPinned } from 'lucide-react';
import { Brand } from '@/components/Brand';

export const NotFoundPage = () => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#001a35] px-5 py-16 text-white">
    <div
      className="absolute inset-0 bg-cover bg-center opacity-20"
      style={{ backgroundImage: "url('/mock/aerial-zeap-c-b.svg')" }}
      aria-hidden="true"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-[#001a35]/70 via-[#001a35]/85 to-[#001a35]" />
    <div className="blueprint-grid absolute inset-0 opacity-30" aria-hidden="true" />

    <div className="relative w-full max-w-2xl text-center">
      <div className="mb-8 flex justify-center">
        <Brand tone="light" size="md" />
      </div>

      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-blue-300">
        Error 404 · Fuera de cobertura
      </p>
      <h1 className="mt-3 text-7xl font-black leading-none tracking-tighter md:text-9xl">
        4<span className="text-blue-400">0</span>4
      </h1>
      <p className="mx-auto mt-5 max-w-md text-sm font-medium leading-relaxed text-blue-100/55">
        La ruta solicitada no forma parte de este prototipo. Vuelve al acceso
        institucional o continúa en el comparador temporal.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 bg-white px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#002855] transition-colors hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Ir al login
        </Link>
        <Link
          to="/comparador"
          className="flex items-center justify-center gap-2 border border-white/15 bg-white/5 px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/10"
        >
          <Compass className="h-4 w-4 text-blue-400" />
          Abrir comparador
        </Link>
      </div>

      <p className="mt-10 flex items-center justify-center gap-2 font-mono text-[8px] uppercase tracking-[0.24em] text-white/30">
        <MapPinned className="h-3 w-3" />
        EPA WebGIS · Puerto de Arica · ZEAP
      </p>
    </div>
  </div>
);
