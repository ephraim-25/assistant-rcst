import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState, UserRole, StoredUserAccount } from '../types/auth';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextType extends AuthState {
  registeredUsers: StoredUserAccount[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  deleteUser: (userId: string) => void;
}

const USERS_DB_KEY = 'rcst_registered_users_db';
const SESSION_KEY = 'rcst_current_user_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Liste persistante de tous les comptes enregistrés
  const [registeredUsers, setRegisteredUsers] = useState<StoredUserAccount[]>(() => {
    try {
      const stored = localStorage.getItem(USERS_DB_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Session de l'utilisateur actuellement connecté
  const [user, setUser] = useState<User | null>(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  // Synchronisation de la base d'utilisateurs avec localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(registeredUsers));
    } catch (e) {
      console.error('Erreur sauvegarde utilisateurs:', e);
    }
  }, [registeredUsers]);

  // Synchronisation de la session avec localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.error('Erreur sauvegarde session:', e);
    }
  }, [user]);

  /**
   * Connexion avec vérification dans la base d'utilisateurs persistante
   */
  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPwd = password.trim();

    if (!cleanId || !cleanPwd) {
      return { success: false, error: 'Veuillez renseigner votre e-mail et votre mot de passe.' };
    }

    const found = registeredUsers.find(
      (u) => u.email.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId
    );

    if (!found) {
      return { 
        success: false, 
        error: 'Aucun compte associé à cette adresse e-mail. Veuillez vous inscrire via l’onglet « Créer un compte ».' 
      };
    }

    if (found.password !== cleanPwd) {
      return { success: false, error: 'Mot de passe incorrect pour ce compte.' };
    }

    // Connexion réussie
    const { password: _, ...sessionUser } = found;
    setUser(sessionUser);
    return { success: true };
  };

  /**
   * Enregistrement d'un nouvel utilisateur avec rôle explicite
   */
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();
    const role = data.role;

    if (!name || name.length < 3) {
      return { success: false, error: 'Veuillez saisir un nom complet valide (minimum 3 caractères).' };
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Veuillez saisir une adresse e-mail institutionnelle valide.' };
    }

    if (!password || password.length < 4) {
      return { success: false, error: 'Le mot de passe doit comporter au moins 4 caractères.' };
    }

    // Vérifier l'unicité de l'adresse e-mail
    const exists = registeredUsers.some((u) => u.email.toLowerCase() === email);
    if (exists) {
      return { 
        success: false, 
        error: 'Cette adresse e-mail est déjà enregistrée. Veuillez vous connecter ou utiliser une autre adresse.' 
      };
    }

    const newUserAccount: StoredUserAccount = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      password,
      role,
      title: role === 'admin' ? 'Administrateur (Éditeur Principal)' : 'Reviewer (Comité de lecture)',
      createdAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      avatarUrl: role === 'admin'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    };

    // Ajout à la base locale
    setRegisteredUsers((prev) => [...prev, newUserAccount]);

    // Connexion immédiate du nouvel utilisateur
    const { password: _, ...sessionUser } = newUserAccount;
    setUser(sessionUser);

    return { success: true };
  };

  /**
   * Déconnexion
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  /**
   * Suppression d'un utilisateur par un administrateur
   */
  const deleteUser = (userId: string) => {
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
    if (user?.id === userId) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, registeredUsers, login, register, logout, deleteUser }}>
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
