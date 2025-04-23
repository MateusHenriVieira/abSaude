import { collection, query, where, onSnapshot, Timestamp, doc, setDoc, deleteDoc, getDocs, getDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { format, addMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HORARIO_FUNCIONAMENTO, DIAS_FUNCIONAMENTO } from './clinics';

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
  lockExpires?: Timestamp;
}

interface AppointmentSlot {
  clinicId: string;
  date: Date;
  time: string;
  type: 'exam' | 'consultation';
  status: 'locked' | 'booked';
  lockedBy?: string;
  lockExpires?: Timestamp;
}

// Add interface for doctor schedule
interface DoctorSchedule {
  workingDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
}

interface BookingData {
  userId: string;
  serviceType: 'exam' | 'consultation';
  date: Date;
  time: string;
  clinicId: string;
  status: 'locked' | 'booked';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  lockExpires?: Timestamp; // Add this field
}

// Update collection reference to use subcollection
function getClinicSlotsRef(clinicId: string) {
  return collection(db, `clinics/${clinicId}/appointmentSlots`);
}

const DEFAULT_SCHEDULE = {
  workingDays: DIAS_FUNCIONAMENTO,
  workingHours: HORARIO_FUNCIONAMENTO
};

// Update generateTimeSlots to accept booked slots
export function generateTimeSlots(
  start: string = HORARIO_FUNCIONAMENTO.start, 
  end: string = HORARIO_FUNCIONAMENTO.end,
  bookedSlots: string[] = []
) {
  const slots = [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startHour, startMinute, 0, 0);

  const endDate = new Date();
  endDate.setHours(endHour, endMinute, 0, 0);

  let currentSlot = startDate;
  while (currentSlot < endDate) {
    const timeStr = format(currentSlot, 'HH:mm');
    slots.push({
      time: timeStr,
      isAvailable: !bookedSlots.includes(timeStr)
    });
    currentSlot = addMinutes(currentSlot, 30);
  }

  return slots;
}

// Update getClinicSchedule to handle doctor schedules
async function getSchedule(clinicId: string, type: 'exam' | 'consultation', doctorId?: string): Promise<any> {
  if (type === 'consultation' && doctorId) {
    // Get doctor schedule from subcollection
    const doctorRef = doc(db, `clinics/${clinicId}/doctors/${doctorId}`);
    const doctorDoc = await getDoc(doctorRef);
    
    if (doctorDoc.exists()) {
      const doctorData = doctorDoc.data();
      return {
        workingDays: doctorData.workingDays || DEFAULT_SCHEDULE.workingDays,
        workingHours: doctorData.workingHours || DEFAULT_SCHEDULE.workingHours
      };
    }
  }

  // Default to clinic schedule for exams or if no doctor found
  const scheduleRef = doc(db, `clinics/${clinicId}/funcionamento/schedule`);
  const scheduleDoc = await getDoc(scheduleRef);
  
  if (!scheduleDoc.exists()) return DEFAULT_SCHEDULE;
  
  const scheduleData = scheduleDoc.data();
  return !scheduleData.is24Hours ? DEFAULT_SCHEDULE : {
    workingDays: scheduleData.workingDays || DEFAULT_SCHEDULE.workingDays,
    workingHours: scheduleData.workingHours || DEFAULT_SCHEDULE.workingHours
  };
}

// Update isWorkingDay function
export async function isWorkingDay(clinicId: string, date: Date, type: 'exam' | 'consultation', doctorId?: string): Promise<boolean> {
  try {
    const schedule = await getSchedule(clinicId, type, doctorId);
    if (!schedule) return false;
    
    const weekDay = format(date, 'EEEE', { locale: ptBR })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    
    return schedule.workingDays.includes(weekDay);
  } catch (error) {
    console.error('Error checking working day:', error);
    return false;
  }
}

async function getExistingBookings(clinicId: string, date: Date, type: string) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const slotsRef = getClinicSlotsRef(clinicId);
  const q = query(
    slotsRef,
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay)),
    where('type', '==', type),
    where('status', '==', 'booked')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().time);
}

// Update generateTimeSlotsForDate function
export async function generateTimeSlotsForDate(clinicId: string, date: Date, type: 'exam' | 'consultation', doctorId?: string) {
  try {
    const schedule = await getSchedule(clinicId, type, doctorId);
    if (!schedule) return [];

    if (!await isWorkingDay(clinicId, date, type, doctorId)) {
      return [];
    }

    // Get existing bookings first
    const bookedSlots = await getExistingBookings(clinicId, date, type);

    // Generate all possible slots
    const allSlots = generateTimeSlots(
      schedule.workingHours.start,
      schedule.workingHours.end,
      bookedSlots
    );

    // Filter out booked slots
    return allSlots.filter(slot => !bookedSlots.includes(slot.time));
  } catch (error) {
    console.error('Error generating time slots:', error);
    return [];
  }
}

