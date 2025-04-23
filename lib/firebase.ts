import { initializeApp, getApps } from "firebase/app"
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  getDoc,
  setDoc,
  limit,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  signOut,
} from "firebase/auth"
import { format, addMinutes, startOfDay, endOfDay } from "date-fns"
import { getNextExamId } from "./utils"
import { ptBR } from "date-fns/locale"
import { getFunctions, httpsCallable } from "firebase/functions"; // Add this import for IP retrieval
import { logUserActivity } from "./user-activity";
import type { ClinicData } from "@/types/clinic"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
let app
if (!getApps().length) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0] // if already initialized, use that one
}

const db = getFirestore(app)
const storage = getStorage(app)
export const auth = getAuth(app)

const consultationsRef = collection(db, "consultations")
const examsRef = collection(db, "exams")
const clinicsRef = collection(db, "clinics")
const usersRef = collection(db, "users")
const appointmentsRef = collection(db, "appointments")

// Update doctorsRef to be a function that returns the correct subcollection reference
const getDoctorsRef = (clinicId: string) => collection(doc(db, "clinics", clinicId), "doctors");

// Add helper function to get users subcollection reference
const getClinicUsersRef = (clinicId: string) => collection(doc(db, "clinics", clinicId), "users");

// Add this function near the top with other utility functions
function generateStrongPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function generateUniqueId(length: number = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomValues[i] % chars.length);
  }
  return result;
}

function generateTimeSlots(start: string, end: string): string[] {
  try {
    const slots = [];
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHour, endMinute, 0, 0);

    let currentSlot = startDate;
    while (currentSlot < endDate) {
      slots.push(format(currentSlot, 'HH:mm'));
      currentSlot = addMinutes(currentSlot, 30);
    }

    return slots;
  } catch (error) {
    console.error("Error generating time slots:", error);
    return [];
  }
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

function generateDailyTimeSlots(start: string, end: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0, 0);

  let currentSlot = startDate;
  while (currentSlot < endDate) {
    slots.push({
      time: format(currentSlot, 'HH:mm'),
      isAvailable: true
    });
    currentSlot = addMinutes(currentSlot, 30);
  }

  return slots;
}

async function getClinicWorkingHours(clinicId: string) {
  try {
    const clinicRef = doc(db, "clinics", clinicId);
    const clinicDoc = await getDoc(clinicRef);
    
    if (!clinicDoc.exists()) {
      throw new Error("Clinic not found");
    }

    const clinicData = clinicDoc.data();
    return {
      workingHours: clinicData.workingHours || { start: "08:00", end: "18:00" },
      workingDays: clinicData.workingDays || [
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta"
      ]
    };
  } catch (error) {
    console.error("Error getting clinic working hours:", error);
    throw error;
  }
}

export async function getAvailableTimeSlots(
  clinicId: string, 
  selectedDate: Date, 
  type: string, 
  doctorId?: string
) {
  try {
    const clinicRef = doc(db, "clinics", clinicId);
    const clinicDoc = await getDoc(clinicRef);

    if (!clinicDoc.exists()) {
      throw new Error("Clinic not found");
    }

    const clinicData = clinicDoc.data();
    const schedule = clinicData.schedule || {
      workingDays: ["segunda", "terca", "quarta", "quinta", "sexta"],
      workingHours: { start: "08:00", end: "18:00" },
      defaultTimeSlots: generateDailyTimeSlots("08:00", "18:00")
    };
    
    // Check if selected date is a working day
    const weekDay = format(selectedDate, 'EEEE', { locale: ptBR })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (!schedule.workingDays.includes(weekDay)) {
      console.log(`${weekDay} is not a working day`);
      return [];
    }

    // Use a single query with date range
    const startTime = startOfDay(selectedDate);
    const endTime = endOfDay(selectedDate);

    // Base query with required index
    let appointmentsQuery = query(
      appointmentsRef,
      where("clinicId", "==", clinicId),
      where("date", ">=", startTime)
    );

    // Add doctor filter if provided
    if (doctorId) {
      // Note: This requires a composite index on (clinicId, doctorId, date)
      appointmentsQuery = query(
        appointmentsRef,
        where("clinicId", "==", clinicId),
        where("doctorId", "==", doctorId),
        where("date", ">=", startTime),
        where("date", "<=", endTime)
      );
    }

    const appointments = await getDocs(appointmentsQuery);
    
    // Filter appointments within the day client-side
    const bookedSlots = new Set(
      appointments.docs
        .filter(doc => {
          const appointmentDate = doc.data().date.toDate();
          return appointmentDate >= startTime && appointmentDate <= endTime;
        })
        .map(doc => format(doc.data().date.toDate(), 'HH:mm'))
    );

    const defaultSlots = schedule.defaultTimeSlots || generateDailyTimeSlots(
      schedule.workingHours.start,
      schedule.workingHours.end
    );

    return defaultSlots
      .filter((slot: TimeSlot) => !bookedSlots.has(slot.time))
      .map((slot: TimeSlot) => slot.time);

  } catch (error) {
    console.error("Error getting available slots:", error);
    return [];
  }
}

