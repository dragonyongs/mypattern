import React, { createContext, useContext, useReducer, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  level?: "beginner" | "intermediate" | "advanced";
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: Partial<User> };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
      };
    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  login: () => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 더미 로그인 함수
  const login = () => {
    const dummyUser: User = {
      id: "user_123",
      email: "demo@mypattern.com",
      name: "데모 사용자",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("mypattern_user", JSON.stringify(dummyUser));
    dispatch({ type: "LOGIN_SUCCESS", payload: dummyUser });
  };

  const logout = () => {
    localStorage.removeItem("mypattern_user");
    dispatch({ type: "LOGOUT" });
  };

  const updateUser = (updates: Partial<User>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...updates };
      localStorage.setItem("mypattern_user", JSON.stringify(updatedUser));
      dispatch({ type: "UPDATE_USER", payload: updates });
    }
  };

  // 초기 사용자 상태 확인
  useEffect(() => {
    const savedUser = localStorage.getItem("mypattern_user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        dispatch({ type: "LOGIN_SUCCESS", payload: user });
      } catch {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    } else {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ state, dispatch, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
