import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { CAPTURES, getSector } from '@/mocks/data';
import type { Role } from '@/types';
import { cn } from '@/utils/format';
import { ui } from '@/utils/SwalService';

const SLIDES = CAPTURES.filter((capture) => capture.id.endsWith('-b')).map(
  (capture) => ({
    capture,
    sector: getSector(capture.sectorId),
  }),
);

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const TIME_FORMATTER = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const INPUT =
  'w-full border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-[#002855] focus:bg-white focus:ring-2 focus:ring-blue-100';

type Mode = 'login' | 'recover';

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [demoCode, setDemoCode] = useState('');

  const emailRef = useRef<HTMLInputElement>(null);
  const recoveryEmailRef = useRef<HTMLInputElement>(null);

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname ?? '/comparador';
  }, [location.state]);

  const dateLabel = useMemo(
    () => DATE_FORMATTER.format(now).toUpperCase(),
    [now],
  );
  const timeLabel = useMemo(() => TIME_FORMATTER.format(now), [now]);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoginOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLoginOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    if (mode === 'login') {
      emailRef.current?.focus();
    } else {
      recoveryEmailRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isLoginOpen, mode]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', duration: 28 },
    [Autoplay({ delay: 6500, stopOnInteraction: false, stopOnMouseEnter: false })],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect).on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const slide = SLIDES[selectedIndex] ?? SLIDES[0];

  const closeLogin = () => {
    setIsLoginOpen(false);
    setMode('login');
    setError(null);
    setRecoverySent(false);
    setRecoveryCode('');
    setNewPassword('');
  };

  const toggleLogin = () => {
    if (isLoginOpen) closeLogin();
    else {
      setError(null);
      setIsLoginOpen(true);
    }
  };

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({
        email: email.trim(),
        password,
        rol: 'Operador' as Role,
      });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setMode('login');
    setError(null);
    setRecoverySent(false);
    setRecoveryCode('');
    setNewPassword('');
  };

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authService.requestPasswordReset(email);
      setRecoverySent(true);
      setDemoCode(result.demoCode ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible enviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authService.confirmPasswordReset({
        email,
        code: recoveryCode,
        newPassword,
      });
      ui.exito('Contraseña actualizada', 'Ya puedes ingresar con tu nueva contraseña.');
      handleBackToLogin();
      setPassword('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No fue posible actualizar la contraseña.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#001a35] text-white">
      {/* Fondo: carrusel de capturas aéreas, sin controles ni textos extra */}
      <div className="absolute inset-0 z-0" ref={emblaRef} aria-hidden="true">
        <div className="flex h-full">
          {SLIDES.map(({ capture }) => (
            <div key={capture.id} className="relative h-screen min-w-full">
              <img
                src={capture.src}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-[#001a35]/15" />
            </div>
          ))}
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-3/5 bg-gradient-to-t from-[#001a35] via-[#001a35]/55 to-transparent"
        aria-hidden="true"
      />
      <div
        className="blueprint-grid pointer-events-none absolute inset-0 z-[2] opacity-10"
        aria-hidden="true"
      />

      {!isLoginOpen && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-30 h-40 bg-gradient-to-b from-[#001a35]/80 to-transparent"
          aria-hidden="true"
        />
      )}

      {/* Cabezal: marca a la izquierda, acceso/cierre a la derecha */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-5 py-5 md:px-8">
          <Brand
            tone={isLoginOpen ? 'dark' : 'light'}
            size="md"
            showSubtitle={false}
          />

          <button
            type="button"
            onClick={toggleLogin}
            aria-expanded={isLoginOpen}
            aria-controls="login-panel"
            className={cn(
              'flex items-center gap-2 border px-4 py-2.5 text-xs font-bold transition-all',
              isLoginOpen
                ? 'border-[#002855]/15 bg-[#002855] text-white hover:bg-[#001a35]'
                : 'border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20',
            )}
          >
            {isLoginOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            {isLoginOpen ? 'Cerrar' : 'Acceder'}
          </button>
        </div>
      </header>

      {/* Pantalla principal: solo título, sector y fecha/hora */}
      <main
        aria-hidden={isLoginOpen}
        className="relative z-10 flex min-h-screen items-end px-5 pb-8 pt-32 md:px-8 md:pb-12"
      >
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="max-w-4xl"
          >
            <div className="mb-5 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.28em] text-white/55">
              <span className="h-1.5 w-1.5 bg-blue-400" />
              Sector en pantalla
              <span className="text-white/25">/</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={slide.capture.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/90"
                >
                  {slide.sector?.nombre ?? 'Sector EPA'}
                </motion.span>
              </AnimatePresence>
            </div>

            <h1 className="text-balance text-4xl font-black uppercase leading-[0.9] tracking-tighter text-white sm:text-6xl lg:text-7xl">
              Monitoreo e
              <br />
              inspección
              <br />
              <span className="text-blue-400">geoespacial</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
            className="shrink-0 text-left md:text-right"
          >
            <p className="font-mono text-3xl font-black leading-none tracking-tighter text-white tabular-nums md:text-5xl">
              {timeLabel}
            </p>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.28em] text-white/55">
              {dateLabel}
            </p>
          </motion.div>
        </div>
      </main>

      {/* Slider lateral de acceso: ocupa toda la pantalla */}
      <AnimatePresence>
        {isLoginOpen && (
          <motion.div
            id="login-panel"
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'login' ? 'Iniciar sesión' : 'Recuperar acceso'}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="fixed inset-0 z-40 overflow-y-auto bg-white"
          >
            <div
              className="dot-grid pointer-events-none absolute inset-0 opacity-40"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,#eff6ff,transparent_46%)]"
              aria-hidden="true"
            />

            <div className="relative flex min-h-full items-center justify-center px-5 pb-12 pt-28">
              <div className="w-full max-w-sm">
                <AnimatePresence mode="wait">
                  {mode === 'login' ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h2 className="text-3xl font-black tracking-tighter text-[#002855] md:text-4xl">
                        Iniciar sesión
                      </h2>

                      <form onSubmit={handleLogin} className="mt-8 space-y-4">
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            ref={emailRef}
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="Correo electrónico"
                            aria-label="Correo electrónico"
                            className={INPUT}
                            required
                          />
                        </div>

                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Contraseña"
                            aria-label="Contraseña"
                            className={cn(INPUT, 'pr-11')}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-[#002855]"
                            aria-label={
                              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        <AnimatePresence>
                          {error && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              role="alert"
                              className="text-sm font-medium leading-relaxed text-red-600"
                            >
                              {error}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        <button
                          type="submit"
                          disabled={loading}
                          className="flex w-full items-center justify-center gap-2 bg-[#003385] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#002a66] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Ingresar'
                          )}
                        </button>

                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setMode('recover');
                              setError(null);
                            }}
                            className="text-sm font-medium text-slate-500 transition-colors hover:text-[#002855]"
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="recover"
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h2 className="text-3xl font-black tracking-tighter text-[#002855] md:text-4xl">
                        Recuperar acceso
                      </h2>

                      {!recoverySent ? (
                        <form onSubmit={handleSendCode} className="mt-8 space-y-4">
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              ref={recoveryEmailRef}
                              type="email"
                              autoComplete="email"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              placeholder="Correo electrónico"
                              aria-label="Correo electrónico"
                              className={INPUT}
                              required
                            />
                          </div>

                          <AnimatePresence>
                            {error && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                role="alert"
                                className="text-sm font-medium leading-relaxed text-red-600"
                              >
                                {error}
                              </motion.p>
                            )}
                          </AnimatePresence>

                          <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 bg-[#003385] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#002a66] disabled:opacity-60"
                          >
                            {loading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Enviar código'
                            )}
                          </button>

                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={handleBackToLogin}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#002855]"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                              Volver
                            </button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleRecovery} className="mt-8 space-y-4">
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={recoveryCode}
                              onChange={(event) => setRecoveryCode(event.target.value)}
                              placeholder="Código de verificación"
                              aria-label="Código de verificación"
                              className={INPUT}
                              required
                            />
                          </div>

                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(event) => setNewPassword(event.target.value)}
                              placeholder="Nueva contraseña"
                              aria-label="Nueva contraseña"
                              className={INPUT}
                              required
                            />
                          </div>

                          {demoCode && (
                            <p className="text-xs font-medium text-slate-400">
                              Código demo:{' '}
                              <span className="font-mono font-bold text-[#002855]">
                                {demoCode}
                              </span>
                            </p>
                          )}

                          <AnimatePresence>
                            {error && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                role="alert"
                                className="text-sm font-medium leading-relaxed text-red-600"
                              >
                                {error}
                              </motion.p>
                            )}
                          </AnimatePresence>

                          <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 bg-[#003385] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#002a66] disabled:opacity-60"
                          >
                            {loading ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              'Actualizar contraseña'
                            )}
                          </button>

                          <div className="pt-2 text-center">
                            <button
                              type="button"
                              onClick={handleBackToLogin}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#002855]"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                              Volver
                            </button>
                          </div>
                        </form>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