// Auth functions
export const register = async (data: any) => {
  const { name, sus, password, type, clinicId } = data;
  if (!clinicId) throw new Error("clinicId is required for registration");

  // Generate strong password if none provided
  const strongPassword = password || generateStrongPassword(16);

  const userCredential = await createUserWithEmailAndPassword(auth, sus, strongPassword);
  const user = userCredential.user;

  await updateProfile(user, { displayName: name });

  // Save user in both global users and clinic's users subcollection
  await Promise.all([
    setDoc(doc(db, "users", user.uid), {
      name: name,
      email: sus,
      type: type,
      clinicId: clinicId,
    }),
    setDoc(doc(getClinicUsersRef(clinicId), user.uid), {
      name: name,
      email: sus,
      type: type,
      uid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  ]);

  return { 
    ...user, 
    temporaryPassword: password ? undefined : strongPassword 
  };
}

// First, create the admin user in root users collection
const createAdminUser = async () => {
  const adminData = {
    name: "Mateus Henrique Vieira",
    email: "santanamateus8979@gmail.com",
    type: "admin",
    clinicId: "zijo9UzfBpnXMQ4Hfr6b",
    createdAt: new Date("2025-03-07T11:51:28.199Z").toISOString(),
    updatedAt: new Date("2025-04-07T21:36:20-03:00").toISOString(),
    id: "NZgsqEIDjXSIBfMEUauAARtQI4F2"
  };

  await setDoc(doc(db, "users", adminData.id), adminData);
};

// Call this once to create the admin user
// createAdminUser();

export const login = async (email: string, password: string): Promise<any> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const rootUserDoc = await getDoc(doc(db, "users", userCredential.user.uid));

    if (rootUserDoc.exists()) {
      const userData = rootUserDoc.data();
      return {
        id: userCredential.user.uid, // Ensure the ID is included
        ...userData,
        clinicName: userData.clinicId
          ? (await getDoc(doc(db, "clinics", userData.clinicId))).data()?.name
          : undefined,
        isAdmin: email === "santanamateus8979@gmail.com",
      };
    }

    throw new Error("Usuário não encontrado");
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    localStorage.clear(); // Clear all local storage
    sessionStorage.clear(); // Clear all session storage
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

// Users Collection
export async function getUsers() {
  const snapshot = await getDocs(query(usersRef))
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function addUser(userData: any) {
  const { name, email, password, type, clinicId } = userData
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  await updateProfile(user, { displayName: name })

  return setDoc(doc(db, "users", user.uid), {
    name: name,
    email: email,
    type: type,
    clinicId: clinicId,
  })
}

export async function updateUser(userId: string, userData: any, newClinicId: string) {
  const globalUserRef = doc(db, "users", userId);
  const globalUserDoc = await getDoc(globalUserRef);
  
  if (!globalUserDoc.exists()) {
    throw new Error("Usuário não encontrado");
  }

  const currentUserData = globalUserDoc.data();
  const oldClinicId = currentUserData.clinicId;

  // If clinic is changing, handle the transfer
  if (oldClinicId !== newClinicId) {
    const batch = writeBatch(db);

    // Remove from old clinic
    if (oldClinicId) {
      const oldClinicUserRef = doc(getClinicUsersRef(oldClinicId), userId);
      batch.delete(oldClinicUserRef);
    }

    // Add to new clinic
    const newClinicUserRef = doc(getClinicUsersRef(newClinicId), userId);
    batch.set(newClinicUserRef, {
      ...currentUserData,
      ...userData,
      clinicId: newClinicId,
      updatedAt: serverTimestamp()
    });

    // Update global user record
    batch.update(globalUserRef, {
      ...userData,
      clinicId: newClinicId,
      updatedAt: serverTimestamp()
    });

    // If user is a doctor, move doctor document to new clinic
    if (currentUserData.type === "doctor" && currentUserData.doctorId) {
      const oldDoctorRef = doc(getDoctorsRef(oldClinicId), currentUserData.doctorId);
      const oldDoctorDoc = await getDoc(oldDoctorRef);

      if (oldDoctorDoc.exists()) {
        const doctorData = oldDoctorDoc.data();
        // Create doctor in new clinic
        const newDoctorRef = doc(getDoctorsRef(newClinicId), currentUserData.doctorId);
        batch.set(newDoctorRef, {
          ...doctorData,
          clinicId: newClinicId,
          updatedAt: serverTimestamp()
        });
        // Delete from old clinic
        batch.delete(oldDoctorRef);
      }
    }

    // Execute all operations
    await batch.commit();
    return true;
  } else {
    // If clinic isn't changing, just update the user data
    const clinicUserRef = doc(getClinicUsersRef(newClinicId), userId);
    await Promise.all([
      updateDoc(globalUserRef, {
        ...userData,
        updatedAt: serverTimestamp()
      }),
      updateDoc(clinicUserRef, {
        ...userData,
        updatedAt: serverTimestamp()
      })
    ]);
    return true;
  }
}

export async function updateUserProfile(userId: string, data: any, clinicId: string) {
  if (!clinicId) throw new Error("clinicId is required");
  
  const userRef = doc(getClinicUsersRef(clinicId), userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error("Usuário não encontrado no posto de saúde");
  }

  return updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function updateUserPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser
  if (!user) {
    throw new Error("No user is currently logged in.")
  }

  // This is a placeholder. In a real application, you would need to re-authenticate the user
  // before allowing them to change their password. This usually involves prompting them for their
  // current password and verifying it against the stored credentials.

  return updatePassword(user, newPassword)
}

// Adicionar a função deleteUser após a função updateUser
export async function deleteUser(userId: string, clinicId: string) {
  if (!clinicId) throw new Error("clinicId is required");

  const userRef = doc(getClinicUsersRef(clinicId), userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error("Usuário não encontrado no posto de saúde");
  }

  const userData = userDoc.data();

  if (userData?.doctorId) {
    throw new Error("Não é possível excluir este usuário pois ele está associado a um médico.");
  }

  // Verificar se o usuário tem consultas ou exames associados
  const [consultationsSnapshot, examsSnapshot] = await Promise.all([
    getDocs(query(consultationsRef, where("userId", "==", userId))),
    getDocs(query(examsRef, where("userId", "==", userId))),
  ])

  if (!consultationsSnapshot.empty || !examsSnapshot.empty) {
    throw new Error("Não é possível excluir este usuário pois existem consultas ou exames associados a ele.")
  }

  // Se não houver registros associados, excluir o usuário
  return deleteDoc(userRef)
}

// Funções para buscar dados específicos de um usuário
export async function getUserDetails(userId: string, clinicId?: string) {
  // First try to get from global users collection
  const globalUserRef = doc(db, "users", userId);
  const globalUserDoc = await getDoc(globalUserRef);

  if (globalUserDoc.exists()) {
    return {
      id: globalUserDoc.id,
      clinicId: globalUserDoc.data().clinicId,
      ...globalUserDoc.data()
    };
  }

  // If not found globally and clinicId is provided, try clinic's users collection
  if (clinicId) {
    const userRef = doc(getClinicUsersRef(clinicId), userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        clinicId,
        ...userDoc.data()
      };
    }
  }

  throw new Error("Usuário não encontrado");
}

export async function getConsultationsByUser(userId: string) {
  const q = query(consultationsRef, where("userId", "==", userId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)

    return {
      id: doc.id,
      ...data,
      date: date,
    }
  })
}

export async function getExamsByUser(userId: string) {
  const q = query(examsRef, where("userId", "==", userId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)

    return {
      id: doc.id,
      ...data,
      date: date,
    }
  })
}

