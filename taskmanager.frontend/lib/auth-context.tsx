"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { type LoginResponse, refreshToken as refreshTokenApi } from "./authapi";

interface AuthState {
  userID: string | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const REFRESH_INTERVAL_MS = 14 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userID, setUserID] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback((data: LoginResponse) => {
    setUserID(data.userID);
    setToken(data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("userID", data.userID);
  }, []);

  const logout = useCallback(() => {
    setUserID(null);
    setToken(null);
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userID");
  }, []);

  useEffect(() => {
    const storedRefresh = localStorage.getItem("refreshToken");

    if (storedRefresh) {
      refreshTokenApi(storedRefresh)
        .then(login)
        .catch(() => logout());
    }
  }, [login, logout]);

  useEffect(() => {
    if (!token) return;

    const intervalId = window.setInterval(() => {
      const storedRefresh = localStorage.getItem("refreshToken");
      if (!storedRefresh) {
        logout();
        return;
      }

      refreshTokenApi(storedRefresh)
        .then(login)
        .catch(() => logout());
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [token, login, logout]);

  return (
    <AuthContext.Provider
      value={{ userID, token, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