// Update subscribeToSlots signature
export function subscribeToSlots(
  clinicId: string, 
  date: Date,
  callback: (slots: string[]) => void,
  type: 'exam' | 'consultation' = 'exam',
  doctorId?: string,
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return isWorkingDay(clinicId, date, type, doctorId).then(async (isWorking) => {
    if (!isWorking) {
      callback([]);
      return;
    }

    const slotsRef = getClinicSlotsRef(clinicId);
    const q = query(
      slotsRef,
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay))
    );

    return onSnapshot(q, async (snapshot) => {
      // Get all booked and locked slots
      const unavailableSlots = snapshot.docs
        .map(doc => doc.data())
        .filter(slot => 
          slot.type === type && (
            slot.status === 'booked' || 
            (slot.status === 'locked' && slot.lockExpires?.toDate() > new Date())
          )
        )
        .map(slot => slot.time);

      callback(unavailableSlots);
    });
  });
}

// Lock a time slot temporarily during booking process
export async function isSlotAvailable(
  clinicId: string,
  date: Date,
  time: string,
  type: 'exam' | 'consultation'
): Promise<boolean> {
  const slotsRef = getClinicSlotsRef(clinicId);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const q = query(
      slotsRef,
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<=', Timestamp.fromDate(endOfDay)),
      where('time', '==', time),
      where('type', '==', type)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.empty;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
}

export async function lockTimeSlot(
  clinicId: string,
  date: Date,
  time: string,
  userId: string,
  type: 'exam' | 'consultation'
): Promise<boolean> {
  const slotsRef = getClinicSlotsRef(clinicId);
  const slotId = `${format(date, 'yyyy-MM-dd')}-${time}-${type}`;
  
  try {
    return await runTransaction(db, async (transaction) => {
      // Check availability within transaction
      if (!await isSlotAvailable(clinicId, date, time, type)) {
        return false;
      }

      const slotRef = doc(slotsRef, slotId);
      const lockExpires = Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));

      const bookingData: BookingData = {
        userId,
        serviceType: type,
        date: date,
        time,
        clinicId,
        status: 'locked',
        createdAt: Timestamp.now(),
        lockExpires
      };

      transaction.set(slotRef, bookingData);
      return true;
    });
  } catch (error) {
    console.error('Error locking time slot:', error);
    return false;
  }
}

// Confirm a booking by marking the slot as booked
export async function confirmBooking(
  clinicId: string,
  date: Date,
  time: string,
  userId: string,
  type: 'exam' | 'consultation' = 'exam'
): Promise<boolean> {
  const slotsRef = getClinicSlotsRef(clinicId);
  const slotId = `${format(date, 'yyyy-MM-dd')}-${time}-${type}`;
  
  try {
    return await runTransaction(db, async (transaction) => {
      const slotRef = doc(slotsRef, slotId);
      const slotDoc = await transaction.get(slotRef);

      if (!slotDoc.exists()) return false;
      
      const data = slotDoc.data();
      if (data.status === 'booked' || data.userId !== userId) return false;

      transaction.update(slotRef, {
        status: 'booked',
        updatedAt: Timestamp.now(),
        lockExpires: null
      });

      return true;
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    return false;
  }
}

// Release a locked slot
export async function releaseSlot(
  clinicId: string, 
  date: Date, 
  time: string,
  type: 'exam' | 'consultation' = 'exam'
): Promise<boolean> {
  const slotsRef = getClinicSlotsRef(clinicId);
  const slotId = `${format(date, 'yyyy-MM-dd')}-${time}`;
  try {
    await deleteDoc(doc(slotsRef, slotId));
    return true;
  } catch (error) {
    console.error('Error releasing slot:', error);
    return false;
  }
}

// Clean up expired locks periodically
export async function cleanupExpiredLocks() {
  try {
    const clinicsRef = collection(db, 'clinics');
    const clinicsSnapshot = await getDocs(clinicsRef);
    const now = Timestamp.now();

    const cleanupTasks = clinicsSnapshot.docs.map(async (clinicDoc) => {
      const clinicId = clinicDoc.id;
      const slotsRef = getClinicSlotsRef(clinicId);
      const q = query(
        slotsRef,
        where('status', '==', 'locked'),
        where('lockExpires', '<', now)
      );

      const snapshot = await getDocs(q);
      const deleteTasks = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteTasks);
    });

    await Promise.all(cleanupTasks);
  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
  }
}
