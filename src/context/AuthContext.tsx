import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  AuthState, 
  UserRole, 
  StoredUserAccount, 
  UserProfileUpdateData,
  AdminCreateUserData 
} from '../types/auth';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  affiliation?: string;
  specialty?: string;
}

interface AuthContextType extends AuthState {
  registeredUsers: StoredUserAccount[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: UserProfileUpdateData) => Promise<{ success: boolean; error?: string }>;
  adminCreateUser: (data: AdminCreateUserData) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUser: (userId: string, data: Partial<StoredUserAccount>) => Promise<{ success: boolean; error?: string }>;
  adminToggleUserStatus: (userId: string) => void;
  adminDeleteUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
}

const USERS_DB_KEY = 'rcst_enterprise_users_db_v2';
const SESSION_KEY = 'rcst_current_user_session_v2';

// Comptes initiaux réalistes du Conseil Éditorial RCST si premier lancement
const INITIAL_SEED_USERS: StoredUserAccount[] = [
  {
    id: 'usr-admin-001',
    name: 'Prof. Marcel Kalonji',
    email: 'marcel.kalonji@unikin.ac.cd',
    password: 'password123',
    role: 'admin',
    title: 'Éditeur Principal & Président du Comité',
    createdAt: '12 Janv. 2026',
    status: 'active',
    auditsCount: 48,
    affiliation: 'Université de Kinshasa, Faculté Polytechnique',
    specialty: 'Génie Électrique & Systèmes Énergétiques',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-rev-002',
    name: 'Dr. Nadine Masika',
    email: 'nadine.masika@inrb.cd',
    password: 'password123',
    role: 'reviewer',
    title: 'Éditrice Associée • Comité de Lecture',
    createdAt: '18 Fév. 2026',
    status: 'active',
    auditsCount: 19,
    affiliation: 'Institut National de Recherche Biomédicale (INRB)',
    specialty: 'Épidémiologie & Maladies Infectieuses',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
  },
  {
    id: 'usr-rev-003',
    name: 'Dr. Benjamin Lukusa',
    email: 'benjamin.lukusa@ista.cd',
    password: 'password123',
    role: 'reviewer',
    title: 'Réviseur Scientifique • Section Matériaux',
    createdAt: '03 Mars 2026',
    status: 'active',
    auditsCount: 12,
    affiliation: 'Institut Supérieur des Techniques Appliquées (ISTA)',
    specialty: 'Génie des Matériaux & Géotechnique',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
  }
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Liste persistante de tous les comptes enregistrés
  const [registeredUsers, setRegisteredUsers] = useState<StoredUserAccount[]>(() => {
    try {
      const stored = localStorage.getItem(USERS_DB_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_SEED_USERS;
    } catch {
      return INITIAL_SEED_USERS;
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

  // Synchronisation avec localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(registeredUsers));
    } catch (e) {
      console.error('Erreur sauvegarde utilisateurs:', e);
    }
  }, [registeredUsers]);

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
   * Connexion avec vérification d'état (Actif / Suspendu)
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
        error: 'Aucun compte associé à cet identifiant. Veuillez créer un compte ou vérifier l’adresse.' 
      };
    }

    if (found.status === 'suspended') {
      return {
        success: false,
        error: 'Ce compte a été suspendu par l’Éditeur Principal (Gouvernance RCST). Veuillez contacter l’administration.'
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
   * Enregistrement public d'un nouvel utilisateur
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

    const exists = registeredUsers.some((u) => u.email.toLowerCase() === email);
    if (exists) {
      return { 
        success: false, 
        error: 'Cette adresse e-mail est déjà enregistrée. Veuillez vous connecter.' 
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
      status: 'active',
      auditsCount: 0,
      affiliation: data.affiliation || 'Institution Académique RDC',
      specialty: data.specialty || 'Sciences & Technologies',
      avatarUrl: role === 'admin'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    };

    setRegisteredUsers((prev) => [...prev, newUserAccount]);

    const { password: _, ...sessionUser } = newUserAccount;
    setUser(sessionUser);
    return { success: true };
  };

  /**
   * Mise à jour de son propre profil (Reviewer ou Admin)
   */
  const updateProfile = async (data: UserProfileUpdateData): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Aucun utilisateur connecté.' };

    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();

    if (!name || name.length < 3) {
      return { success: false, error: 'Le nom doit comporter au moins 3 caractères.' };
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Adresse email invalide.' };
    }

    // Vérifier doublon email si changé
    const emailDuplicate = registeredUsers.some(
      (u) => u.id !== user.id && u.email.toLowerCase() === email
    );
    if (emailDuplicate) {
      return { success: false, error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' };
    }

    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.id === user.id) {
          const updated: StoredUserAccount = {
            ...u,
            name,
            email,
            affiliation: data.affiliation?.trim() || u.affiliation,
            specialty: data.specialty?.trim() || u.specialty,
            password: data.password?.trim() ? data.password.trim() : u.password,
          };
          return updated;
        }
        return u;
      })
    );

    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        name,
        email,
        affiliation: data.affiliation?.trim() || prev.affiliation,
        specialty: data.specialty?.trim() || prev.specialty,
      };
    });

    return { success: true };
  };

  /**
   * Création directe d'un utilisateur par l'Administrateur (CRUD SIGC)
   */
  const adminCreateUser = async (data: AdminCreateUserData): Promise<{ success: boolean; error?: string }> => {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();

    if (!name || !email || !password) {
      return { success: false, error: 'Veuillez remplir tous les champs obligatoires.' };
    }

    const exists = registeredUsers.some((u) => u.email.toLowerCase() === email);
    if (exists) {
      return { success: false, error: 'Cette adresse e-mail est déjà attribuée.' };
    }

    const newUser: StoredUserAccount = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      password,
      role: data.role,
      title: data.title || (data.role === 'admin' ? 'Éditeur Principal (Admin)' : 'Reviewer (Comité)'),
      createdAt: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'active',
      auditsCount: 0,
      affiliation: data.affiliation || 'Université / Centre de Recherche RDC',
      specialty: data.specialty || 'Sciences & Technologies',
      avatarUrl: data.role === 'admin'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    };

    setRegisteredUsers((prev) => [newUser, ...prev]);
    return { success: true };
  };

  /**
   * Modification d'un compte utilisateur par l'Administrateur (CRUD SIGC)
   */
  const adminUpdateUser = async (userId: string, data: Partial<StoredUserAccount>): Promise<{ success: boolean; error?: string }> => {
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, ...data };
          // Mettre à jour le titre si rôle changé
          if (data.role && data.role !== u.role) {
            updated.title = data.role === 'admin' 
              ? 'Administrateur (Éditeur Principal)' 
              : 'Reviewer (Comité de lecture)';
          }
          return updated;
        }
        return u;
      })
    );

    // Si on a modifié l'utilisateur actuellement connecté
    if (user && user.id === userId) {
      setUser((prev) => (prev ? { ...prev, ...data } : null));
    }

    return { success: true };
  };

  /**
   * Bascule du statut Actif <-> Suspendu
   */
  const adminToggleUserStatus = (userId: string) => {
    setRegisteredUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === 'active' ? 'suspended' : 'active';
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  /**
   * Suppression définitive d'un compte
   */
  const adminDeleteUser = (userId: string) => {
    setRegisteredUsers((prev) => prev.filter((u) => u.id !== userId));
    if (user?.id === userId) {
      logout();
    }
  };

  /**
   * Déconnexion
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
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
