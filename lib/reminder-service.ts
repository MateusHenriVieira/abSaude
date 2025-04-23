import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore"
import { format, addDays, addHours } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ReminderOptions {
  appointmentId: string
  patientName: string
  patientEmail?: string
  patientPhone?: string
  doctorName: string
  clinicName: string
  appointmentDate: Date
  appointmentType: string
  reminderType: "email" | "sms" | "both"
  reminderTime: "1day" | "3hours" | "1hour" | "custom"
  customHours?: number
}

/**
 * Schedules a reminder for an appointment
 * @param options Reminder options
 * @returns ID of the created reminder
 */
export async function scheduleReminder(options: ReminderOptions): Promise<string> {
  try {
    const remindersRef = collection(db, "reminders")

    // Calculate when the reminder should be sent
    let reminderDate: Date
    const appointmentDate = new Date(options.appointmentDate)

    switch (options.reminderTime) {
      case "1day":
        reminderDate = addDays(appointmentDate, -1)
        break
      case "3hours":
        reminderDate = addHours(appointmentDate, -3)
        break
      case "1hour":
        reminderDate = addHours(appointmentDate, -1)
        break
      case "custom":
        if (!options.customHours) {
          throw new Error("Custom hours must be specified for custom reminder time")
        }
        reminderDate = addHours(appointmentDate, -options.customHours)
        break
      default:
        reminderDate = addDays(appointmentDate, -1) // Default to 1 day before
    }

    // Create the reminder document
    const reminderDoc = await addDoc(remindersRef, {
      appointmentId: options.appointmentId,
      patientName: options.patientName,
      patientEmail: options.patientEmail || null,
      patientPhone: options.patientPhone || null,
      doctorName: options.doctorName,
      clinicName: options.clinicName,
      appointmentDate: Timestamp.fromDate(appointmentDate),
      appointmentType: options.appointmentType,
      reminderType: options.reminderType,
      reminderDate: Timestamp.fromDate(reminderDate),
      status: "scheduled",
      createdAt: serverTimestamp(),
    })

    return reminderDoc.id
  } catch (error) {
    console.error("Error scheduling reminder:", error)
    throw error
  }
}

/**
 * Cancels a scheduled reminder
 * @param reminderId ID of the reminder to cancel
 */
export async function cancelReminder(reminderId: string): Promise<void> {
  try {
    const reminderRef = doc(db, "reminders", reminderId)
    await updateDoc(reminderRef, {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error cancelling reminder:", error)
    throw error
  }
}

/**
 * Updates a reminder for a rescheduled appointment
 * @param reminderId ID of the reminder to update
 * @param newAppointmentDate New appointment date
 * @param reminderTime When to send the reminder
 */
export async function updateReminder(
  reminderId: string,
  newAppointmentDate: Date,
  reminderTime: "1day" | "3hours" | "1hour" | "custom" = "1day",
  customHours?: number,
): Promise<void> {
  try {
    // Calculate new reminder date
    let newReminderDate: Date

    switch (reminderTime) {
      case "1day":
        newReminderDate = addDays(newAppointmentDate, -1)
        break
      case "3hours":
        newReminderDate = addHours(newAppointmentDate, -3)
        break
      case "1hour":
        newReminderDate = addHours(newAppointmentDate, -1)
        break
      case "custom":
        if (!customHours) {
          throw new Error("Custom hours must be specified for custom reminder time")
        }
        newReminderDate = addHours(newAppointmentDate, -customHours)
        break
      default:
        newReminderDate = addDays(newAppointmentDate, -1)
    }

    const reminderRef = doc(db, "reminders", reminderId)
    await updateDoc(reminderRef, {
      appointmentDate: Timestamp.fromDate(newAppointmentDate),
      reminderDate: Timestamp.fromDate(newReminderDate),
      status: "rescheduled",
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating reminder:", error)
    throw error
  }
}

/**
 * Processes due reminders and sends notifications
 * This should be called by a scheduled function
 */
export async function processDueReminders(): Promise<number> {
  try {
    const remindersRef = collection(db, "reminders")
    const now = new Date()

    // Query for reminders that are due and not yet sent
    const dueRemindersQuery = query(
      remindersRef,
      where("reminderDate", "<=", Timestamp.fromDate(now)),
      where("status", "==", "scheduled"),
    )

    const dueReminders = await getDocs(dueRemindersQuery)
    let sentCount = 0

    // Process each due reminder
    for (const reminderDoc of dueReminders.docs) {
      const reminder = reminderDoc.data()
      const reminderRef = reminderDoc.ref

      try {
        // Send the appropriate notification based on reminderType
        if (reminder.reminderType === "email" || reminder.reminderType === "both") {
          if (reminder.patientEmail) {
            await sendEmailReminder(reminder)
          }
        }

        if (reminder.reminderType === "sms" || reminder.reminderType === "both") {
          if (reminder.patientPhone) {
            await sendSmsReminder(reminder)
          }
        }

        // Update reminder status to sent
        await updateDoc(reminderRef, {
          status: "sent",
          sentAt: serverTimestamp(),
        })

        sentCount++
      } catch (err) {
        console.error(`Error processing reminder ${reminderDoc.id}:`, err)

        // Mark as failed
        await updateDoc(reminderRef, {
          status: "failed",
          error: err instanceof Error ? err.message : 'Unknown error',
          updatedAt: serverTimestamp(),
        })
      }
    }

    return sentCount
  } catch (error) {
    console.error("Error processing due reminders:", error)
    throw error
  }
}

/**
 * Sends an email reminder
 * @param reminder Reminder data
 */
async function sendEmailReminder(reminder: any): Promise<void> {
  try {
    // Format the appointment date
    const appointmentDate = reminder.appointmentDate.toDate()
    const formattedDate = format(appointmentDate, "PPP 'às' HH:mm", { locale: ptBR })

    // Create email content
    const emailSubject = `Lembrete de Consulta - ${reminder.clinicName}`
    const emailBody = `
      Olá ${reminder.patientName},

      Este é um lembrete para sua consulta de ${reminder.appointmentType} com Dr(a). ${reminder.doctorName} 
      agendada para ${formattedDate} na ${reminder.clinicName}.

      Por favor, chegue com 15 minutos de antecedência.

      Atenciosamente,
      Equipe ${reminder.clinicName}
    `

    // Add to emails collection for processing
    await addDoc(collection(db, "emails"), {
      to: reminder.patientEmail,
      subject: emailSubject,
      body: emailBody,
      createdAt: serverTimestamp(),
      status: "pending",
    })
  } catch (error) {
    console.error("Error sending email reminder:", error)
    throw error
  }
}

/**
 * Sends an SMS reminder
 * @param reminder Reminder data
 */
async function sendSmsReminder(reminder: any): Promise<void> {
  try {
    // Format the appointment date
    const appointmentDate = reminder.appointmentDate.toDate()
    const formattedDate = format(appointmentDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    // Create SMS content
    const smsBody = `Lembrete: Consulta de ${reminder.appointmentType} com Dr(a). ${
      reminder.doctorName
    } em ${formattedDate}. Local: ${reminder.clinicName.substring(0, 20)}...`

    // Add to SMS collection for processing
    await addDoc(collection(db, "sms"), {
      to: reminder.patientPhone,
      body: smsBody,
      createdAt: serverTimestamp(),
      status: "pending",
    })
  } catch (error) {
    console.error("Error sending SMS reminder:", error)
    throw error
  }
}
