/**
 * Client API — ajoute automatiquement le jeton JWT (Bearer) à chaque appel /api/*.
 * Le jeton est conservé dans sessionStorage (effacé à la fermeture de l'onglet).
 */
const TOKEN_KEY = 'rcst_access_token_v3';
export const UNAUTHORIZED_EVENT = 'rcst:unauthorized';

export const getToken = (): string | null => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null): void => {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible : la session ne survivra pas au rechargement */
  }
};

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  // Jeton expiré ou invalide : l'AuthContext déconnecte l'utilisateur.
  if (response.status === 401 && token && !input.startsWith('/api/auth/login')) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return response;
}

/** Extrait un message d'erreur lisible d'une réponse FastAPI (`{detail: ...}`). */
export async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    /* corps non JSON */
  }
  return fallback;
}
