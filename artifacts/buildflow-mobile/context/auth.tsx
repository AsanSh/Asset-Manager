import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, setToken } from "@/lib/api";

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: number;
  company?: { id: number; name: string; legalName?: string; phone?: string; email?: string };
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("auth_token");
        if (stored) {
          setToken(stored);
          const me = await apiFetch<AuthUser>("/auth/me");
          setUser(me);
        }
      } catch {
        await AsyncStorage.removeItem("auth_token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (token: string) => {
    await AsyncStorage.setItem("auth_token", token);
    setToken(token);
    const me = await apiFetch<AuthUser>("/auth/me");
    setUser(me);
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    await AsyncStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
