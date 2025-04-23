import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore"
import { format, addMinutes, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

// Interface for doctor working hours
interface WorkingHours {
  start: string
  end: string
}

// Interface for doctor schedule
interface DoctorSchedule {
  workingDays: string[]
  workingHours: WorkingHours
  is24Hours?: boolean
}

// Interface for appointment slot
interface AppointmentSlot {
  time: string
  isAvailable: boolean
  isBlocked?: boolean
  blockedUntil?: Date
}

/**
 * Fetches doctor working hours from Firestore
 * @param clinicId - The clinic ID
 * @param doctorId - The doctor ID
 * @returns The doctor's schedule including working days and hours
 */
export async function fetchDoctorWorkingHours(clinicId: string, doctorId: string): Promise<DoctorSchedule> {
  try {
    // Reference to the doctor document in the clinic's doctors subcollection
    const doctorRef = doc(db, "clinics", clinicId, "doctors", doctorId)
    const doctorDoc = await getDoc(doctorRef)

    if (!doctorDoc.exists()) {
      throw new Error(`Doctor with ID ${doctorId} not found in clinic ${clinicId}`)
    }

    const doctorData = doctorDoc.data()

    // Extract schedule information
    const workingDays = doctorData.schedule?.workingDays || ["segunda", "terca", "quarta", "quinta", "sexta"]

    const workingHours = doctorData.schedule?.workingHours || {
      start: "08:00",
      end: "18:00",
    }

    const is24Hours = workingHours.start === "00:00" && workingHours.end === "23:59"

    return {
      workingDays,
      workingHours,
      is24Hours,
    }
  } catch (error) {
    console.error("Error fetching doctor working hours:", error)
    // Return default schedule if there's an error
    return {
      workingDays: ["segunda", "terca", "quarta", "quinta", "sexta"],
      workingHours: { start: "08:00", end: "18:00" },
    }
  }
}

/**
 * Generates appointment slots based on doctor working hours
 * @param date - The date for which to generate slots
 * @param schedule - The doctor's schedule
 * @param slotDuration - Duration of each slot in minutes (default: 30)
 * @returns Array of appointment slots
 */
export function generateAppointmentSlots(date: Date, schedule: DoctorSchedule, slotDuration = 30): AppointmentSlot[] {
  try {
    const slots: AppointmentSlot[] = []

    // Check if the selected date is a working day
    const weekDay = format(date, "EEEE", { locale: ptBR })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace("-feira", "")

    if (!schedule.workingDays.includes(weekDay)) {
      return slots // Return empty array if not a working day
    }

    // Parse working hours
    const [startHour, startMinute] = schedule.workingHours.start.split(":").map(Number)
    const [endHour, endMinute] = schedule.workingHours.end.split(":").map(Number)

    // Create start and end date objects
    const startDate = new Date(date)
    startDate.setHours(startHour, startMinute, 0, 0)

    const endDate = new Date(date)
    endDate.setHours(endHour, endMinute, 0, 0)

    // Generate slots
    let currentSlot = startDate
    while (currentSlot < endDate) {
      slots.push({
        time: format(currentSlot, "HH:mm"),
        isAvailable: true,
      })
      currentSlot = addMinutes(currentSlot, slotDuration)
    }

    return slots
  } catch (error) {
    console.error("Error generating appointment slots:", error)
    return []
  }
}

/**
 * Checks availability of appointment slots in Firestore
 * @param clinicId - The clinic ID
 * @param date - The date to check
 * @param doctorId - The doctor ID (optional)
 * @returns Array of available time slots
 */
export async function checkSlotsAvailability(clinicId: string, date: Date, doctorId?: string): Promise<string[]> {
  try {
    // Get reference to appointments collection
    const appointmentsRef = collection(db, "appointments")

    // Create date range for the selected date
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    // Build query based on parameters
    let appointmentsQuery = query(
      appointmentsRef,
      where("clinicId", "==", clinicId),
      where("date", ">=", Timestamp.fromDate(dayStart)),
      where("date", "<=", Timestamp.fromDate(dayEnd)),
    )

    // Add doctor filter if provided
    if (doctorId) {
      appointmentsQuery = query(
        appointmentsRef,
        where("clinicId", "==", clinicId),
        where("doctorId", "==", doctorId),
        where("date", ">=", Timestamp.fromDate(dayStart)),
        where("date", "<=", Timestamp.fromDate(dayEnd)),
      )
    }

    // Execute query
    const appointments = await getDocs(appointmentsQuery)

    // Extract booked time slots
    const bookedSlots = new Set(appointments.docs.map((doc) => format(doc.data().date.toDate(), "HH:mm")))

    // If doctor ID is provided, get their schedule
    let doctorSchedule: DoctorSchedule
    if (doctorId) {
      doctorSchedule = await fetchDoctorWorkingHours(clinicId, doctorId)
    } else {
      // Default schedule if no doctor specified
      doctorSchedule = {
        workingDays: ["segunda", "terca", "quarta", "quinta", "sexta"],
        workingHours: { start: "08:00", end: "18:00" },
      }
    }

    // Generate all possible slots for the day
    const allSlots = generateAppointmentSlots(date, doctorSchedule)

    // Filter out booked slots
    return allSlots.filter((slot) => !bookedSlots.has(slot.time)).map((slot) => slot.time)
  } catch (error) {
    console.error("Error checking slots availability:", error)
    return []
  }
}

/**
 * Temporarily blocks a time slot to prevent double bookings
 * @param clinicId - The clinic ID
 * @param doctorId - The doctor ID
 * @param date - The appointment date
 * @param time - The appointment time
 * @param blockDuration - How long to block the slot in minutes (default: 10)
 * @returns ID of the temporary block document
 */
export async function blockTimeSlot(
  clinicId: string,
  doctorId: string,
  date: Date,
  time: string,
  blockDuration = 10,
): Promise<string> {
  try {
    const tempBlocksRef = collection(db, "temporaryBlocks")
    
    // Generate a timestamp-based ID that's more reliable
    const blockId = `block_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const blockRef = doc(tempBlocksRef, blockId)

    const appointmentDate = new Date(date)
    const [hours, minutes] = time.split(":").map(Number)
    appointmentDate.setHours(hours, minutes, 0, 0)
    
    const expirationTime = addMinutes(new Date(), blockDuration)

    await setDoc(blockRef, {
      id: blockId, // Store the ID in the document
      clinicId,
      doctorId,
      date: Timestamp.fromDate(appointmentDate),
      time,
      blockedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expirationTime),
      status: "blocked",
    })

    return blockId
  } catch (error) {
    console.error("Error blocking time slot:", error)
    throw error
  }
}

/**
 * Schedules an appointment in Firestore
 * @param appointmentData - The appointment data
 * @param blockId - ID of the temporary block (optional)
 * @returns Object with appointment and consultation IDs
 */
export async function scheduleAppointment(
  appointmentData: any,
  blockId?: string,
): Promise<{ appointmentId: string; consultationId: string }> {
  try {
    const batch = writeBatch(db)

    // Create appointment document
    const appointmentsRef = collection(db, "appointments")
    const appointmentRef = doc(appointmentsRef)

    // Create consultation document
    const consultationsRef = collection(db, "consultations")
    const consultationRef = doc(consultationsRef)

    // Parse date and time
    const dateTime = new Date(`${format(appointmentData.date, "yyyy-MM-dd")}T${appointmentData.time}`)

    // Prepare appointment data
    const appointmentDoc = {
      id: appointmentRef.id,
      type: "consultation",
      consultationId: consultationRef.id,
      clinicId: appointmentData.clinicId,
      doctorId: appointmentData.doctorId,
      patientName: appointmentData.patientName,
      date: Timestamp.fromDate(dateTime),
      duration: 30,
      status: "Agendado",
      createdAt: serverTimestamp(),
    }

    // Prepare consultation data
    const consultationDoc = {
      id: consultationRef.id,
      appointmentId: appointmentRef.id,
      ...appointmentData,
      date: Timestamp.fromDate(dateTime),
      status: "Agendado",
      createdAt: serverTimestamp(),
    }

    // Add documents to batch
    batch.set(appointmentRef, appointmentDoc)
    batch.set(consultationRef, consultationDoc)

    // If there's a block ID, update its status
    if (blockId) {
      const blockRef = doc(db, "temporaryBlocks", blockId)
      batch.update(blockRef, {
        status: "confirmed",
        appointmentId: appointmentRef.id,
        consultationId: consultationRef.id,
      })
    }

    // Commit the batch
    await batch.commit()

    return {
      appointmentId: appointmentRef.id,
      consultationId: consultationRef.id,
    }
  } catch (error) {
    console.error("Error scheduling appointment:", error)
    throw error
  }
}

/**
 * Unblocks a time slot after scheduling or cancellation
 * @param blockId - ID of the temporary block
 * @param status - New status for the block (confirmed, cancelled, expired)
 */
export async function unblockTimeSlot(blockId: string, status: "confirmed" | "cancelled" | "expired"): Promise<void> {
  if (!blockId) {
    console.log("No block ID provided")
    return
  }

  try {
    const blockRef = doc(db, "temporaryBlocks", blockId)
    
    if (status === "expired") {
      await deleteDoc(blockRef)
      return
    }

    // For confirmed or cancelled, just update without checking existence
    await updateDoc(blockRef, {
      status,
      updatedAt: serverTimestamp(),
    }).catch(error => {
      // Ignore document not found errors
      if (error.code === 'not-found') {
        console.log(`Block ${blockId} already removed`)
        return
      }
      throw error
    })
  } catch (error) {
    console.warn(`Failed to unblock slot ${blockId}:`, error)
    // Don't throw error for non-critical operation
  }
}

/**
 * Cleans up expired temporary blocks
 * This function should be called periodically, e.g., by a scheduled function
 */
export async function cleanupExpiredBlocks(): Promise<void> {
  try {
    const tempBlocksRef = collection(db, "temporaryBlocks")
    const now = new Date()

    // Query for expired blocks
    const expiredBlocksQuery = query(
      tempBlocksRef,
      where("expiresAt", "<=", Timestamp.fromDate(now)),
      where("status", "==", "blocked"),
    )

    const expiredBlocks = await getDocs(expiredBlocksQuery)

    // Delete expired blocks
    const batch = writeBatch(db)
    expiredBlocks.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    if (expiredBlocks.docs.length > 0) {
      await batch.commit()
      console.log(`Cleaned up ${expiredBlocks.docs.length} expired blocks`)
    }
  } catch (error) {
    console.error("Error cleaning up expired blocks:", error)
  }
}