// Clinics Collection
export async function getClinics(): Promise<Clinic[]> {
  const snapshot = await getDocs(query(clinicsRef))
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Clinic[]
}

// Certifique-se de que a função getClinic está correta
export async function getClinic(clinicId: string) {
  try {
    if (!clinicId) {
      console.error("getClinic chamado sem ID")
      return null
    }

    const clinicRef = doc(db, "clinics", clinicId)
    const clinicSnap = await getDoc(clinicRef)

    if (clinicSnap.exists()) {
      return {
        id: clinicSnap.id,
        ...clinicSnap.data(),
      }
    }

    console.warn("Clínica não encontrada:", clinicId)
    return null
  } catch (error) {
    console.error("Erro ao buscar clínica:", error)
    throw error
  }
}

// Adicionar ou atualizar a função addClinic para lidar com os dados do posto de saúde
export async function addClinic(data: ClinicData) {
  try {
    const clinicsRef = collection(db, "clinics");
    const clinicRef = doc(clinicsRef);
    
    await setDoc(clinicRef, {
      ...data,
      id: clinicRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Create initial subCollections
    const appointmentsRef = collection(clinicRef, 'appointments');
    const scheduleRef = doc(clinicRef, 'funcionamento/schedule');
    
    // Set up initial schedule document
    await setDoc(scheduleRef, {
      workingDays: data.workingDays,
      workingHours: data.workingHours,
      is24Hours: data.is24Hours || false
    });

    return clinicRef.id;
  } catch (error) {
    console.error("Error adding clinic:", error);
    throw error;
  }
}

export async function updateClinic(clinicId: string, clinicData: any) {
  const clinicRef = doc(db, "clinics", clinicId)

  // Preparar os dados para atualização
  const updateData = { ...clinicData }

  // Converter horários para Timestamp se fornecidos
  if (updateData.openingHour) {
    updateData.openingHour = Timestamp.fromDate(new Date(`2000-01-01T${updateData.openingHour}:00`))
  }

  if (updateData.closingHour) {
    updateData.closingHour = Timestamp.fromDate(new Date(`2000-01-01T${updateData.closingHour}:00`))
  }

  return updateDoc(clinicRef, updateData)
}

export async function deleteClinic(clinicId: string) {
  try {
    const batch = writeBatch(db);
    const clinicRef = doc(db, "clinics", clinicId);

    // Get all associated records
    const [doctorsSnapshot, consultationsSnapshot, examsSnapshot] = await Promise.all([
      getDocs(getDoctorsRef(clinicId)),
      getDocs(query(consultationsRef, where("clinicId", "==", clinicId))),
      getDocs(query(examsRef, where("clinicId", "==", clinicId))),
    ]);

    // Delete all doctors in this clinic
    doctorsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete all consultations
    consultationsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete all exams
    examsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the clinic itself
    batch.delete(clinicRef);

    // Execute all deletions in a single atomic operation
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error("Error deleting clinic:", error);
    throw error;
  }
}

// Doctors Collection
export async function getDoctors(clinicId?: string) {
  try {
    if (!clinicId || clinicId === 'all') {
      // Fetch all clinics first
      const clinicsSnapshot = await getDocs(clinicsRef);
      
      // Get all doctors from each clinic
      const doctorsPromises = clinicsSnapshot.docs.map(async (clinicDoc) => {
        const doctorsSnapshot = await getDocs(getDoctorsRef(clinicDoc.id));
        return doctorsSnapshot.docs.map(doc => ({
          id: doc.id,
          clinicId: clinicDoc.id,
          ...doc.data()
        }));
      });

      // Wait for all promises to resolve and flatten the array
      const allDoctors = await Promise.all(doctorsPromises);
      return allDoctors.flat();
    }

    // If clinicId is provided, fetch doctors from that specific clinic
    const doctorsSnapshot = await getDocs(getDoctorsRef(clinicId));
    return doctorsSnapshot.docs.map(doc => ({
      id: doc.id,
      clinicId,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching doctors:", error);
    throw error;
  }
}

export async function addDoctor(doctorData: DoctorData) {
  try {
    if (!doctorData.clinicId) {
      throw new Error("clinicId is required to add a doctor");
    }

    // First verify the clinic exists and get its data
    const clinicRef = doc(clinicsRef, doctorData.clinicId);
    const clinicDoc = await getDoc(clinicRef);
    
    if (!clinicDoc.exists()) {
      throw new Error("Clinic not found");
    }

    // Generate a unique random ID
    const docId = generateUniqueId();
    
    // Generate a strong password if none provided
    const strongPassword = generateStrongPassword(16);
    const password = doctorData.password || strongPassword;
    
    // Create auth user with strong password
    const userCredential = await createUserWithEmailAndPassword(auth, doctorData.email, password);
    await updateProfile(userCredential.user, { 
      displayName: `${doctorData.firstName} ${doctorData.lastName}` 
    });

    const doctorsRef = getDoctorsRef(doctorData.clinicId);
    const is24Hours = doctorData.workingHours?.start === "00:00" && 
                     doctorData.workingHours?.end === "23:59";

    const cleanedData = removeUndefinedFields({
      ...doctorData,
      uid: userCredential.user.uid,
      is24Hours,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create the doctor document with the random ID
    await setDoc(doc(doctorsRef, docId), cleanedData);

    // Create the corresponding user document
    const userDoc = {
      name: `${doctorData.firstName} ${doctorData.lastName}`,
      email: doctorData.email,
      type: "doctor",
      clinicId: doctorData.clinicId,
      doctorId: docId,
      uid: userCredential.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Save in both global users and clinic's users collections
    await Promise.all([
      setDoc(doc(db, "users", userCredential.user.uid), userDoc),
      setDoc(doc(getClinicUsersRef(doctorData.clinicId), userCredential.user.uid), userDoc)
    ]);

    return { 
      id: docId, 
      ...cleanedData,
      temporaryPassword: doctorData.password ? undefined : password
    };
  } catch (error) {
    console.error("Error adding doctor:", error);
    throw error;
  }
}

export async function getDoctorServices(clinicId: string | undefined, doctorId: string | undefined) {
  try {
    // Validar se clinicId e doctorId foram fornecidos
    if (!clinicId) {
      throw new Error("Clinic ID é obrigatório.");
    }
    if (!doctorId) {
      throw new Error("Doctor ID é obrigatório.");
    }

    // Criar a referência correta para o documento do médico
    const doctorRef = doc(db, "clinics", clinicId, "doctors", doctorId);
    const doctorSnap = await getDoc(doctorRef);

    if (!doctorSnap.exists()) {
      throw new Error(`Médico não encontrado no posto de saúde: ${clinicId}`);
    }

    const doctorData = doctorSnap.data();
    return doctorData?.services || [];
  } catch (error) {
    console.error("Erro ao buscar serviços do médico:", error);
    throw error;
  }
}

export async function addDoctorServices(clinicId: string, doctorId: string, services: string[]) {
  try {
    if (!clinicId || !doctorId) {
      throw new Error("Clinic ID e Doctor ID são obrigatórios.");
    }

    // Criar a referência correta para o documento do médico
    const doctorRef = doc(db, "clinics", clinicId, "doctors", doctorId);

    // Verificar se o documento do médico existe
    const doctorSnap = await getDoc(doctorRef);
    if (!doctorSnap.exists()) {
      throw new Error(`Médico não encontrado no posto de saúde: ${clinicId}`);
    }

    // Atualizar os serviços do médico
    await setDoc(doctorRef, { services }, { merge: true });

    console.log("Serviços atualizados com sucesso para o médico:", doctorId);
  } catch (error) {
    console.error("Erro ao adicionar serviços para o médico:", error);
    throw error;
  }
}

export async function removeDoctorService(clinicId: string, doctorId: string, service: string) {
  try {
    if (!clinicId || !doctorId) {
      throw new Error("Clinic ID e Doctor ID são obrigatórios.");
    }

    // Criar a referência correta para o documento do médico
    const doctorRef = doc(db, "clinics", clinicId, "doctors", doctorId);

    // Remover o serviço do médico
    await updateDoc(doctorRef, {
      services: arrayRemove(service),
    });

    console.log("Serviço removido com sucesso do médico:", doctorId);
  } catch (error) {
    console.error("Erro ao remover serviço do médico:", error);
    throw error;
  }
}

// Consultations Collection
export async function getConsultations(clinicId?: string, doctorId?: string) {
  let q

  if (doctorId && clinicId) {
    // Filtrar por clínica e médico, sem ordenação
    q = query(consultationsRef, where("clinicId", "==", clinicId), where("doctorId", "==", doctorId))
  } else if (doctorId) {
    // Filtrar apenas por médico
    q = query(consultationsRef, where("doctorId", "==", doctorId))
  } else if (clinicId) {
    // Filtrar apenas por clínica
    q = query(consultationsRef, where("clinicId", "==", clinicId))
  } else {
    // Sem filtros
    q = query(consultationsRef)
  }

  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((doc) => {
      const data = doc.data()
      const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)

      return {
        id: doc.id,
        consultationId: data.id,
        ...data,
        date: date,
        formattedDate: format(date, "dd/MM/yyyy HH:mm"),
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort in memory
}

// Função para buscar todas as consultas de um médico específico
export async function getConsultationsByDoctor(doctorId: string, clinicId?: string) {
  let q = query(consultationsRef, where("doctorId", "==", doctorId));
  
  if (clinicId) {
    q = query(q, where("clinicId", "==", clinicId));
  }
  
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
    return {
      id: doc.id,
      ...data,
      date: date,
    };
  });
}

// Adicione esta função helper
function cleanFirestoreData(data: any) {
  const clean: any = {};
  
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && data[key] !== null) {
      clean[key] = data[key];
    }
  });
  
  return clean;
}

// Atualize a função addConsultation
export async function addConsultation(consultationData: any) {
  try {
    const batch = writeBatch(db);
    
    // Create consultation document
    const consultationRef = doc(consultationsRef);
    const dateTime = new Date(`${consultationData.date}T${consultationData.time}`);
    
    // Create appointment record with cleaned data
    const appointmentRef = doc(appointmentsRef);
    const appointmentData = cleanFirestoreData({
      type: 'consultation',
      consultationId: consultationRef.id,
      clinicId: consultationData.clinicId,
      doctorId: consultationData.doctorId || null,
      patientName: consultationData.patientName,
      date: dateTime,
      duration: 30,
      status: 'Agendado', // Define status inicial como Agendado
      createdAt: serverTimestamp()
    });

    const cleanedConsultationData = cleanFirestoreData({
      ...consultationData,
      date: dateTime,
      appointmentId: appointmentRef.id,
      status: 'Agendado', // Define status inicial como Agendado
      createdAt: serverTimestamp()
    });

    batch.set(consultationRef, cleanedConsultationData);
    batch.set(appointmentRef, appointmentData);

    await batch.commit();
    return { consultationId: consultationRef.id, appointmentId: appointmentRef.id };
  } catch (error) {
    console.error("Error adding consultation:", error);
    throw error;
  }
}

export async function updateConsultationStatus(consultationId: string, newStatus: string) {
  const consultationRef = doc(consultationsRef, consultationId);
  return updateDoc(consultationRef, { 
    status: newStatus,
    updatedAt: serverTimestamp()
  });
}

// Exams Collection
export async function getExams(clinicId?: string, doctorId?: string) {
  let q

  if (doctorId && clinicId) {
    // Filtrar por clínica e médico, sem ordenação
    q = query(examsRef, where("clinicId", "==", clinicId), where("doctorId", "==", doctorId))
  } else if (doctorId) {
    // Filtrar apenas por médico
    q = query(examsRef, where("doctorId", "==", doctorId))
  } else if (clinicId) {
    // Filtrar apenas por clínica
    q = query(examsRef, where("clinicId", "==", clinicId))
  } else {
    // Sem filtros
    q = query(examsRef)
  }

  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((doc) => {
      const data = doc.data()
      const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)

      return {
        id: doc.id,
        examId: data.id,
        ...data,
        date: date,
        formattedDate: format(date, "dd/MM/yyyy HH:mm"),
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort in memory
}

export async function addExam(examData: any) {
  try {
    const batch = writeBatch(db);
    
    if (!examData.date || !examData.time) {
      throw new Error("Date and time are required");
    }

    // Create proper date object
    const [hours, minutes] = examData.time.split(':').map(Number);
    const examDate = new Date(examData.date);
    examDate.setHours(hours, minutes, 0, 0);

    // Clean data before saving
    const cleanedExamData = cleanFirestoreData({
      ...examData,
      doctorId: null, // Define explicitamente como null se não existir
      date: examDate,
      status: 'scheduled',
      createdAt: serverTimestamp()
    });

    // Create exam document
    const examRef = doc(examsRef);
    
    // Create appointment with cleaned data
    const appointmentRef = doc(appointmentsRef);
    const appointmentData = cleanFirestoreData({
      type: 'exam',
      examId: examRef.id,
      clinicId: examData.clinicId,
      doctorId: null, // Define explicitamente como null
      patientName: examData.patientName,
      date: examDate,
      duration: 30,
      status: 'scheduled',
      createdAt: serverTimestamp()
    });

    // Set both documents
    batch.set(examRef, {
      ...cleanedExamData,
      appointmentId: appointmentRef.id
    });

    batch.set(appointmentRef, appointmentData);
    await batch.commit();

    return { 
      examId: examRef.id, 
      appointmentId: appointmentRef.id,
      date: examDate 
    };
  } catch (error) {
    console.error("Error adding exam:", error);
    throw error;
  }
}

export async function updateExamStatus(examId: string, newStatus: string) {
  const examRef = doc(db, "exams", examId)
  return updateDoc(examRef, { status: newStatus })
}

// Exam Types Collection
export async function getExamTypes(clinicId: string) {
  try {
    // Verificar se a clínica existe
    const clinicDoc = await getDoc(doc(db, "clinics", clinicId))

    if (!clinicDoc.exists()) {
      console.error("Clínica não encontrada:", clinicId)
      return []
    }

    // Obter tipos de exame da clínica
    const clinicData = clinicDoc.data()
    const examTypes = clinicData.examTypes || [
      "Sangue",
      "Raio X",
      "Ultrassom",
      "Ressonância",
      "Tomografia",
      "Eletrocardiograma",
      "Endoscopia",
    ]

    return examTypes
  } catch (error) {
    console.error("Erro ao buscar tipos de exame:", error)
    return ["Sangue", "Raio X", "Ultrassom", "Ressonância", "Tomografia", "Eletrocardiograma", "Endoscopia"]
  }
}

// Função para adicionar tipo de exame
export async function addExamType(clinicId: string, examTypeData: any) {
  try {
    // Verificar se a clínica existe
    const clinicRef = doc(db, "clinics", clinicId)
    const clinicSnap = await getDoc(clinicRef)

    if (!clinicSnap.exists()) {
      throw new Error("Clínica não encontrada")
    }

    // Criar uma referência para a coleção de tipos de exame
    const examTypesRef = collection(db, "examTypes")

    // Adicionar metadados
    const examTypeWithMetadata = {
      ...examTypeData,
      clinicId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Adicionar o tipo de exame
    const docRef = await addDoc(examTypesRef, examTypeWithMetadata)

    // Atualizar a clínica com o ID do tipo de exame
    await updateDoc(clinicRef, {
      examTypeIds: arrayUnion(docRef.id),
    })

    return { id: docRef.id, ...examTypeWithMetadata }
  } catch (error) {
    console.error("Erro ao adicionar tipo de exame:", error)
    throw error
  }
}

// Função para obter tipos de exame de uma clínica
export async function getExamTypesByClinic(clinicId: string) {
  try {
    const examTypesRef = collection(db, "examTypes")
    const q = query(examTypesRef, where("clinicId", "==", clinicId), orderBy("createdAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao buscar tipos de exame:", error)
    throw error
  }
}

// Função para atualizar tipo de exame
export async function updateExamType(examTypeId: string, examTypeData: any) {
  try {
    const examTypeRef = doc(db, "examTypes", examTypeId)

    // Adicionar metadados
    const updateData = {
      ...examTypeData,
      updatedAt: serverTimestamp(),
    }

    await updateDoc(examTypeRef, updateData)
    return { id: examTypeId, ...updateData }
  } catch (error) {
    console.error("Erro ao atualizar tipo de exame:", error)
    throw error
  }
}

// Função para excluir tipo de exame
export async function deleteExamType(examTypeId: string, clinicId: string) {
  try {
    // Verificar se o tipo de exame está sendo usado em algum exame
    const examsRef = collection(db, "exams")
    const q = query(examsRef, where("examTypeId", "==", examTypeId))
    const examsSnapshot = await getDocs(q)

    if (!examsSnapshot.empty) {
      throw new Error("Não é possível excluir este tipo de exame pois ele está sendo usado em exames.")
    }

    // Excluir o tipo de exame
    const examTypeRef = doc(db, "examTypes", examTypeId)
    await deleteDoc(examTypeRef)

    // Atualizar a clínica removendo o ID do tipo de exame
    const clinicRef = doc(db, "clinics", clinicId)
    await updateDoc(clinicRef, {
      examTypeIds: arrayRemove(examTypeId),
    })

    return true
  } catch (error) {
    console.error("Erro ao excluir tipo de exame:", error)
    throw error
  }
}

export async function removeExamType(clinicId: string, examType: string) {
  const clinicRef = doc(db, "clinics", clinicId)
  return updateDoc(clinicRef, {
    examTypes: arrayRemove(examType),
  })
}

// Função para adicionar serviço médico
export async function addDoctorService(doctorId: string, serviceData: any) {
  try {
    // Verificar se o médico existe
    const doctorRef = doc(db, "doctors", doctorId)
    const doctorSnap = await getDoc(doctorRef)

    if (!doctorSnap.exists()) {
      throw new Error("Médico não encontrado")
    }

    // Criar uma referência para a coleção de serviços médicos
    const servicesRef = collection(db, "medicalServices")

    // Adicionar metadados
    const serviceWithMetadata = {
      ...serviceData,
      doctorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Adicionar o serviço médico
    const docRef = await addDoc(servicesRef, serviceWithMetadata)

    // Atualizar o médico com o ID do serviço
    await updateDoc(doctorRef, {
      serviceIds: arrayUnion(docRef.id),
    })

    return { id: docRef.id, ...serviceWithMetadata }
  } catch (error) {
    console.error("Erro ao adicionar serviço médico:", error)
    throw error
  }
}

// Função para obter serviços médicos de um médico
export async function getDoctorServicesByDoctor(doctorId: string) {
  try {
    const servicesRef = collection(db, "medicalServices")
    const q = query(servicesRef, where("doctorId", "==", doctorId), orderBy("createdAt", "desc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Erro ao buscar serviços médicos:", error)
    throw error
  }
}

// Função para atualizar serviço médico
export async function updateDoctorService(serviceId: string, serviceData: any) {
  try {
    const serviceRef = doc(db, "medicalServices", serviceId)

    // Adicionar metadados
    const updateData = {
      ...serviceData,
      updatedAt: serverTimestamp(),
    }

    await updateDoc(serviceRef, updateData)
    return { id: serviceId, ...updateData }
  } catch (error) {
    console.error("Erro ao atualizar serviço médico:", error)
    throw error
  }
}

// Função para excluir serviço médico
export async function deleteDoctorService(serviceId: string, doctorId: string) {
  try {
    // Verificar se o serviço está sendo usado em alguma consulta
    const consultationsRef = collection(db, "consultations")
    const q = query(consultationsRef, where("serviceId", "==", serviceId))
    const consultationsSnapshot = await getDocs(q)

    if (!consultationsSnapshot.empty) {
      throw new Error("Não é possível excluir este serviço pois ele está sendo usado em consultas.")
    }

    // Excluir o serviço médico
    const serviceRef = doc(db, "medicalServices", serviceId)
    await deleteDoc(serviceRef)

    // Atualizar o médico removendo o ID do serviço
    const doctorRef = doc(db, "doctors", doctorId)
    await updateDoc(doctorRef, {
      serviceIds: arrayRemove(serviceId),
    })

    return true
  } catch (error) {
    console.error("Erro ao excluir serviço médico:", error)
    throw error
  }
}

// Dashboard Data
export async function getDashboardData(clinicId: string) {
  const [consultationsSnapshot, examsSnapshot, doctorsSnapshot] = await Promise.all([
    getDocs(query(consultationsRef, where("clinicId", "==", clinicId))),
    getDocs(query(examsRef, where("clinicId", "==", clinicId))),
    getDocs(query(getDoctorsRef(clinicId), where("clinicId", "==", clinicId), orderBy("createdAt", "desc"), limit(5))),
  ])

  const consultations = consultationsSnapshot.docs.map((doc) => doc.data())
  const exams = examsSnapshot.docs.map((doc) => doc.data())
  const doctors = doctorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  // Contagem de status das consultas
  const consultationStatuses: { [key: string]: number } = consultations.reduce((acc: any, consultation: any) => {
    acc[consultation.status] = (acc[consultation.status] || 0) + 1
    return acc
  }, {})

  // Contagem de status dos exames
  const examStatuses: { [key: string]: number } = exams.reduce((acc: any, exam: any) => {
    acc[exam.status] = (acc[exam.status] || 0) + 1
    return acc
  }, {})

  // Agendamentos para hoje
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayConsultations = consultations.filter((consultation: any) => {
    const consultationDate = new Date(consultation.date.seconds * 1000)
    consultationDate.setHours(0, 0, 0, 0)
    return consultationDate.getTime() === today.getTime()
  })

  const todayExams = exams.filter((exam: any) => {
    const examDate = new Date(exam.date.seconds * 1000)
    examDate.setHours(0, 0, 0, 0)
    return examDate.getTime() === today.getTime()
  })

  return {
    totalDoctors: doctorsSnapshot.size,
    totalConsultations: consultationsSnapshot.size,
    totalExams: examsSnapshot.size,
    completedConsultations: consultationStatuses.Concluída || 0,
    completedExams: examStatuses.Concluído || 0,
    consultationStatuses,
    examStatuses,
    todayConsultations,
    todayExams,
    recentDoctors: doctors,
  }
}

// File Upload Helper
export async function uploadFile(file: File, path: string) {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

// Adicione esta função ao arquivo lib/firebase.ts

// Patients Collection
export async function addPatient(patientData: any) {
  try {
    const usersRef = collection(db, "users")

    // Adicionar metadados
    const patientWithMetadata = {
      ...patientData,
      type: "patient", // Definir o tipo como "patient"
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    // Adicionar o paciente
    const docRef = await addDoc(usersRef, patientWithMetadata)

    return { id: docRef.id, ...patientWithMetadata }
  } catch (error) {
    console.error("Erro ao adicionar paciente:", error)
    throw error
  }
}

/**
 * Busca todos os usuários do tipo "patient" de um posto de saúde específico
 * @param clinicId ID do posto de saúde
 * @returns Array de pacientes
 */
export async function getPatientsByClinic(clinicId: string) {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("type", "==", "patient"), where("clinicId", "==", clinicId))

    const querySnapshot = await getDocs(q)
    const patients = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return patients
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error)
    throw error
  }
}

/**
 * Busca todos os usuários do tipo "patient"
 * @returns Array de pacientes
 */
export async function getAllPatients() {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("type", "==", "patient"))

    const querySnapshot = await getDocs(q)
    const patients = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return patients
  } catch (error) {
    console.error("Erro ao buscar pacientes:", error)
    throw error
  }
}

/**
 * Busca as consultas e exames de um paciente específico
 * @param patientId ID do paciente
 * @returns Objeto com consultas e exames do paciente
 */
export async function getPatientAppointments(patientId: string) {
  try {
    // Buscar consultas
    const consultationsRef = collection(db, "consultations")
    const consultationsQuery = query(consultationsRef, where("patientId", "==", patientId))

    // Buscar exames
    const examsRef = collection(db, "exams")
    const examsQuery = query(examsRef, where("patientId", "==", patientId))

    // Executar as consultas em paralelo
    const [consultationsSnapshot, examsSnapshot] = await Promise.all([getDocs(consultationsQuery), getDocs(examsQuery)])

    // Processar resultados
    const consultations = consultationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    }))

    const exams = examsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date(),
    }))

    return { consultations, exams }
  } catch (error) {
    console.error("Erro ao buscar agendamentos do paciente:", error)
    throw error
  }
}

// Funções para buscar dados específicos de um posto
export async function getDoctorsByClinic(clinicId: string) {
  const q = query(getDoctorsRef(clinicId), where("clinicId", "==", clinicId), orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function getConsultationsByClinic(clinicId: string, startDate?: Date, endDate?: Date) {
  let q = query(consultationsRef, where("clinicId", "==", clinicId))

  if (startDate) {
    const startTimestamp = Timestamp.fromDate(startDate)
    q = query(q, where("date", ">=", startTimestamp))
  }

  if (endDate) {
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)
    const endTimestamp = Timestamp.fromDate(endOfDay)
    q = query(q, where("date", "<=", endTimestamp))
  }

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)

    return {
      id: doc.id,
      ...data,
      date: date,
    }
  })
}

