import { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
} from "firebase/auth";
import { ref, set, get, update } from "firebase/database";
import { auth, database } from "../firebase/config";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch profile from RTDB
        try {
          const profileSnap = await get(ref(database, `users/${firebaseUser.uid}`));
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.val());
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
          setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signup = async (email, password, name, phone, role) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      name,
      email,
      phone,
      role, // "citizen" or "authority"
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await set(ref(database, `users/${cred.user.uid}`), profile);
    setUserProfile(profile);
    return cred.user;
  };

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Fetch profile
    const profileSnap = await get(ref(database, `users/${cred.user.uid}`));
    if (profileSnap.exists()) {
      setUserProfile(profileSnap.val());
    }
    return cred.user;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (data) => {
    if (!user) return;
    const updates = { ...data, updatedAt: new Date().toISOString() };
    await update(ref(database, `users/${user.uid}`), updates);
    setUserProfile((prev) => ({ ...prev, ...updates }));
  };

  const changePassword = async (newPassword) => {
    if (!user) throw new Error("Not logged in");
    await updatePassword(user, newPassword);
  };

  const value = {
    user,
    userProfile,
    loading,
    isAuthenticated: !!user,
    isAdmin: userProfile?.role === "authority",
    isCitizen: userProfile?.role === "citizen",
    signup,
    login,
    logout,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
