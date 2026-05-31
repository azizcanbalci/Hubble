import { createContext, useContext, useState, useCallback } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/clerk-react";

const AppAuthContext = createContext(null);

export function AppAuthProvider({ children }) {
  const { isSignedIn: clerkSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  const [localUser, setLocalUser] = useState(() => {
    try {
      const stored = localStorage.getItem("hubble_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [customToken, setCustomToken] = useState(() =>
    localStorage.getItem("hubble_token") || null
  );

  const loginWithCustom = useCallback((token, user) => {
    localStorage.setItem("hubble_token", token);
    localStorage.setItem("hubble_user", JSON.stringify(user));
    setCustomToken(token);
    setLocalUser(user);
  }, []);

  const logoutCustom = useCallback(() => {
    localStorage.removeItem("hubble_token");
    localStorage.removeItem("hubble_user");
    setCustomToken(null);
    setLocalUser(null);
  }, []);

  const isCustomSignedIn = !!customToken && !!localUser;
  const isSignedIn = clerkSignedIn || isCustomSignedIn;
  const isLoaded = clerkLoaded;

  const currentUser = isCustomSignedIn
    ? localUser
    : clerkUser
    ? {
        id: clerkUser.id,
        name: clerkUser.fullName ?? clerkUser.username ?? clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        image: clerkUser.imageUrl ?? "",
      }
    : null;

  return (
    <AppAuthContext.Provider
      value={{
        isSignedIn,
        isLoaded,
        currentUser,
        customToken,
        isCustomSignedIn,
        loginWithCustom,
        logoutCustom,
      }}
    >
      {children}
    </AppAuthContext.Provider>
  );
}

export const useAppAuth = () => {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error("useAppAuth must be used inside AppAuthProvider");
  return ctx;
};
