// src/shared/utils/navigation.ts
export interface NavigationState {
  stepId: string;
  stepTitle: string;
  items: any[];
}

export const isValidNavigationState = (
  state: any
): state is NavigationState => {
  return (
    state &&
    typeof state === "object" &&
    typeof state.stepId === "string" &&
    state.stepId.length > 0 &&
    typeof state.stepTitle === "string" &&
    Array.isArray(state.items) &&
    state.items.length > 0
  );
};

export const getValidatedState = (
  locationState: any
): NavigationState | null => {
  if (isValidNavigationState(locationState)) {
    return locationState;
  }
  return null;
};
