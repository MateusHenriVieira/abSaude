import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore"
import { auth, db } from "./firebase-init"
import { format } from "date-fns"

// Estrutura principal de coleções
const GESTOR_COLLECTION = "gestor"
const GESTOR_USER_COLLECTION = "gestor-user"
const CLINICS_COLLECTION = "clinics"
const USERS_COLLECTION = "users"
const DOCTORS_COLLECTION = "doctors"

// ===== FUNÇÕES PARA GESTOR =====

/**
 * Adiciona um relatório geral para o gestor
 */
export async function addGestorGeneralReport(reportData: any) {
  try {
    const gestorRef = doc(db, GESTOR_COLLECTION, GESTOR_USER_COLLECTION)
    const reportsRef = collection(gestorRef, "Relatorios-geral")

    const reportWithMetadata = {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(reportsRef, reportWithMetadata)
    return { id: docRef.id, ...reportWithMetadata }
  } catch (error) {
    console.error("Erro ao adicionar relatório geral:", error)
    throw error
  }
}

/**
 * Adiciona um relatório específico para um posto de saúde
 */
export async function addGestorSpecificReport(clinicId: string, reportData: any) {
  try {
    const gestorRef = doc(db, GESTOR_COLLECTION, GESTOR_USER_COLLECTION)
    const reportsRef = collection(gestorRef, "Relatorio-especifico")

    const reportWithMetadata = {
      ...reportData,
      clinicId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(reportsRef, reportWithMetadata)
    return { id: docRef.id, ...reportWithMetadata }
  } catch (error) {
    console.error("Erro ao adicionar relatório específico:", error)
    throw error
  }
}

/**
 * Obtém todos os relatórios gerais
 */
export async function getGestorGeneralReports() {
  try {
    const gestorRef = doc(db, GESTOR_COLLECTION, GESTOR_USER_COLLECTION)
    const reportsRef = collection(gestorRef, "Relatorios-geral")
    const q = query(reportsRef, orderBy("createdAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter relatórios gerais:", error)
    throw error
  }
}

/**
 * Obtém relatórios específicos de um posto de saúde
 */
export async function getGestorSpecificReports(clinicId: string) {
  try {
    const gestorRef = doc(db, GESTOR_COLLECTION, GESTOR_USER_COLLECTION)
    const reportsRef = collection(gestorRef, "Relatorio-especifico")
    const q = query(reportsRef, where("clinicId", "==", clinicId), orderBy("createdAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter relatórios específicos:", error)
    throw error
  }
}

// ===== FUNÇÕES PARA CLÍNICAS =====

/**
 * Adiciona uma nova clínica (posto de saúde)
 */
export async function addClinic(clinicData: any) {
  try {
    const gestorRef = doc(db, "gestor");
    const clinicsRef = collection(gestorRef, "clinics");

    const clinicWithMetadata = {
      ...clinicData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(clinicsRef, clinicWithMetadata);

    // Criar as subcoleções necessárias
    const clinicDoc = doc(clinicsRef, docRef.id);

    // Inicializar subcoleções vazias
    await Promise.all([
      setDoc(doc(collection(clinicDoc, "users"), "init"), { init: true }),
      setDoc(doc(collection(clinicDoc, "doctors"), "init"), { init: true }),
      setDoc(doc(collection(clinicDoc, "Notifcacao-em-massa"), "init"), { init: true }),
      setDoc(doc(collection(clinicDoc, "Relatorios-geral"), "init"), { init: true }),
      setDoc(doc(collection(clinicDoc, "Relaorio-médico"), "init"), { init: true }),
      setDoc(doc(collection(clinicDoc, "Agentes-de-saúde"), "init"), { init: true }),
      setDoc(doc(collection(clinicDoc, "Tela-chamada-pacientes"), "init"), { init: true }),
    ]);

    // Remover documentos de inicialização
    const batch = writeBatch(db);
    batch.delete(doc(collection(clinicDoc, "users"), "init"));
    batch.delete(doc(collection(clinicDoc, "doctors"), "init"));
    batch.delete(doc(collection(clinicDoc, "Notifcacao-em-massa"), "init"));
    batch.delete(doc(collection(clinicDoc, "Relatorios-geral"), "init"));
    batch.delete(doc(collection(clinicDoc, "Relaorio-médico"), "init"));
    batch.delete(doc(collection(clinicDoc, "Agentes-de-saúde"), "init"));
    batch.delete(doc(collection(clinicDoc, "Tela-chamada-pacientes"), "init"));
    await batch.commit();

    return { id: docRef.id, ...clinicWithMetadata };
  } catch (error) {
    console.error("Erro ao adicionar clínica:", error);
    throw error;
  }
}

/**
 * Obtém todas as clínicas
 */
export async function getClinics() {
  try {
    const clinicsRef = collection(db, CLINICS_COLLECTION)
    const q = query(clinicsRef, orderBy("createdAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter clínicas:", error)
    throw error
  }
}

/**
 * Obtém uma clínica específica
 */
export async function getClinic(clinicId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const clinicSnap = await getDoc(clinicRef)

    if (clinicSnap.exists()) {
      return {
        id: clinicSnap.id,
        ...clinicSnap.data(),
      }
    }

    return null
  } catch (error) {
    console.error("Erro ao obter clínica:", error)
    throw error
  }
}

// ===== FUNÇÕES PARA USUÁRIOS =====

/**
 * Adiciona um novo usuário a uma clínica
 */
export async function addUserToClinic(clinicId: string, userData: any) {
  try {
    const gestorRef = doc(db, "gestor");
    const clinicsRef = collection(gestorRef, "clinics");
    const clinicRef = doc(clinicsRef, clinicId);
    const usersRef = collection(clinicRef, "users");

    const userWithMetadata = {
      ...userData,
      clinicId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(usersRef, userWithMetadata);
    const userDoc = doc(usersRef, docRef.id);

    // Criar subcoleções apropriadas com base no tipo de usuário
    if (userData.type !== "patient") {
      // Para usuários que não são pacientes, criar todas as subcoleções
      await Promise.all([
        setDoc(doc(collection(userDoc, "Historico-de-acesso-horário"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Tipos-Atendimeos"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Atendimentos"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Pacientes"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Relatorios"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Horarios"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Historico-atendimentos"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Notificações"), "init"), { init: true }),
      ]);

      // Remover documentos de inicialização
      const batch = writeBatch(db);
      batch.delete(doc(collection(userDoc, "Historico-de-acesso-horário"), "init"));
      batch.delete(doc(collection(userDoc, "Tipos-Atendimeos"), "init"));
      batch.delete(doc(collection(userDoc, "Atendimentos"), "init"));
      batch.delete(doc(collection(userDoc, "Pacientes"), "init"));
      batch.delete(doc(collection(userDoc, "Relatorios"), "init"));
      batch.delete(doc(collection(userDoc, "Horarios"), "init"));
      batch.delete(doc(collection(userDoc, "Historico-atendimentos"), "init"));
      batch.delete(doc(collection(userDoc, "Notificações"), "init"));
      await batch.commit();

      // Se for médico ou enfermeiro, adicionar à coleção doctors
      if (userData.type === "doctor" || userData.type === "nurse") {
        const doctorsRef = collection(clinicRef, "doctors");
        const doctorData = {
          userId: docRef.id,
          name: userData.name,
          type: userData.type,
          createdAt: serverTimestamp(),
        };

        const doctorDocRef = await addDoc(doctorsRef, doctorData);

        // Criar subcoleção de agendamentos para o médico
        const doctorDoc = doc(doctorsRef, doctorDocRef.id);
        await setDoc(doc(collection(doctorDoc, "Agendamentos"), "init"), { init: true });
        await deleteDoc(doc(collection(doctorDoc, "Agendamentos"), "init"));

        // Atualizar o usuário com a referência ao médico
        await updateDoc(userDoc, { doctorId: doctorDocRef.id });
      }

      // Se for agente de saúde, adicionar à coleção Agentes-de-saúde
      if (userData.type === "agent") {
        const agentsRef = collection(clinicRef, "Agentes-de-saúde");
        const agentData = {
          userId: docRef.id,
          name: userData.name,
          createdAt: serverTimestamp(),
        };

        await addDoc(agentsRef, agentData);
      }
    } else {
      // Para pacientes, criar apenas as subcoleções necessárias
      await Promise.all([
        setDoc(doc(collection(userDoc, "Notificações"), "init"), { init: true }),
        setDoc(doc(collection(userDoc, "Historico-atendimentos"), "init"), { init: true }),
      ]);

      // Remover documentos de inicialização
      const batch = writeBatch(db);
      batch.delete(doc(collection(userDoc, "Notificações"), "init"));
      batch.delete(doc(collection(userDoc, "Historico-atendimentos"), "init"));
      await batch.commit();
    }

    return { id: docRef.id, ...userWithMetadata };
  } catch (error) {
    console.error("Erro ao adicionar usuário à clínica:", error);
    throw error;
  }
}

/**
 * Obtém todos os usuários de uma clínica
 */
export async function getUsersByClinic(clinicId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const usersRef = collection(clinicRef, "users")
    const q = query(usersRef, orderBy("createdAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter usuários da clínica:", error)
    throw error
  }
}

/**
 * Obtém um usuário específico de uma clínica
 */
export async function getUserFromClinic(clinicId: string, userId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const userRef = doc(collection(clinicRef, "users"), userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      return {
        id: userSnap.id,
        ...userSnap.data(),
      }
    }

    return null
  } catch (error) {
    console.error("Erro ao obter usuário da clínica:", error)
    throw error
  }
}

/**
 * Registra o acesso de um usuário
 */
export async function logUserAccess(clinicId: string, userId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const userRef = doc(collection(clinicRef, "users"), userId)
    const accessLogRef = collection(userRef, "Historico-de-acesso-horário")

    const now = new Date()
    const logData = {
      date: format(now, "yyyy-MM-dd"),
      timeIn: format(now, "HH:mm:ss"),
      timestamp: serverTimestamp(),
    }

    await addDoc(accessLogRef, logData)
    return logData
  } catch (error) {
    console.error("Erro ao registrar acesso do usuário:", error)
    throw error
  }
}

/**
 * Registra a saída de um usuário
 */
export async function logUserExit(clinicId: string, userId: string, accessLogId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const userRef = doc(collection(clinicRef, "users"), userId)
    const accessLogRef = doc(collection(userRef, "Historico-de-acesso-horário"), accessLogId)

    const now = new Date()
    await updateDoc(accessLogRef, {
      timeOut: format(now, "HH:mm:ss"),
      updatedAt: serverTimestamp(),
    })

    return true
  } catch (error) {
    console.error("Erro ao registrar saída do usuário:", error)
    throw error
  }
}

// ===== FUNÇÕES PARA ATENDIMENTOS =====

/**
 * Agenda um atendimento (consulta ou exame)
 */
export async function scheduleAppointment(clinicId: string, doctorId: string, appointmentData: any) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const doctorsRef = collection(clinicRef, "doctors")
    const doctorRef = doc(doctorsRef, doctorId)
    const appointmentsRef = collection(doctorRef, "Agendamentos")

    // Obter informações do médico
    const doctorSnap = await getDoc(doctorRef)
    if (!doctorSnap.exists()) {
      throw new Error("Médico não encontrado")
    }

    const doctorData = doctorSnap.data()
    const userId = doctorData.userId

    // Obter informações do paciente
    const patientRef = doc(collection(clinicRef, "users"), appointmentData.patientId)
    const patientSnap = await getDoc(patientRef)
    if (!patientSnap.exists()) {
      throw new Error("Paciente não encontrado")
    }

    const patientData = patientSnap.data()

    // Criar o documento de agendamento
    const appointmentWithMetadata = {
      ...appointmentData,
      doctorId,
      doctorName: doctorData.name,
      patientName: patientData.name,
      status: "Agendado",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Adicionar o agendamento na subcoleção do médico
    const appointmentRef = await addDoc(appointmentsRef, appointmentWithMetadata)

    // Adicionar o agendamento na subcoleção Atendimentos do médico
    const userRef = doc(collection(clinicRef, "users"), userId)
    const userAppointmentsRef = collection(userRef, "Atendimentos")
    await setDoc(doc(userAppointmentsRef, appointmentRef.id), appointmentWithMetadata)

    // Adicionar notificação para o médico
    const userNotificationsRef = collection(userRef, "Notificações")
    await addDoc(userNotificationsRef, {
      title: `Novo ${appointmentData.type === "consulta" ? "Consulta" : "Exame"} Agendado`,
      message: `${appointmentData.type === "consulta" ? "Consulta" : "Exame"} agendado para ${patientData.name} em ${format(new Date(appointmentData.date), "dd/MM/yyyy")} às ${appointmentData.time}`,
      read: false,
      createdAt: serverTimestamp(),
    })

    // Adicionar notificação para o paciente
    const patientNotificationsRef = collection(patientRef, "Notificações")
    await addDoc(patientNotificationsRef, {
      title: `${appointmentData.type === "consulta" ? "Consulta" : "Exame"} Agendado`,
      message: `Você tem um ${appointmentData.type === "consulta" ? "consulta" : "exame"} agendado com Dr(a). ${doctorData.name} em ${format(new Date(appointmentData.date), "dd/MM/yyyy")} às ${appointmentData.time}`,
      read: false,
      createdAt: serverTimestamp(),
    })

    return { id: appointmentRef.id, ...appointmentWithMetadata }
  } catch (error) {
    console.error("Erro ao agendar atendimento:", error)
    throw error
  }
}

/**
 * Atualiza o status de um atendimento
 */
export async function updateAppointmentStatus(
  clinicId: string,
  doctorId: string,
  appointmentId: string,
  newStatus: string,
) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const doctorsRef = collection(clinicRef, "doctors")
    const doctorRef = doc(doctorsRef, doctorId)
    const appointmentRef = doc(collection(doctorRef, "Agendamentos"), appointmentId)

    // Obter informações do médico
    const doctorSnap = await getDoc(doctorRef)
    if (!doctorSnap.exists()) {
      throw new Error("Médico não encontrado")
    }

    const doctorData = doctorSnap.data()
    const userId = doctorData.userId

    // Atualizar o status do agendamento
    await updateDoc(appointmentRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    })

    // Atualizar o status na subcoleção Atendimentos do médico
    const userRef = doc(collection(clinicRef, "users"), userId)
    const userAppointmentRef = doc(collection(userRef, "Atendimentos"), appointmentId)
    await updateDoc(userAppointmentRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    })

    // Se o status for "Concluído", mover para o histórico de atendimentos
    if (newStatus === "Concluído") {
      // Obter dados do agendamento
      const appointmentSnap = await getDoc(appointmentRef)
      if (!appointmentSnap.exists()) {
        throw new Error("Agendamento não encontrado")
      }

      const appointmentData = appointmentSnap.data()

      // Adicionar ao histórico do médico
      const userHistoryRef = collection(userRef, "Historico-atendimentos")
      await setDoc(doc(userHistoryRef, appointmentId), {
        ...appointmentData,
        status: newStatus,
        completedAt: serverTimestamp(),
      })

      // Adicionar ao histórico do paciente
      const patientRef = doc(collection(clinicRef, "users"), appointmentData.patientId)
      const patientHistoryRef = collection(patientRef, "Historico-atendimentos")
      await setDoc(doc(patientHistoryRef, appointmentId), {
        ...appointmentData,
        status: newStatus,
        completedAt: serverTimestamp(),
      })
    }

    return true
  } catch (error) {
    console.error("Erro ao atualizar status do atendimento:", error)
    throw error
  }
}

/**
 * Obtém todos os agendamentos de um médico
 */
export async function getDoctorAppointments(clinicId: string, doctorId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const doctorsRef = collection(clinicRef, "doctors")
    const doctorRef = doc(doctorsRef, doctorId)
    const appointmentsRef = collection(doctorRef, "Agendamentos")
    const q = query(appointmentsRef, orderBy("date", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter agendamentos do médico:", error)
    throw error
  }
}

/**
 * Obtém todos os atendimentos de um usuário
 */
export async function getUserAppointments(clinicId: string, userId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const userRef = doc(collection(clinicRef, "users"), userId)
    const appointmentsRef = collection(userRef, "Atendimentos")
    const q = query(appointmentsRef, orderBy("date", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter atendimentos do usuário:", error)
    throw error
  }
}

/**
 * Obtém o histórico de atendimentos de um usuário
 */
export async function getUserAppointmentHistory(clinicId: string, userId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const userRef = doc(collection(clinicRef, "users"), userId)
    const historyRef = collection(userRef, "Historico-atendimentos")
    const q = query(historyRef, orderBy("completedAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter histórico de atendimentos do usuário:", error)
    throw error
  }
}

// ===== FUNÇÕES PARA NOTIFICAÇÕES =====

/**
 * Envia uma notificação em massa para todos os pacientes de uma clínica
 */
export async function sendMassNotification(clinicId: string, notificationData: any) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const notificationsRef = collection(clinicRef, "Notifcacao-em-massa")

    // Adicionar metadados à notificação
    const notificationWithMetadata = {
      ...notificationData,
      createdAt: serverTimestamp(),
      sentBy: auth.currentUser?.uid || "system",
    }

    // Salvar a notificação em massa
    const notificationRef = await addDoc(notificationsRef, notificationWithMetadata)

    // Buscar todos os pacientes da clínica
    const usersRef = collection(clinicRef, "users")
    const q = query(usersRef, where("type", "==", "patient"))
    const patientsSnapshot = await getDocs(q)

    // Enviar notificação para cada paciente
    const batch = writeBatch(db)
    patientsSnapshot.docs.forEach((patientDoc) => {
      const patientNotificationsRef = collection(patientDoc.ref, "Notificações")
      const notificationDoc = doc(patientNotificationsRef)
      batch.set(notificationDoc, {
        title: notificationData.title,
        message: notificationData.message,
        read: false,
        createdAt: serverTimestamp(),
        massNotificationId: notificationRef.id,
      })
    })

    await batch.commit()

    return { id: notificationRef.id, ...notificationWithMetadata, recipientCount: patientsSnapshot.size }
  } catch (error) {
    console.error("Erro ao enviar notificação em massa:", error)
    throw error
  }
}

/**
 * Obtém todas as notificações de um usuário
 */
export async function getUserNotifications(clinicId: string, userId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const userRef = doc(collection(clinicRef, "users"), userId)
    const notificationsRef = collection(userRef, "Notificações")
    const q = query(notificationsRef, orderBy("createdAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao obter notificações do usuário:", error)
    throw error
  }
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(clinicId: string, userId: string, notificationId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const userRef = doc(collection(clinicRef, "users"), userId)
    const notificationRef = doc(collection(userRef, "Notificações"), notificationId)

    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    })

    return true
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error)
    throw error
  }
}

