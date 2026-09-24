import { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthContext";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { user } = useAuth();

  const value = useMemo(() => {
    // If user is null (e.g. logging out or loading), provide safe defaults
    const safeUser = user || { username: "Guest", role: "Viewer", id: null };
    
    return {
      user: safeUser,
      can: {
        edit: (project) =>
          safeUser.role === "Admin" ||
          (safeUser.role === "Official" &&
            (project?.createdBy === safeUser.id ||
              project?.created_by === safeUser.id ||
              project?.createdBy === safeUser.username ||
              project?.created_by === safeUser.username)),
        addProject: safeUser.role === "Official" || safeUser.role === "Admin",
      },
    };
  }, [user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