export async function getExamsByClinic(clinicId: string, startDate?: Date, endDate?: Date) {
  let q = query(examsRef, where("clinicId", "==", clinicId))

  if (startDate) {
    const startTimestamp = Timestamp.fromDate(startDate)
    q = query(q, where("date", ">=", startTimestamp))
  }

  if (endDate) {
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)
    const endTimestamp = Timestamp.fromDate(endOfDay)
    q = query(q, where("date", "<=", endTimestamp))
  }

  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)

    return {
      id: doc.id,
      ...data,
      date: date,
    }
  })
}

// Atualize a função sendMassNotification

// Função para enviar notificação em massa
export async function sendMassNotification(notificationData: {
  title: string
  message: string
  type: string
  sendToAll: boolean
  clinicId: string | null
}) {
  try {
    // Validar dados de entrada
    if (!notificationData.title || !notificationData.message) {
      throw new Error("Título e mensagem são obrigatórios")
    }

    // Buscar os destinatários
    let recipientQuery
    const currentUser = auth.currentUser

    if (!currentUser) {
      throw new Error("Usuário não autenticado")
    }

    // Obter informações do usuário atual
    const userDoc = await getDoc(doc(db, "users", currentUser.uid))
    if (!userDoc.exists()) {
      throw new Error("Dados do usuário não encontrados")
    }

    const userData = userDoc.data()
    const senderClinicId = userData?.clinicId

    if (notificationData.sendToAll) {
      // Se for para todos, buscar todos os pacientes
      recipientQuery = query(collection(db, "users"), where("type", "==", "patient"))
    } else if (notificationData.clinicId) {
      // Se for para um posto específico, buscar pacientes desse posto
      recipientQuery = query(
        collection(db, "users"),
        where("type", "==", "patient"),
        where("clinicId", "==", notificationData.clinicId),
      )
    } else if (senderClinicId) {
      // Se não especificou clinicId mas o usuário tem um posto, usar o posto do usuário
      recipientQuery = query(
        collection(db, "users"),
        where("type", "==", "patient"),
        where("clinicId", "==", senderClinicId),
      )
    } else {
      // Se não tiver clinicId e não for para todos, não enviar
      throw new Error("É necessário especificar um posto de saúde ou selecionar 'Enviar para todos'")
    }

    const recipientsSnapshot = await getDocs(recipientQuery)
    const recipients = recipientsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as { email?: string }), // Ensure the email property is included if it exists
    }))

    if (recipients.length === 0) {
      throw new Error("Nenhum destinatário encontrado para os critérios selecionados")
    }

    // Criar um documento na coleção de notificações
    const notificationRef = await addDoc(collection(db, "notifications"), {
      ...notificationData,
      createdAt: Timestamp.now(),
      status: "sent",
      recipientCount: recipients.length,
      sentBy: currentUser.uid,
      senderName: currentUser.displayName || "Sistema",
      senderClinicId: senderClinicId || null,
    })

    // Criar notificações individuais para cada destinatário
    const batch = writeBatch(db)

    // Preparar o envio de emails
    const emailPromises = []

    for (const recipient of recipients) {
      if (!recipient.email) {
        console.warn(`Recipient with ID ${recipient.id} does not have an email address.`)
        continue // Skip recipients without an email
      }

      // Adicionar notificação individual
      const userNotificationRef = doc(collection(db, "userNotifications"))
      batch.set(userNotificationRef, {
        userId: recipient.id,
        notificationId: notificationRef.id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        createdAt: Timestamp.now(),
        read: false,
      })

      // Se o destinatário tiver email, agendar envio de email
      emailPromises.push(
        sendEmail(
          recipient.email,
          `Notificação: ${notificationData.title}`,
          `${notificationData.message}

Esta é uma mensagem automática do sistema de saúde.`,
        ),
      )
    }

    // Executar o batch de notificações
    await batch.commit()

    // Aguardar o agendamento de todos os emails
    await Promise.all(emailPromises)

    console.log(`Notification sent: ${notificationRef.id} to ${recipients.length} recipients`)

    return notificationRef
  } catch (error) {
    console.error("Error sending notification:", error)
    throw error
  }
}