// ===== FUNÇÕES PARA RELATÓRIOS =====

/**
 * Gera um relatório geral para uma clínica
 */
export async function generateClinicGeneralReport(clinicId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)

    // Buscar todos os usuários
    const usersRef = collection(clinicRef, "users")
    const usersSnapshot = await getDocs(usersRef)

    // Contar usuários por tipo
    const userCounts = {
      total: usersSnapshot.size,
      patients: 0,
      doctors: 0,
      nurses: 0,
      receptionists: 0,
      agents: 0,
      others: 0,
    }

    usersSnapshot.docs.forEach((doc) => {
      const userData = doc.data()
      switch (userData.type) {
        case "patient":
          userCounts.patients++
          break
        case "doctor":
          userCounts.doctors++
          break
        case "nurse":
          userCounts.nurses++
          break
        case "receptionist":
          userCounts.receptionists++
          break
        case "agent":
          userCounts.agents++
          break
        default:
          userCounts.others++
      }
    })

    // Buscar todos os médicos
    const doctorsRef = collection(clinicRef, "doctors")
    const doctorsSnapshot = await getDocs(doctorsRef)

    // Contar atendimentos
    let totalAppointments = 0
    let completedAppointments = 0
    let pendingAppointments = 0
    let canceledAppointments = 0

    // Contar atendimentos por tipo
    let consultations = 0
    let exams = 0

    // Para cada médico, buscar seus agendamentos
    for (const doctorDoc of doctorsSnapshot.docs) {
      const appointmentsRef = collection(doctorDoc.ref, "Agendamentos")
      const appointmentsSnapshot = await getDocs(appointmentsRef)

      totalAppointments += appointmentsSnapshot.size

      appointmentsSnapshot.docs.forEach((doc) => {
        const appointmentData = doc.data()

        // Contar por status
        switch (appointmentData.status) {
          case "Concluído":
            completedAppointments++
            break
          case "Agendado":
          case "Em Andamento":
            pendingAppointments++
            break
          case "Cancelado":
            canceledAppointments++
            break
        }

        // Contar por tipo
        if (appointmentData.type === "consulta") {
          consultations++
        } else if (appointmentData.type === "exame") {
          exams++
        }
      })
    }

    // Criar o relatório
    const reportData = {
      clinicId,
      date: format(new Date(), "yyyy-MM-dd"),
      users: userCounts,
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        pending: pendingAppointments,
        canceled: canceledAppointments,
        consultations,
        exams,
      },
      createdAt: serverTimestamp(),
    }

    // Salvar o relatório
    const reportsRef = collection(clinicRef, "Relatorios-geral")
    const reportRef = await addDoc(reportsRef, reportData)

    // Também salvar no gestor
    await addGestorSpecificReport(clinicId, reportData)

    return { id: reportRef.id, ...reportData }
  } catch (error) {
    console.error("Erro ao gerar relatório geral da clínica:", error)
    throw error
  }
}

