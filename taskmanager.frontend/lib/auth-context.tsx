"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { type LoginResponse, refreshToken as refreshTokenApi } from "./api";

interface AuthState {
  userID: string | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

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
    const storedToken = token;
    const storedUserID = localStorage.getItem("userID");

    if (storedRefresh && storedUserID && storedToken) {
      refreshTokenApi(storedToken, storedRefresh)
        .then(login)
        .catch(() => logout());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
