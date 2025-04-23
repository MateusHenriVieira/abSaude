"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { doc, getDoc, DocumentData } from "firebase/firestore"

interface AuthUser extends FirebaseUser {
  name?: string
  type?: string
  clinicId?: string
  clinicName?: string
  doctorId?: string
  userData?: {
    name: string
    email: string
    type: string
    uid: string
    id: string
    clinicId: string
    createdAt: any
    updatedAt: any
    [key: string]: any
  }
  isAdmin?: boolean
  hasGlobalAccess?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const logout = async () => {
    try {
      await auth.signOut()
      localStorage.removeItem("user")
      setUser(null)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log("Loading user data...");
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          const data = userDoc.data()
          
          if (data) {
            const isAdmin = firebaseUser.email === "santanamateus8979@gmail.com";
            const userData = {
              email: firebaseUser.email || "", // Ensure email is never null
              id: firebaseUser.uid,
              name: data.name || "Admin",
              type: isAdmin ? "admin" : (data.type || "user"),
              clinicId: isAdmin ? "global" : (data.clinicId || ""), // Provide default value
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              uid: firebaseUser.uid
            } satisfies AuthUser["userData"] // Type assertion to ensure compatibility

            let clinicName = undefined;
            if (!isAdmin && userData.clinicId) {
              const clinicDoc = await getDoc(doc(db, "clinics", userData.clinicId))
              clinicName = clinicDoc.exists() ? clinicDoc.data()?.name : undefined
            }

            setUser({
              ...firebaseUser,
              name: userData.name,
              type: userData.type,
              clinicId: isAdmin ? null : userData.clinicId,
              clinicName: clinicName,
              isAdmin: isAdmin,
              hasGlobalAccess: isAdmin,
              userData: userData
            })
            
            console.log("User state updated with:", { ...userData, isAdmin });
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      } else {
        setUser(null)
        router.push("/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