/**
 * Gera um relatório específico para um médico
 */
export async function generateDoctorReport(clinicId: string, doctorId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const doctorsRef = collection(clinicRef, "doctors")
    const doctorRef = doc(doctorsRef, doctorId)

    // Obter informações do médico
    const doctorSnap = await getDoc(doctorRef)
    if (!doctorSnap.exists()) {
      throw new Error("Médico não encontrado")
    }

    const doctorData = doctorSnap.data()
    const userId = doctorData.userId

    // Buscar agendamentos do médico
    const appointmentsRef = collection(doctorRef, "Agendamentos")
    const appointmentsSnapshot = await getDocs(appointmentsRef)

    // Contar atendimentos por status
    const totalAppointments = appointmentsSnapshot.size
    let completedAppointments = 0
    let pendingAppointments = 0
    let canceledAppointments = 0

    // Contar atendimentos por tipo
    let consultations = 0
    let exams = 0

    appointmentsSnapshot.docs.forEach((doc) => {
      const appointmentData = doc.data()

      // Contar por status
      switch (appointmentData.status) {
        case "Concluído":
          completedAppointments++
          break
        case "Agendado":
        case "Em Andamento":
          pendingAppointments++
          break
        case "Cancelado":
          canceledAppointments++
          break
      }

      // Contar por tipo
      if (appointmentData.type === "consulta") {
        consultations++
      } else if (appointmentData.type === "exame") {
        exams++
      }
    })

    // Criar o relatório
    const reportData = {
      clinicId,
      doctorId,
      doctorName: doctorData.name,
      date: format(new Date(), "yyyy-MM-dd"),
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        pending: pendingAppointments,
        canceled: canceledAppointments,
        consultations,
        exams,
      },
      createdAt: serverTimestamp(),
    }

    // Salvar o relatório na coleção Relatorios-médico da clínica
    const clinicReportsRef = collection(clinicRef, "Relaorio-médico")
    await addDoc(clinicReportsRef, reportData)

    // Salvar o relatório na coleção Relatorios do médico
    const userRef = doc(collection(clinicRef, "users"), userId)
    const userReportsRef = collection(userRef, "Relatorios")
    const reportRef = await addDoc(userReportsRef, reportData)

    return { id: reportRef.id, ...reportData }
  } catch (error) {
    console.error("Erro ao gerar relatório do médico:", error)
    throw error
  }
}

