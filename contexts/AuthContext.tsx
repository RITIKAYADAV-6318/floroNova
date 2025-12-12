import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock "Database" for users stored in localStorage for demo purposes
// In a real app, this would be on a backend server
const USERS_DB_KEY = 'floronova_users_db';
const SESSION_KEY = 'floronova_session_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem(SESSION_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Session restore failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const getUsersDB = (): Record<string, any> => {
    const db = localStorage.getItem(USERS_DB_KEY);
    return db ? JSON.parse(db) : {};
  };

  const saveUsersDB = (db: Record<string, any>) => {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const db = getUsersDB();
      const userRecord = Object.values(db).find((u: any) => u.email === email && u.password === password) as any;

      if (!userRecord) {
        throw new Error("Invalid email or password");
      }

      const userData: User = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        joinedAt: userRecord.joinedAt,
        avatar: userRecord.avatar
      };

      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const db = getUsersDB();
      
      // Check if email exists
      if (Object.values(db).some((u: any) => u.email === email)) {
        throw new Error("User with this email already exists");
      }

      const newUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password, // In real app, never store plain text!
        joinedAt: Date.now(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` // Generate random avatar
      };

      db[newUser.id] = newUser;
      saveUsersDB(db);

      const userData: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        joinedAt: newUser.joinedAt,
        avatar: newUser.avatar
      };

      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));

      // Migrate guest data to new user
      StorageService.migrateGuestData(userData.id);

    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};