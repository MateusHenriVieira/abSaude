"use client"

import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../lib/firebaseConfig"

export function FirestoreTest() {
  const [testData, setTestData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "test"))
        const data = querySnapshot.docs.map((doc) => doc.data())
        setTestData(JSON.stringify(data))
      } catch (err) {
        console.error("Error fetching Firestore data:", err)
        setError("Erro ao buscar dados do Firestore")
      }
    }

    fetchData()
  }, [])

  if (error) {
    return <div>Erro: {error}</div>
  }

  if (!testData) {
    return <div>Carregando dados do Firestore...</div>
  }

  return <div>Dados do Firestore: {testData}</div>
}