// Adicione esta função para enviar email
export async function sendEmail(to: string, subject: string, body: string) {
  try {
    // Criar um documento na coleção de emails para processamento posterior
    // (Um Cloud Function seria responsável por monitorar esta coleção e enviar os emails)
    await addDoc(collection(db, "emails"), {
      to,
      subject,
      body,
      createdAt: Timestamp.now(),
      status: "pending",
    })

    return true
  } catch (error) {
    console.error("Erro ao agendar envio de email:", error)
    return false
  }
}

// Função para obter todas as notificações
export async function getNotifications() {
  const notificationsRef = collection(db, "notifications")
  const q = query(notificationsRef, orderBy("createdAt", "desc"))
  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt:
      doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
  }))
}

// Função para obter os tipos de notificação
export async function getNotificationTypes() {
  const typesRef = collection(db, "notificationTypes")
  const snapshot = await getDocs(typesRef)

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

// Função para adicionar um novo tipo de notificação
export async function addNotificationType(data: {
  name: string
  description: string
  template: string
}) {
  return addDoc(collection(db, "notificationTypes"), {
    ...data,
    createdAt: Timestamp.now(),
  })
}

// Função para excluir um tipo de notificação
export async function deleteNotificationType(typeId: string) {
  const typeRef = doc(db, "notificationTypes", typeId)
  return deleteDoc(typeRef)
}

// Função para buscar notificações do usuário
export async function getUserNotifications(userId: string | undefined) {
  try {
    // Verificar se userId é válido
    if (!userId) {
      console.warn("getUserNotifications chamada com userId indefinido")
      return []
    }

    const userNotificationsRef = collection(db, "userNotifications")
    const q = query(
      userNotificationsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20), // Limitar a 20 notificações mais recentes
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt:
        doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
    }))
  } catch (error) {
    console.error("Erro ao buscar notificações do usuário:", error)
    return []
  }
}

