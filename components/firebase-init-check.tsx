"use client"

import { useEffect, useState } from "react"
import { getApps } from "firebase/app"

export function FirebaseInitCheck() {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const checkFirebaseInit = () => {
      if (getApps().length > 0) {
        setIsInitialized(true)
      } else {
        setTimeout(checkFirebaseInit, 100)
      }
    }

    checkFirebaseInit()
  }, [])

  if (!isInitialized) {
    return <div>Inicializando Firebase...</div>
  }

  return null
}

