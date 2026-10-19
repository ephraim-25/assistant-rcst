import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  AuthState,
  UserRole,
  StoredUserAccount,
  UserProfileUpdateData,
  AdminCreateUserData,
} from '../types/auth';
import { apiFetch, errorMessage, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/api';

/**
 * Authentification branchée sur le backend FastAPI (JWT + RBAC côté serveur).
 * Plus aucun compte ni mot de passe n'est stocké dans le navigateur.
 */

interface RegisterData {
  name: string;
  email: string;
  password: string;
  // Conservé pour compatibilité : le serveur l'ignore, toute inscription crée un Reviewer.
  role?: UserRole;
  affiliation?: string;
  specialty?: string;
}

type Result = { success: boolean; error?: string };

interface AuthContextType extends AuthState {
  /** Faux tant que la session précédente (jeton) n'a pas été vérifiée auprès du serveur. */
  authReady: boolean;
  registeredUsers: StoredUserAccount[];
  login: (email: string, password: string) => Promise<Result>;
  register: (data: RegisterData) => Promise<Result>;
  logout: () => void;
  updateProfile: (data: UserProfileUpdateData) => Promise<Result>;
  adminCreateUser: (data: AdminCreateUserData) => Promise<Result>;
  adminUpdateUser: (userId: string, data: Partial<StoredUserAccount>) => Promise<Result>;
  adminToggleUserStatus: (userId: string) => void;
  adminDeleteUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
}

// Champs d'affichage non sensibles (affiliation, spécialité) : conservés localement,
// car le backend ne les gère pas encore.
const EXTRAS_KEY = 'rcst_profile_extras_v3';
type Extras = Record<string, { affiliation?: string; specialty?: string }>;

const readExtras = (): Extras => {
  try {
    return JSON.parse(localStorage.getItem(EXTRAS_KEY) || '{}');
  } catch {
    return {};
  }
};
const writeExtras = (extras: Extras) => {
  try {
    localStorage.setItem(EXTRAS_KEY, JSON.stringify(extras));
  } catch {
    /* ignoré */
  }
};

interface ApiUser {
  id: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'REVIEWER';
  is_active: boolean;
  created_at: string;
}

const toRole = (r: ApiUser['role']): UserRole => (r === 'ADMIN' ? 'admin' : 'reviewer');

const toUser = (u: ApiUser): User => {
  const role = toRole(u.role);
  const extras = readExtras()[u.id] || {};
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    role,
    title: role === 'admin' ? 'Administrateur (Éditeur Principal)' : 'Reviewer (Comité de lecture)',
    createdAt: new Date(u.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    status: u.is_active ? 'active' : 'suspended',
    auditsCount: 0,
    affiliation: extras.affiliation,
    specialty: extras.specialty,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<StoredUserAccount[]>([]);
  const [authReady, setAuthReady] = useState(false);

  const isAuthenticated = Boolean(user);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setRegisteredUsers([]);
  }, []);

  /** Liste des comptes (réservée à l'ADMIN côté serveur). */
  const refreshUsers = useCallback(async () => {
    const res = await apiFetch('/api/admin/users?limit=1000');
    if (!res.ok) return;
    const body = await res.json();
    setRegisteredUsers(
      (body.users as ApiUser[]).map((u) => ({ ...toUser(u), password: '' }))
    );
  }, []);

  const loadSession = useCallback(async (): Promise<User | null> => {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) return null;
    const me = toUser(await res.json());
    setUser(me);
    if (me.role === 'admin') await refreshUsers();
    return me;
  }, [refreshUsers]);

  // Restauration de la session au chargement (jeton conservé pour l'onglet en cours)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (getToken()) {
          const me = await loadSession();
          if (!me && !cancelled) setToken(null);
        }
      } catch {
        if (!cancelled) setToken(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  // Jeton expiré ou refusé par le serveur : retour à l'écran de connexion
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const authenticate = async (path: string, body: unknown, fallback: string): Promise<Result> => {
    try {
      const res = await apiFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { success: false, error: await errorMessage(res, fallback) };
      const data = await res.json();
      setToken(data.access_token);
      const me = await loadSession();
      if (!me) {
        setToken(null);
        return { success: false, error: 'Session refusée par le serveur.' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Serveur injoignable. Vérifiez votre connexion et réessayez.' };
    }
  };

  const login = async (email: string, password: string): Promise<Result> => {
    if (!email.trim() || !password) {
      return { success: false, error: 'Veuillez renseigner votre e-mail et votre mot de passe.' };
    }
    return authenticate(
      '/api/auth/login',
      { email: email.trim().toLowerCase(), password },
      'Identifiants invalides.'
    );
  };

  const register = async (data: RegisterData): Promise<Result> => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    if (name.length < 3) {
      return { success: false, error: 'Veuillez saisir un nom complet valide (minimum 3 caractères).' };
    }
    if (!email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Veuillez saisir une adresse e-mail institutionnelle valide.' };
    }
    if (data.password.length < 8) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 8 caractères.' };
    }
    const result = await authenticate(
      '/api/auth/register',
      { email, full_name: name, password: data.password },
      'Erreur lors de la création du compte.'
    );
    return result;
  };

  /**
   * Profil : seuls l'affiliation et la spécialité (affichage) sont modifiables pour l'instant.
   * Nom, e-mail et mot de passe nécessitent un point d'entrée serveur dédié (à venir).
   */
  const updateProfile = async (data: UserProfileUpdateData): Promise<Result> => {
    if (!user) return { success: false, error: 'Aucun utilisateur connecté.' };
    if (
      data.name.trim() !== user.name ||
      data.email.trim().toLowerCase() !== user.email ||
      data.password?.trim()
    ) {
      return {
        success: false,
        error:
          'La modification du nom, de l’e-mail et du mot de passe n’est pas encore disponible. Contactez l’administrateur.',
      };
    }
    const extras = readExtras();
    extras[user.id] = {
      affiliation: data.affiliation?.trim() || user.affiliation,
      specialty: data.specialty?.trim() || user.specialty,
    };
    writeExtras(extras);
    setUser({ ...user, ...extras[user.id] });
    return { success: true };
  };

  const setRole = async (userId: string, role: UserRole): Promise<Result> => {
    const res = await apiFetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: role === 'admin' ? 'ADMIN' : 'REVIEWER' }),
    });
    return res.ok
      ? { success: true }
      : { success: false, error: await errorMessage(res, 'Changement de rôle refusé.') };
  };

  /**
   * Création d'un compte par l'administrateur : inscription (Reviewer) puis promotion éventuelle.
   * L'inscription ne change pas la session de l'administrateur (le jeton reçu est ignoré).
   */
  const adminCreateUser = async (data: AdminCreateUserData): Promise<Result> => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    if (!name || !email || data.password.length < 8) {
      return { success: false, error: 'Nom, e-mail et mot de passe (8 caractères minimum) sont obligatoires.' };
    }
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, password: data.password }),
    });
    if (!res.ok) return { success: false, error: await errorMessage(res, 'Création du compte refusée.') };
    const created = await res.json();
    if (data.role === 'admin') {
      const promoted = await setRole(created.user_id, 'admin');
      if (!promoted.success) return promoted;
    }
    if (data.affiliation || data.specialty) {
      const extras = readExtras();
      extras[created.user_id] = { affiliation: data.affiliation, specialty: data.specialty };
      writeExtras(extras);
    }
    await refreshUsers();
    return { success: true };
  };

  const adminUpdateUser = async (userId: string, data: Partial<StoredUserAccount>): Promise<Result> => {
    const current = registeredUsers.find((u) => u.id === userId);
    if (data.role && current && data.role !== current.role) {
      const r = await setRole(userId, data.role);
      if (!r.success) return r;
    }
    if (data.affiliation !== undefined || data.specialty !== undefined) {
      const extras = readExtras();
      extras[userId] = {
        ...extras[userId],
        ...(data.affiliation !== undefined ? { affiliation: data.affiliation } : {}),
        ...(data.specialty !== undefined ? { specialty: data.specialty } : {}),
      };
      writeExtras(extras);
    }
    await refreshUsers();
    return { success: true };
  };

  const adminToggleUserStatus = (userId: string) => {
    const target = registeredUsers.find((u) => u.id === userId);
    if (!target) return;
    apiFetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: target.status !== 'active' }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return refreshUsers();
      })
      .catch(() => window.alert('Action refusée par le serveur (vous ne pouvez pas suspendre votre propre compte).'));
  };

  /** Désactive le compte (le serveur ne supprime jamais l'historique d'audit). */
  const adminDeleteUser = (userId: string) => {
    apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error();
        if (user?.id === userId) logout();
        else return refreshUsers();
      })
      .catch(() => window.alert('Désactivation refusée par le serveur.'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        authReady,
        registeredUsers,
        login,
        register,
        logout,
        updateProfile,
        adminCreateUser,
        adminUpdateUser,
        adminToggleUserStatus,
        adminDeleteUser,
        deleteUser: adminDeleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur d’un AuthProvider.');
  }
  return context;
};
