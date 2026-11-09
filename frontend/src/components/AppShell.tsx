import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Columns2,
  FilePlus2,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { Brand } from './Brand';
import { DemoBadge } from './Badges';
import { useAuth } from '@/context/AuthContext';
import { ui } from '@/utils/SwalService';
import { cn, roleLabel } from '@/utils/format';

const NAV_ITEMS = [
  {
    id: 'comparador',
    label: 'Comparador',
    path: '/comparador',
    code: 'RF-06',
    icon: Columns2,
  },
  {
    id: 'reportes',
    label: 'Nuevo reporte',
    path: '/reportes/nuevo',
    code: 'RF-09',
    icon: FilePlus2,
  },
];

export const AppShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    const confirmed = await ui.confirmar(
      'Cerrar sesión',
      'Se eliminará la sesión local del prototipo. Los borradores guardados se conservarán.',
    );
    if (!confirmed) return;
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="fixed inset-x-0 top-0 z-[100] h-16">
        <div className="absolute inset-0 rounded-b-2xl border-b border-white/5 bg-[#001a35]/92 backdrop-blur-md" />
        <div
          className="absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex h-full w-full max-w-[1500px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex h-full items-center gap-6">
            <button
              type="button"
              onClick={() => navigate('/comparador')}
              className="shrink-0"
              aria-label="Ir al comparador"
            >
              <Brand tone="light" size="sm" />
            </button>

            <nav className="ml-1 hidden h-12 items-center gap-1 rounded-2xl border border-white/5 bg-white/[0.04] p-1 lg:flex">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={cn(
                      'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors',
                      active
                        ? 'text-white'
                        : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="epa-nav-pill"
                        className="absolute inset-0 rounded-xl border border-white/10 bg-[#000b17] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      <Icon
                        className={cn('h-3.5 w-3.5', active ? 'text-blue-400' : '')}
                      />
                      {item.label}
                      <span className="hidden font-mono text-[8px] text-white/25 xl:inline">
                        {item.code}
                      </span>
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden xl:block">
              <DemoBadge />
            </div>

            <div className="hidden items-center gap-3 border-l border-white/10 pl-4 md:flex">
              <div className="leading-none">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                  {user?.nombre ?? 'Invitado'}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.16em] text-blue-300/70">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  {roleLabel(user?.rol)} · EPA
                </p>
              </div>
            </div>

            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white/60 transition-colors hover:border-white/20 hover:text-white"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                Cuenta
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    menuOpen && 'rotate-180',
                  )}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                    role="menu"
                  >
                    <div className="border-b border-slate-100 px-3 py-3">
                      <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <UserRound className="h-3 w-3" /> Sesión activa
                      </p>
                      <p className="mt-2 text-xs font-black uppercase tracking-tight text-[#002855]">
                        {user?.nombre}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                        {user?.email}
                      </p>
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {user?.unidad}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 transition-colors hover:bg-red-50"
                      role="menuitem"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Cerrar sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute inset-x-0 top-16 rounded-b-2xl border-b border-white/10 bg-[#001a35] p-4 shadow-2xl lg:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <DemoBadge />
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-300">
                  {roleLabel(user?.rol)}
                </span>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate(item.path);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest',
                        active
                          ? 'border-white/10 bg-[#000b17] text-white'
                          : 'border-transparent text-white/60 hover:bg-white/[0.04]',
                      )}
                    >
                      <Icon className="h-4 w-4 text-blue-400" />
                      {item.label}
                      <span className="ml-auto font-mono text-[8px] text-white/30">
                        {item.code}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex w-full items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="min-h-screen">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col items-start justify-between gap-2 px-5 py-5 md:flex-row md:items-center md:px-8">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
            Empresa Portuaria Arica · Gerencia de TI y Ciberseguridad
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
            Prototipo WebGIS · Parte 2 · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};
