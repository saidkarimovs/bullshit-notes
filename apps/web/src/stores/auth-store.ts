"use client";

import { create } from "zustand";

type AuthState = { challengeToken: string | null; setChallengeToken: (token: string | null) => void };
export const useAuthStore = create<AuthState>(set => ({ challengeToken: null, setChallengeToken: challengeToken => set({ challengeToken }) }));
