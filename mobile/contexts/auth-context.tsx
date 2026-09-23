import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiRequest } from '../services/api';

const TOKEN_KEY = 'civia_access_token';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'USER' | 'GLOBAL_ADMIN';
  active: boolean;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isRestoring: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const storedToken =
          await SecureStore.getItemAsync(TOKEN_KEY);

        if (!storedToken) {
          return;
        }

        const currentUser = await apiRequest<AuthUser>(
          '/auth/me',
          {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          }
        );

        if (!mounted) {
          return;
        }

        setToken(storedToken);
        setUser(currentUser);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);

        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsRestoring(false);
        }
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<AuthUser> => {
      const response = await apiRequest<LoginResponse>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      await SecureStore.setItemAsync(
        TOKEN_KEY,
        response.accessToken
      );

      setToken(response.accessToken);
      setUser(response.user);

      return response.user;
    },
    []
  );

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      return null;
    }

    try {
      const currentUser = await apiRequest<AuthUser>(
        '/auth/me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUser(currentUser);

      return currentUser;
    } catch (error) {
      await clearSession();
      throw error;
    }
  }, [clearSession, token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isRestoring,
      signIn,
      signOut,
      refreshUser,
    }),
    [
      user,
      token,
      isRestoring,
      signIn,
      signOut,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de AuthProvider.'
    );
  }

  return context;
}