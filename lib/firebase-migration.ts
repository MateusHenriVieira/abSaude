import { collection, doc, setDoc, getDoc, getDocs, query, where, serverTimestamp, writeBatch, deleteDoc } from "firebase/firestore"
import { db } from "./firebase-init"

/**
 * Função para migrar dados da estrutura antiga para a nova estrutura
 */
export async function migrateToNewStructure() {
  try {
    console.log("Iniciando migração para nova estrutura...")

    // Criar a estrutura base do gestor
    await setDoc(doc(db, "gestor", "gestor-user"), {
      createdAt: serverTimestamp(),
    })

    // Migrar clínicas
    const oldClinicsRef = collection(db, "clinics")
    const oldClinicsSnapshot = await getDocs(oldClinicsRef)

    console.log(`Migrando ${oldClinicsSnapshot.size} clínicas...`)

    for (const oldClinicDoc of oldClinicsSnapshot.docs) {
      const oldClinicData = oldClinicDoc.data()

      // Criar a clínica na nova estrutura
      const newClinicRef = doc(db, "clinics", oldClinicDoc.id)
      await setDoc(newClinicRef, {
        ...oldClinicData,
        updatedAt: serverTimestamp(),
      })

      // Criar as subcoleções necessárias
      await Promise.all([
        setDoc(doc(collection(newClinicRef, "users"), "init"), { init: true }),
        setDoc(doc(collection(newClinicRef, "doctors"), "init"), { init: true }),
        setDoc(doc(collection(newClinicRef, "Notifcacao-em-massa"), "init"), { init: true }),
        setDoc(doc(collection(newClinicRef, "Relatorios-geral"), "init"), { init: true }),
        setDoc(doc(collection(newClinicRef, "Relaorio-médico"), "init"), { init: true }),
        setDoc(doc(collection(newClinicRef, "Agentes-de-saúde"), "init"), { init: true }),
        setDoc(doc(collection(newClinicRef, "Tela-chamada-pacientes"), "init"), { init: true }),
      ])

      // Remover documentos de inicialização
      const batch = writeBatch(db)
      batch.delete(doc(collection(newClinicRef, "users"), "init"))
      batch.delete(doc(collection(newClinicRef, "doctors"), "init"))
      batch.delete(doc(collection(newClinicRef, "Notifcacao-em-massa"), "init"))
      batch.delete(doc(collection(newClinicRef, "Relatorios-geral"), "init"))
      batch.delete(doc(collection(newClinicRef, "Relaorio-médico"), "init"))
      batch.delete(doc(collection(newClinicRef, "Agentes-de-saúde"), "init"))
      batch.delete(doc(collection(newClinicRef, "Tela-chamada-pacientes"), "init"))
      await batch.commit()

      // Migrar usuários
      await migrateUsersForClinic(oldClinicDoc.id)

      // Migrar médicos
      await migrateDoctorsForClinic(oldClinicDoc.id)

      // Migrar consultas
      await migrateConsultationsForClinic(oldClinicDoc.id)

      // Migrar exames
      await migrateExamsForClinic(oldClinicDoc.id)
    }

    console.log("Migração concluída com sucesso!")
    return true
  } catch (error) {
    console.error("Erro durante a migração:", error)
    throw error
  }
}

/**
 * Migra usuários de uma clínica
 */
