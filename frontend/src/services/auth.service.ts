import type { AuthSession, Role, SessionUser } from '@/types';
import { http, sleep, TOKEN_KEY, USER_KEY, USE_MOCK } from './http';

/**
 * Contrato previsto con ASP.NET Core:
 *   POST /api/auth/login              { email, password } -> { token, user }
 *   POST /api/auth/recover/request    { email }            -> 202
 *   POST /api/auth/recover/confirm    { email, code, newPassword } -> 204
 *
 * Mientras el backend no exista, cualquier correo con una contraseña de 4+
 * caracteres inicia sesión en modo demostración.
 */

const DEMO_CODE = '482913';

const buildDemoUser = (email: string, rol: Role): SessionUser => {
  const isDirectivo = rol === 'Directivo';
  return {
    id: isDirectivo ? 2 : 1,
    nombre: isDirectivo ? 'Jorge Bernal Navarrete' : 'Fabián Astorga Castillo',
    email: email || (isDirectivo ? 'j.bernal@puertoarica.cl' : 'operador@puertoarica.cl'),
    rol,
    unidad: isDirectivo
      ? 'Gerencia de TI y Ciberseguridad'
      : 'Operaciones de Terreno',
  };
};

const buildDemoToken = (user: SessionUser) => {
  const payload = {
    sub: String(user.id),
    name: user.nombre,
    email: user.email,
    role: user.rol,
    iss: 'epa-webgis-demo',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  };
  return `demo.${window.btoa(JSON.stringify(payload))}.prototipo`;
};

export interface LoginInput {
  email: string;
  password: string;
  rol: Role;
}

export const authService = {
  async login({ email, password, rol }: LoginInput): Promise<AuthSession> {
    if (USE_MOCK) {
      await sleep(850);
      if (!email.trim()) throw new Error('Ingresa tu correo institucional.');
      if (password.trim().length < 4)
        throw new Error('La contraseña debe tener al menos 4 caracteres.');

      const user = buildDemoUser(email.trim(), rol);
      return { token: buildDemoToken(user), user };
    }

    return http.post<AuthSession>('/api/auth/login', {
      email,
      password,
    });
  },

  async requestPasswordReset(email: string): Promise<{ demoCode?: string }> {
    if (USE_MOCK) {
      await sleep(750);
      if (!email.trim()) throw new Error('Ingresa tu correo institucional.');
      return { demoCode: DEMO_CODE };
    }

    await http.post('/api/auth/recover/request', { email });
    return {};
  },

  async confirmPasswordReset(input: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<void> {
    if (USE_MOCK) {
      await sleep(700);
      if (input.code.trim() !== DEMO_CODE)
        throw new Error('El código ingresado no es válido o expiró.');
      if (input.newPassword.trim().length < 8)
        throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    await http.post('/api/auth/recover/confirm', input);
  },

  saveSession(session: AuthSession) {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  },

  readSession(): AuthSession | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;

    try {
      return { token, user: JSON.parse(rawUser) as SessionUser };
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    if (!USE_MOCK) {
      try {
        await http.post('/api/auth/logout');
      } catch {
        // El cierre local debe ocurrir aunque el servidor no responda.
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