// Função para marcar uma notificação como lida - corrigida para validar o ID
export async function markNotificationAsRead(notificationId: string) {
  try {
    if (!notificationId) {
      throw new Error("ID de notificação inválido")
    }

    const notificationRef = doc(db, "userNotifications", notificationId)
    await updateDoc(notificationRef, { read: true })
    return true
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error)
    throw error
  }
}

// Função para contar notificações não lidas - corrigida para lidar com userId undefined
export async function countUnreadNotifications(userId: string | undefined) {
  try {
    // Verificar se userId é válido
    if (!userId) {
      console.warn("countUnreadNotifications chamada com userId indefinido")
      return 0
    }

    const userNotificationsRef = collection(db, "userNotifications")
    const q = query(userNotificationsRef, where("userId", "==", userId), where("read", "==", false))

    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error) {
    console.error("Erro ao contar notificações não lidas:", error)
    return 0
  }
}

export async function getClinicById(clinicId: string) {
  try {
    const clinicRef = doc(db, "clinics", clinicId)
    const clinicSnap = await getDoc(clinicRef)

    if (clinicSnap.exists()) {
      return {
        id: clinicSnap.id,
        ...clinicSnap.data(),
      }
    } else {
      console.warn("No such document!")
      return null
    }
  } catch (error) {
    console.error("Error getting document:", error)
    throw error
  }
}