async function migrateUsersForClinic(clinicId: string) {
  try {
    console.log(`Migrando usuários para a clínica ${clinicId}...`)

    // Buscar usuários da clínica na estrutura antiga
    const oldUsersRef = collection(db, "users")
    const q = query(oldUsersRef, where("clinicId", "==", clinicId))
    const oldUsersSnapshot = await getDocs(q)

    console.log(`Encontrados ${oldUsersSnapshot.size} usuários para migrar...`)

    const clinicRef = doc(db, "clinics", clinicId)
    const newUsersRef = collection(clinicRef, "users")

    for (const oldUserDoc of oldUsersSnapshot.docs) {
      const oldUserData = oldUserDoc.data()

      // Criar o usuário na nova estrutura
      const newUserRef = doc(newUsersRef, oldUserDoc.id)
      await setDoc(newUserRef, {
        ...oldUserData,
        updatedAt: serverTimestamp(),
      })

      // Criar subcoleções apropriadas com base no tipo de usuário
      if (oldUserData.type !== "patient") {
        // Para usuários que não são pacientes, criar todas as subcoleções
        await Promise.all([
          setDoc(doc(collection(newUserRef, "Historico-de-acesso-horário"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Tipos-Atendimeos"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Atendimentos"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Pacientes"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Relatorios"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Horarios"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Historico-atendimentos"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Notificações"), "init"), { init: true }),
        ])

        // Remover documentos de inicialização
        const batch = writeBatch(db)
        batch.delete(doc(collection(newUserRef, "Historico-de-acesso-horário"), "init"))
        batch.delete(doc(collection(newUserRef, "Tipos-Atendimeos"), "init"))
        batch.delete(doc(collection(newUserRef, "Atendimentos"), "init"))
        batch.delete(doc(collection(newUserRef, "Pacientes"), "init"))
        batch.delete(doc(collection(newUserRef, "Relatorios"), "init"))
        batch.delete(doc(collection(newUserRef, "Horarios"), "init"))
        batch.delete(doc(collection(newUserRef, "Historico-atendimentos"), "init"))
        batch.delete(doc(collection(newUserRef, "Notificações"), "init"))
        await batch.commit()
      } else {
        // Para pacientes, criar apenas as subcoleções necessárias
        await Promise.all([
          setDoc(doc(collection(newUserRef, "Notificações"), "init"), { init: true }),
          setDoc(doc(collection(newUserRef, "Historico-atendimentos"), "init"), { init: true }),
        ])

        // Remover documentos de inicialização
        const batch = writeBatch(db)
        batch.delete(doc(collection(newUserRef, "Notificações"), "init"))
        batch.delete(doc(collection(newUserRef, "Historico-atendimentos"), "init"))
        await batch.commit()
      }
    }

    console.log(`Migração de usuários para a clínica ${clinicId} concluída!`)
    return true
  } catch (error) {
    console.error(`Erro ao migrar usuários para a clínica ${clinicId}:`, error)
    throw error
  }
}

/**
 * Migra médicos de uma clínica
 */
async function migrateDoctorsForClinic(clinicId: string) {
  try {
    console.log(`Migrando médicos para a clínica ${clinicId}...`)

    // Buscar médicos da clínica na estrutura antiga
    const oldDoctorsRef = collection(db, "doctors")
    const q = query(oldDoctorsRef, where("clinicId", "==", clinicId))
    const oldDoctorsSnapshot = await getDocs(q)

    console.log(`Encontrados ${oldDoctorsSnapshot.size} médicos para migrar...`)

    const clinicRef = doc(db, "clinics", clinicId)
    const newDoctorsRef = collection(clinicRef, "doctors")

    for (const oldDoctorDoc of oldDoctorsSnapshot.docs) {
      const oldDoctorData = oldDoctorDoc.data()

      // Criar o médico na nova estrutura
      const newDoctorRef = doc(newDoctorsRef, oldDoctorDoc.id)

      // Determinar o userId com base nos dados antigos
      let userId = oldDoctorData.userId

      // Se não houver userId, tentar encontrar um usuário correspondente
      if (!userId) {
        const usersRef = collection(clinicRef, "users")
        const userQuery = query(
          usersRef,
          where("type", "in", ["doctor", "nurse"]),
          where("name", "==", `${oldDoctorData.firstName} ${oldDoctorData.lastName}`),
        )

        const userSnapshot = await getDocs(userQuery)

        if (!userSnapshot.empty) {
          userId = userSnapshot.docs[0].id
        }
      }

      await setDoc(newDoctorRef, {
        ...oldDoctorData,
        name: `${oldDoctorData.firstName} ${oldDoctorData.lastName}`,
        userId: userId || null,
        updatedAt: serverTimestamp(),
      })

      // Criar subcoleção de agendamentos
      await setDoc(doc(collection(newDoctorRef, "Agendamentos"), "init"), { init: true })
      await getDoc(doc(collection(newDoctorRef, "Agendamentos"), "init")).then((doc) => {
        if (doc.exists()) {
          return deleteDoc(doc.ref)
        }
      })

      // Se houver userId, atualizar o usuário com a referência ao médico
      if (userId) {
        const userRef = doc(collection(clinicRef, "users"), userId)
        await setDoc(userRef, { doctorId: oldDoctorDoc.id }, { merge: true })
      }
    }

    console.log(`Migração de médicos para a clínica ${clinicId} concluída!`)
    return true
  } catch (error) {
    console.error(`Erro ao migrar médicos para a clínica ${clinicId}:`, error)
    throw error
  }
}

/**
 * Migra consultas de uma clínica
 */
async function migrateConsultationsForClinic(clinicId: string) {
  try {
    console.log(`Migrando consultas para a clínica ${clinicId}...`)

    // Buscar consultas da clínica na estrutura antiga
    const oldConsultationsRef = collection(db, "consultations")
    const q = query(oldConsultationsRef, where("clinicId", "==", clinicId))
    const oldConsultationsSnapshot = await getDocs(q)

    console.log(`Encontradas ${oldConsultationsSnapshot.size} consultas para migrar...`)

    const clinicRef = doc(db, "clinics", clinicId)

    for (const oldConsultationDoc of oldConsultationsSnapshot.docs) {
      const oldConsultationData = oldConsultationDoc.data()

      // Verificar se tem doctorId
      if (!oldConsultationData.doctorId) {
        console.warn(`Consulta ${oldConsultationDoc.id} não tem doctorId, pulando...`)
        continue
      }

      // Obter referência ao médico
      const doctorRef = doc(collection(clinicRef, "doctors"), oldConsultationData.doctorId)
      const doctorSnap = await getDoc(doctorRef)

      if (!doctorSnap.exists()) {
        console.warn(
          `Médico ${oldConsultationData.doctorId} não encontrado, pulando consulta ${oldConsultationDoc.id}...`,
        )
        continue
      }

      const doctorData = doctorSnap.data()

      // Adicionar a consulta na subcoleção Agendamentos do médico
      const appointmentsRef = collection(doctorRef, "Agendamentos")
      await setDoc(doc(appointmentsRef, oldConsultationDoc.id), {
        ...oldConsultationData,
        type: "consulta",
        updatedAt: serverTimestamp(),
      })

      // Se o médico tiver userId, adicionar a consulta na subcoleção Atendimentos do usuário
      if (doctorData.userId) {
        const userRef = doc(collection(clinicRef, "users"), doctorData.userId)
        const userAppointmentsRef = collection(userRef, "Atendimentos")
        await setDoc(doc(userAppointmentsRef, oldConsultationDoc.id), {
          ...oldConsultationData,
          type: "consulta",
          updatedAt: serverTimestamp(),
        })
      }

      // Se a consulta estiver concluída, adicionar ao histórico
      if (oldConsultationData.status === "Concluída") {
        // Adicionar ao histórico do médico se tiver userId
        if (doctorData.userId) {
          const userRef = doc(collection(clinicRef, "users"), doctorData.userId)
          const userHistoryRef = collection(userRef, "Historico-atendimentos")
          await setDoc(doc(userHistoryRef, oldConsultationDoc.id), {
            ...oldConsultationData,
            type: "consulta",
            completedAt: oldConsultationData.updatedAt || serverTimestamp(),
          })
        }

        // Tentar adicionar ao histórico do paciente se tiver patientId
        if (oldConsultationData.patientId) {
          const patientRef = doc(collection(clinicRef, "users"), oldConsultationData.patientId)
          const patientSnap = await getDoc(patientRef)

          if (patientSnap.exists()) {
            const patientHistoryRef = collection(patientRef, "Historico-atendimentos")
            await setDoc(doc(patientHistoryRef, oldConsultationDoc.id), {
              ...oldConsultationData,
              type: "consulta",
              completedAt: oldConsultationData.updatedAt || serverTimestamp(),
            })
          }
        }
      }
    }

    console.log(`Migração de consultas para a clínica ${clinicId} concluída!`)
    return true
  } catch (error) {
    console.error(`Erro ao migrar consultas para a clínica ${clinicId}:`, error)
    throw error
  }
}

/**
 * Migra exames de uma clínica
 */
async function migrateExamsForClinic(clinicId: string) {
  try {
    console.log(`Migrando exames para a clínica ${clinicId}...`)

    // Buscar exames da clínica na estrutura antiga
    const oldExamsRef = collection(db, "exams")
    const q = query(oldExamsRef, where("clinicId", "==", clinicId))
    const oldExamsSnapshot = await getDocs(q)

    console.log(`Encontrados ${oldExamsSnapshot.size} exames para migrar...`)

    const clinicRef = doc(db, "clinics", clinicId)

    for (const oldExamDoc of oldExamsSnapshot.docs) {
      const oldExamData = oldExamDoc.data()

      // Verificar se tem doctorId
      if (!oldExamData.doctorId) {
        // Para exames sem médico, tentar encontrar um médico disponível
        const doctorsRef = collection(clinicRef, "doctors")
        const doctorsSnapshot = await getDocs(doctorsRef)

        if (doctorsSnapshot.empty) {
          console.warn(`Não há médicos na clínica ${clinicId}, pulando exame ${oldExamDoc.id}...`)
          continue
        }

        // Usar o primeiro médico encontrado
        const doctorRef = doctorsSnapshot.docs[0].ref
        const doctorData = doctorsSnapshot.docs[0].data()

        // Adicionar o exame na subcoleção Agendamentos do médico
        const appointmentsRef = collection(doctorRef, "Agendamentos")
        await setDoc(doc(appointmentsRef, oldExamDoc.id), {
          ...oldExamData,
          doctorId: doctorsSnapshot.docs[0].id,
          doctorName: doctorData.name || "Médico não especificado",
          type: "exame",
          updatedAt: serverTimestamp(),
        })

        // Se o médico tiver userId, adicionar o exame na subcoleção Atendimentos do usuário
        if (doctorData.userId) {
          const userRef = doc(collection(clinicRef, "users"), doctorData.userId)
          const userAppointmentsRef = collection(userRef, "Atendimentos")
          await setDoc(doc(userAppointmentsRef, oldExamDoc.id), {
            ...oldExamData,
            doctorId: doctorsSnapshot.docs[0].id,
            doctorName: doctorData.name || "Médico não especificado",
            type: "exame",
            updatedAt: serverTimestamp(),
          })
        }
      } else {
        // Exame com médico especificado
        const doctorRef = doc(collection(clinicRef, "doctors"), oldExamData.doctorId)
        const doctorSnap = await getDoc(doctorRef)

        if (!doctorSnap.exists()) {
          console.warn(`Médico ${oldExamData.doctorId} não encontrado, pulando exame ${oldExamDoc.id}...`)
          continue
        }

        const doctorData = doctorSnap.data()

        // Adicionar o exame na subcoleção Agendamentos do médico
        const appointmentsRef = collection(doctorRef, "Agendamentos")
        await setDoc(doc(appointmentsRef, oldExamDoc.id), {
          ...oldExamData,
          type: "exame",
          updatedAt: serverTimestamp(),
        })

        // Se o médico tiver userId, adicionar o exame na subcoleção Atendimentos do usuário
        if (doctorData.userId) {
          const userRef = doc(collection(clinicRef, "users"), doctorData.userId)
          const userAppointmentsRef = collection(userRef, "Atendimentos")
          await setDoc(doc(userAppointmentsRef, oldExamDoc.id), {
            ...oldExamData,
            type: "exame",
            updatedAt: serverTimestamp(),
          })
        }
      }

      // Se o exame estiver concluído, adicionar ao histórico
      if (oldExamData.status === "Concluído") {
        // Adicionar ao histórico do médico se tiver doctorId e o médico tiver userId
        if (oldExamData.doctorId) {
          const doctorRef = doc(collection(clinicRef, "doctors"), oldExamData.doctorId)
          const doctorSnap = await getDoc(doctorRef)

          if (doctorSnap.exists()) {
            const doctorData = doctorSnap.data()

            if (doctorData.userId) {
              const userRef = doc(collection(clinicRef, "users"), doctorData.userId)
              const userHistoryRef = collection(userRef, "Historico-atendimentos")
              await setDoc(doc(userHistoryRef, oldExamDoc.id), {
                ...oldExamData,
                type: "exame",
                completedAt: oldExamData.updatedAt || serverTimestamp(),
              })
            }
          }
        }

        // Tentar adicionar ao histórico do paciente se tiver patientId
        if (oldExamData.patientId) {
          const patientRef = doc(collection(clinicRef, "users"), oldExamData.patientId)
          const patientSnap = await getDoc(patientRef)

          if (patientSnap.exists()) {
            const patientHistoryRef = collection(patientRef, "Historico-atendimentos")
            await setDoc(doc(patientHistoryRef, oldExamDoc.id), {
              ...oldExamData,
              type: "exame",
              completedAt: oldExamData.updatedAt || serverTimestamp(),
            })
          }
        }
      }
    }

    console.log(`Migração de exames para a clínica ${clinicId} concluída!`)
    return true
  } catch (error) {
    console.error(`Erro ao migrar exames para a clínica ${clinicId}:`, error)
    throw error
  }
}

