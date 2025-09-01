// src/providers/appHooks.ts

import { useContext } from "react";
import { AppContext } from "./AppProvider";
import type { AppState } from "./AppProvider";

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

export function useAppDispatch() {
  const { dispatch } = useAppState();
  return dispatch;
}

export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const { state } = useAppState();
  return selector(state);
}