export async function getDoctorById(doctorId: string, clinicId: string) {
  try {
    const doctorRef = doc(getDoctorsRef(clinicId), doctorId);
    const doctorSnap = await getDoc(doctorRef);

    if (doctorSnap.exists()) {
      return {
        id: doctorSnap.id,
        clinicId,
        ...doctorSnap.data(),
      };
    } else {
      console.warn("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error getting document:", error);
    throw error;
  }
}

export async function getAppointments(clinicId: string, doctorId?: string, startDate?: Date, endDate?: Date) {
  try {
    let q = query(appointmentsRef, where("clinicId", "==", clinicId));
    
    if (doctorId) {
      q = query(q, where("doctorId", "==", doctorId));
    }
    
    if (startDate) {
      q = query(q, where("date", ">=", startDate));
    }
    
    if (endDate) {
      q = query(q, where("date", "<=", endDate));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate()
    }));
  } catch (error) {
    console.error("Error getting appointments:", error);
    throw error;
  }
}

export async function saveActivity(
  user: any,
  activityData: any
): Promise<void> {
  try {
    if (!user || !user.clinicId) {
      throw new Error("Usuário ou posto de saúde não configurado corretamente.");
    }

    const clinicActivitiesRef = collection(
      doc(db, "clinics", user.clinicId),
      "activities"
    );

    // Caso o usuário seja admin ou receptionist
    if (user.type === "admin" || user.type === "receptionist") {
      await addDoc(clinicActivitiesRef, {
        ...activityData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      console.log("Atividade salva no posto de saúde.");
    }
    // Caso o usuário seja doctor ou nurse
    else if (user.type === "doctor" || user.type === "nurse") {
      const userActivitiesRef = collection(
        doc(db, "users", user.uid),
        "activities"
      );

      // Salvar no posto de saúde
      await addDoc(clinicActivitiesRef, {
        ...activityData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      // Salvar no perfil do usuário
      await addDoc(userActivitiesRef, {
        ...activityData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      console.log(
        "Atividade salva no posto de saúde e no perfil do usuário."
      );
    } else {
      throw new Error("Tipo de usuário não suportado para salvar atividades.");
    }
  } catch (error) {
    console.error("Erro ao salvar atividade:", error);
    throw error;
  }
}

function removeUndefinedFields(data: any) {
  return Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
}

interface DoctorData {
  firstName: string;
  lastName: string;
  email: string;
  clinicId: string;
  workingHours?: {
    start: string;
    end: string;
  };
  [key: string]: any; // Permite propriedades adicionais, se necessário
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  workingHours?: {
    start: string;
    end: string;
  };
  [key: string]: any;
}

interface WorkingSchedule {
  clinicId: string;
  workingDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
}

const schedulesRef = collection(db, 'funcionamento');

export async function saveSchedule(clinicId: string, schedule: Omit<WorkingSchedule, 'clinicId'>) {
  await setDoc(doc(schedulesRef, clinicId), {
    clinicId,
    ...schedule,
    updatedAt: serverTimestamp(),
  });
}

export async function getClinicSchedule(clinicId: string) {
  const scheduleDoc = await getDoc(doc(schedulesRef, clinicId));
  return scheduleDoc.exists() ? scheduleDoc.data() as WorkingSchedule : null;
}

export async function updateExamDate(examId: string, newDate: Date) {
  try {
    const examRef = doc(db, 'exams', examId);
    await updateDoc(examRef, {
      date: Timestamp.fromDate(newDate),
      formattedDate: format(newDate, "dd/MM/yyyy HH:mm", { locale: ptBR })
    });
  } catch (error) {
    console.error('Error updating exam date:', error);
    throw error;
  }
}

export async function addExamAppointment(clinicId: string, examData: any) {
  try {
    // Create reference to clinic's appointments subcollection
    const appointmentsRef = collection(db, `clinics/${clinicId}/appointments`);
    const appointmentDoc = doc(appointmentsRef);

    // Add exam data to appointments subcollection
    await setDoc(appointmentDoc, {
      ...examData,
      id: appointmentDoc.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      type: 'exam',
      status: 'Agendado'
    });

    return appointmentDoc.id;
  } catch (error) {
    console.error('Error adding exam appointment:', error);
    throw error;
  }
}

export { db }

