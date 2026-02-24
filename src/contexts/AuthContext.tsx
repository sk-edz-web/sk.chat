import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { ref, set, onDisconnect, serverTimestamp } from "firebase/database";
import { auth, db, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Set presence
        const userStatusRef = ref(db, `status/${u.uid}`);
        set(userStatusRef, { online: true, lastSeen: serverTimestamp() });
        onDisconnect(userStatusRef).set({ online: false, lastSeen: serverTimestamp() });
      }
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email: string, password: string, username: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    // Save user to Realtime DB
    await set(ref(db, `users/${cred.user.uid}`), {
      email: cred.user.email,
      username,
      photoURL: cred.user.photoURL || "",
      createdAt: serverTimestamp(),
      online: true,
    });
  };

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    // Save user to Realtime DB if new
    await set(ref(db, `users/${cred.user.uid}`), {
      email: cred.user.email,
      username: cred.user.displayName || "User",
      photoURL: cred.user.photoURL || "",
      createdAt: serverTimestamp(),
      online: true,
    });
  };

  const logout = async () => {
    if (auth.currentUser) {
      await set(ref(db, `status/${auth.currentUser.uid}`), {
        online: false,
        lastSeen: serverTimestamp(),
      });
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