/**
 * Obtém os dados para a tela de chamada de pacientes
 */
export async function getPatientCallData(clinicId: string) {
  try {
    const clinicRef = doc(db, CLINICS_COLLECTION, clinicId)
    const doctorsRef = collection(clinicRef, "doctors")
    const doctorsSnapshot = await getDocs(doctorsRef)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAppointments: {
      id: string;
      doctorId: string;
      doctorName: string;
      patientName: string;
      time: string;
      type: string;
      status: string;
    }[] = [];

    // Para cada médico, buscar agendamentos de hoje
    for (const doctorDoc of doctorsSnapshot.docs) {
      const appointmentsRef = collection(doctorDoc.ref, "Agendamentos")
      const q = query(appointmentsRef, where("date", ">=", today), where("date", "<", tomorrow), orderBy("date", "asc"))

      const appointmentsSnapshot = await getDocs(q)

      appointmentsSnapshot.docs.forEach((doc) => {
        const appointmentData = doc.data()
        todayAppointments.push({
          id: doc.id,
          doctorId: doctorDoc.id,
          doctorName: appointmentData.doctorName,
          patientName: appointmentData.patientName,
          time: appointmentData.time,
          type: appointmentData.type,
          status: appointmentData.status,
        })
      })
    }

    // Ordenar por horário
    todayAppointments.sort((a, b) => {
      if (a.time < b.time) return -1
      if (a.time > b.time) return 1
      return 0
    })

    // Salvar na coleção Tela-chamada-pacientes
    const callScreenRef = collection(clinicRef, "Tela-chamada-pacientes")

    // Limpar dados antigos
    const oldDataSnapshot = await getDocs(callScreenRef)
    const batch = writeBatch(db)
    oldDataSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // Adicionar dados atualizados
    const callScreenDoc = doc(callScreenRef)
    batch.set(callScreenDoc, {
      date: format(today, "yyyy-MM-dd"),
      appointments: todayAppointments,
      updatedAt: serverTimestamp(),
    })

    await batch.commit()

    return {
      date: format(today, "yyyy-MM-dd"),
      appointments: todayAppointments,
    }
  } catch (error) {
    console.error("Erro ao obter dados para tela de chamada:", error)
    throw error
  }
}

export { db }

