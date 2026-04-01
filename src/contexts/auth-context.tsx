
"use client";

import * as React from "react";
import type { AuthenticatedUser, AuthFormData, AdminSimulatedTier } from "@/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/api-client";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset, signOut as firebaseSignOut, updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { LOCAL_STORAGE_KEY_SIMULATED_TIER, ALL_TIERS } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const LOCAL_STORAGE_TOKEN_KEY = "profitPilotToken";
const LOCAL_STORAGE_USER_KEY = "profitPilotUser";
const LOCAL_STORAGE_ADMIN_CREDENTIAL_BYPASS_KEY = "profitPilotAdminCredentialBypass";

interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTestingModeActive: boolean;
  login: (data: Pick<AuthFormData, "email" | "password">) => Promise<void>;
  register: (data: AuthFormData) => Promise<void>;
  logout: () => void;
  updateUserInContext: (updatedUserData: Partial<AuthenticatedUser>) => void;
  requestPasswordReset: (email: string) => Promise<{ message: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ message: string }>;
  setToken: (token: string | null) => void;
  setUser: (user: AuthenticatedUser | null) => void;
  handleAuthSuccess: (responseData: { access_token: string; user: Partial<AuthenticatedUser> }) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = React.useState<AuthenticatedUser | null>(null);
  const [token, setTokenState] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTestingModeActive, setIsTestingModeActive] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const setTokenInternal = React.useCallback((newToken: string | null) => {
    setTokenState(newToken);
    if (typeof window !== 'undefined') {
      if (newToken) {
        localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, newToken);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
      }
    }
  }, []);

  const setUserInternal = React.useCallback((newUser: AuthenticatedUser | null) => {
    const processedUser = newUser ? {
      ...newUser,
      id: String(newUser.id || Date.now()),
      email: newUser.email || "unknown@example.com",
      name: newUser.name || undefined,
      role: (newUser.role || 'FREE') as AuthenticatedUser['role'],
      profile: {
        companyName: newUser.profile?.companyName,
        currency: newUser.profile?.currency || "USD",
        dateFormat: newUser.profile?.dateFormat || "MM/DD/YYYY",
        defaultCountry: newUser.profile?.defaultCountry,
        locale: newUser.profile?.locale || "en",
      },
      testingSession: newUser.testingSession || false,
      expiresAt: newUser.expiresAt || undefined,
    } : null;

    setUserState(processedUser);
    setIsTestingModeActive(!!processedUser?.testingSession);

    if (typeof window !== 'undefined') {
      if (processedUser) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(processedUser));
        const effectiveRole = processedUser.role || 'FREE';
        if (effectiveRole === 'ADMIN' || processedUser.testingSession) {
          if (localStorage.getItem(LOCAL_STORAGE_KEY_SIMULATED_TIER) !== "Creator") {
            localStorage.setItem(LOCAL_STORAGE_KEY_SIMULATED_TIER, "Creator");
            console.log("[AuthContext] User is ADMIN or in testing session, ensuring simulated tier is Creator.");
             window.dispatchEvent(new StorageEvent('storage', {
              key: LOCAL_STORAGE_KEY_SIMULATED_TIER,
              newValue: "Creator",
              storageArea: localStorage,
            }));
          }
        }
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
    }
  }, []);


  React.useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_BASE_URL === undefined) {
      console.warn(`[AuthContext] WARNING: NEXT_PUBLIC_API_BASE_URL is not explicitly set in your environment. Defaulting to API endpoint: ${API_BASE_URL}. Ensure this is correct or set NEXT_PUBLIC_API_BASE_URL in .env.local and restart the development server.`);
      toast({
        variant: "default",
        title: "Configuration Notice",
        description: `Backend API URL not explicitly set. Using default: ${API_BASE_URL}. Check .env.local if this is incorrect.`,
        duration: 9000,
      });
    } else {
      console.log("[AuthContext] API_BASE_URL is set to:", API_BASE_URL);
    }
    
    let activeBypass = false;
    try {
      const adminCredentialBypassFlag = localStorage.getItem(LOCAL_STORAGE_ADMIN_CREDENTIAL_BYPASS_KEY);
      if (adminCredentialBypassFlag === 'true' && (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_TESTING_MODE === 'true')) {
        console.warn('[AuthContext] ADMIN CREDENTIAL BYPASS (localStorage flag) IS ACTIVE: Logging in as mock admin.');
        activeBypass = true;
        const mockAdminUser: AuthenticatedUser = {
          id: 'admin-credential-bypass-user',
          email: 'admin-bypass@profitpilot.dev',
          name: 'Admin Bypass User (Credential)',
          role: 'ADMIN',
          profile: { locale: "en", companyName: "Admin Co. (Bypass)", currency: "USD", dateFormat: "MM/DD/YYYY" },
          testingSession: true,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        };
        handleAuthSuccess({ access_token: 'mock-admin-token-credential-bypass', user: mockAdminUser });
      } else {
        const storedToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
        const storedUserString = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (storedToken && storedUserString) {
          setTokenInternal(storedToken);
          try {
            const parsedUser = JSON.parse(storedUserString) as AuthenticatedUser;
            setUserInternal(parsedUser);
          } catch (parseError) {
            console.error("[AuthContext] Error parsing stored user data:", parseError, "Clearing stored session.");
            clearAuthData();
          }
        } else {
          clearAuthData();
        }
      }
    } catch (error) {
      console.error("[AuthContext] Error loading auth state from localStorage:", error);
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuthData = () => {
    setTokenInternal(null);
    setUserInternal(null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  };

  const handleAuthSuccess = React.useCallback((responseData: { access_token: string; user: Partial<AuthenticatedUser> }) => {
    const apiUser = responseData.user;
    const processedUser: AuthenticatedUser = {
      id: String(apiUser.id || Date.now()),
      email: apiUser.email || "unknown@example.com",
      name: apiUser.name || undefined,
      role: (apiUser.role || 'FREE') as AuthenticatedUser['role'],
      profile: {
        companyName: apiUser.profile?.companyName,
        currency: apiUser.profile?.currency || "USD",
        dateFormat: apiUser.profile?.dateFormat || "MM/DD/YYYY",
        defaultCountry: apiUser.profile?.defaultCountry,
        locale: apiUser.profile?.locale || "en",
      },
      testingSession: apiUser.testingSession || false,
      expiresAt: apiUser.expiresAt || undefined,
    };

    setTokenInternal(responseData.access_token);
    setUserInternal(processedUser);

    if (processedUser.testingSession || processedUser.role === 'ADMIN') {
      if (typeof window !== 'undefined' && localStorage.getItem(LOCAL_STORAGE_KEY_SIMULATED_TIER) !== "Creator") {
        localStorage.setItem(LOCAL_STORAGE_KEY_SIMULATED_TIER, "Creator");
         window.dispatchEvent(new StorageEvent('storage', {
          key: LOCAL_STORAGE_KEY_SIMULATED_TIER,
          newValue: "Creator",
          storageArea: localStorage,
        }));
      }
    }
  }, [setTokenInternal, setUserInternal]);

  const updateUserInContext = React.useCallback((updatedPartialUserData: Partial<AuthenticatedUser>) => {
    setUserState(prevUser => {
      if (!prevUser) return null;

      const currentProfile = prevUser.profile || { locale: 'en', currency: "USD", dateFormat: "MM/DD/YYYY" };
      const updatedProfilePartial = updatedPartialUserData.profile || {};

      const newProfileData: AuthenticatedUser['profile'] = {
        companyName: updatedProfilePartial.companyName !== undefined ? updatedProfilePartial.companyName : currentProfile.companyName,
        currency: updatedPartialUserData.profile?.currency || currentProfile.currency || "USD",
        dateFormat: updatedPartialUserData.profile?.dateFormat || currentProfile.dateFormat || "MM/DD/YYYY",
        defaultCountry: updatedPartialUserData.profile?.defaultCountry !== undefined ? updatedPartialUserData.profile?.defaultCountry : currentProfile.defaultCountry,
        locale: updatedPartialUserData.profile?.locale || currentProfile.locale || 'en',
      };

      const newUser: AuthenticatedUser = {
        ...prevUser,
        ...updatedPartialUserData,
        id: String(updatedPartialUserData.id || prevUser.id),
        email: updatedPartialUserData.email || prevUser.email,
        name: updatedPartialUserData.name !== undefined ? updatedPartialUserData.name : prevUser.name,
        role: (updatedPartialUserData.role || prevUser.role) as AuthenticatedUser['role'],
        profile: newProfileData,
        testingSession: updatedPartialUserData.testingSession !== undefined ? updatedPartialUserData.testingSession : prevUser.testingSession,
        expiresAt: updatedPartialUserData.expiresAt !== undefined ? updatedPartialUserData.expiresAt : prevUser.expiresAt,
      };
      
      setIsTestingModeActive(!!newUser.testingSession);

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
        if (newUser.role === 'ADMIN' || newUser.testingSession) {
           if (localStorage.getItem(LOCAL_STORAGE_KEY_SIMULATED_TIER) !== "Creator") {
            localStorage.setItem(LOCAL_STORAGE_KEY_SIMULATED_TIER, "Creator");
            window.dispatchEvent(new StorageEvent('storage', {
              key: LOCAL_STORAGE_KEY_SIMULATED_TIER,
              newValue: "Creator",
              storageArea: localStorage,
            }));
          }
        }
      }
      return newUser;
    });
  }, []);

  const login = async (data: Pick<AuthFormData, "email" | "password">) => {
    if (!API_BASE_URL) {
      toast({ variant: "destructive", title: "Configuration Error", description: "API URL is not configured. API calls will be blocked." });
      throw new Error("API_BASE_URL is not configured.");
    }
    // Use Firebase Auth client to sign in
    console.log("[AuthContext] Signing in via Firebase Auth client for:", { email: data.email });
    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, data.email, data.password);
      const user = credential.user;
      const idToken = await user.getIdToken();

      // Verify with backend (compat) and fetch profile created in Firestore
      try {
        const response = await apiFetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
        // backend returns { success, token, user }
        if (response && response.user) {
          handleAuthSuccess({ access_token: idToken, user: response.user });
        } else {
          // fallback: build user from firebase data if backend didn't return profile
          const fallbackUser = { id: user.uid, email: user.email || '', name: user.displayName || '' };
          handleAuthSuccess({ access_token: idToken, user: fallbackUser });
        }
        toast({ title: 'Login Successful', description: 'Welcome back!' });
      } catch (err) {
        // If profile not found, still set user from firebase info but recommend syncing profile
        const fallbackUser = { id: user.uid, email: user.email || '', name: user.displayName || '' };
        handleAuthSuccess({ access_token: idToken, user: fallbackUser });
        toast({ title: 'Login Successful', description: 'Signed in, but profile not yet synced.' });
      }
    } catch (error: any) {
      let toastMessage = error.message;
      if (error.message && (error.message.toLowerCase().includes("failed to fetch") || error.message.includes("TypeError: NetworkError") || error.message.toLowerCase().includes("network request failed")) ) {
        toastMessage = "Could not connect to the server. Please ensure the backend is running and accessible, and check CORS configuration.";
      }
      console.error('[AuthContext] Login error (outer catch):', error);
      toast({ variant: "destructive", title: "Login Error", description: toastMessage });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: AuthFormData) => {
     if (!API_BASE_URL) {
        toast({ variant: "destructive", title: "Configuration Error", description: "API URL is not configured. API calls will be blocked." });
        throw new Error("API_BASE_URL is not configured.");
    }
    // Preferred: register via Firebase Auth client
    console.log('[AuthContext] Registering using Firebase client for', data.email);
    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
      const firebaseUser = credential.user;
      // update display name
      if (data.name) {
        try { await firebaseUpdateProfile(firebaseUser, { displayName: data.name }); } catch (e) { /* ignore */ }
      }

      const idToken = await firebaseUser.getIdToken();
      // Sync user/profile record in Firestore via backend
      try {
        await apiFetch('/auth/sync-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.name }) });
      } catch (syncErr) {
        console.warn('[AuthContext] Failed to sync user profile to backend:', syncErr);
      }

      // Get profile
      try {
        const response = await apiFetch('/profile', { method: 'GET' });
        handleAuthSuccess({ access_token: idToken, user: response.user || { id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName } });
      } catch (err) {
        handleAuthSuccess({ access_token: idToken, user: { id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName } });
      }
      toast({ title: 'Registration Successful', description: 'Welcome to ProfitPilot!' });
    } catch (error: any) {
      let toastMessage = error.message;
      if (error.message && (error.message.toLowerCase().includes("failed to fetch") || error.message.includes("TypeError: NetworkError") || error.message.toLowerCase().includes("network request failed")) ) {
        toastMessage = "Could not connect to the server. Please ensure the backend is running and accessible, and check CORS configuration.";
      }
      console.error('[AuthContext] Registration error (outer catch):', error);
      toast({ variant: "destructive", title: "Registration Error", description: toastMessage });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = React.useCallback(async () => {
    console.log("[AuthContext] Logging out.");
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (err) {
      console.warn('[AuthContext] firebaseSignOut error (ignoring):', err);
    }
    clearAuthData();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(LOCAL_STORAGE_ADMIN_CREDENTIAL_BYPASS_KEY);
        localStorage.removeItem(LOCAL_STORAGE_KEY_SIMULATED_TIER);
      } catch (error) {
        console.error("Error clearing admin bypass/simulated tier from localStorage on logout:", error);
      }
    }
    router.push("/login");
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  }, [router, toast, clearAuthData]);

  const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
    if (!API_BASE_URL) {
        toast({ variant: "destructive", title: "Configuration Error", description: "API URL is not configured. API calls will be blocked." });
        throw new Error("API_BASE_URL is not configured.");
    }
    // Use Firebase Auth client to request password reset
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      return { message: 'Password reset email sent (check your inbox).' };
    } catch (error: any) {
      let toastMessage = error.message;
      if (error.message && (error.message.toLowerCase().includes("failed to fetch") || error.message.includes("TypeError: NetworkError") || error.message.toLowerCase().includes("network request failed")) ) {
        toastMessage = "Could not connect to the server. Please ensure the backend is running and accessible, and check CORS configuration.";
      }
      console.error('[AuthContext] Request password reset error (outer catch):', error);
      toast({ variant: "destructive", title: "Error", description: toastMessage});
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (tokenFromUrl: string, newPassword: string): Promise<{ message: string }> => {
    if (!API_BASE_URL) {
        toast({ variant: "destructive", title: "Configuration Error", description: "API URL is not configured. API calls will be blocked." });
        throw new Error("API_BASE_URL is not configured.");
    }
    // Use Firebase client to confirm password reset using code from link
    try {
      await confirmPasswordReset(firebaseAuth, tokenFromUrl, newPassword);
      return { message: 'Password updated successfully.' };
    } catch (error: any) {
      let toastMessage = error.message;
      if (error.message && (error.message.toLowerCase().includes("failed to fetch") || error.message.includes("TypeError: NetworkError") || error.message.toLowerCase().includes("network request failed")) ) {
        toastMessage = "Could not connect to the server. Please ensure the backend is running and accessible, and check CORS configuration.";
      }
      console.error('[AuthContext] Reset password error (outer catch):', error);
      toast({ variant: "destructive", title: "Error", description: toastMessage});
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isTestingModeActive,
        login,
        register,
        logout,
        updateUserInContext,
        requestPasswordReset,
        resetPassword,
        setToken: setTokenInternal,
        setUser: setUserInternal,
        handleAuthSuccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
