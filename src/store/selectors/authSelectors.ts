import { RootState } from '../store';

export const selectAuthUser = (state: RootState) => state.auth.user;

export const selectAuthIsAuthenticated = (state: RootState) =>
  state.auth.isAuthenticated;

export const selectAuthIsLoading = (state: RootState) => state.auth.isLoading;

export const selectAuthError = (state: RootState) => state.auth.error;
