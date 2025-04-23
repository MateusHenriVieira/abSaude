import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clinicId = searchParams.get('clinicId')
    const doctorId = searchParams.get('doctorId')
    const date = searchParams.get('date')

    console.log('API Request params:', { clinicId, doctorId, date })

    if (!clinicId || !doctorId || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters', params: { clinicId, doctorId, date } },
        { status: 400 }
      )
    }

    // Fetch doctor's schedule from Firestore
    const doctorRef = doc(db, 'clinics', clinicId, 'doctors', doctorId)
    const doctorSnap = await getDoc(doctorRef)

    if (!doctorSnap.exists()) {
      console.error('Doctor not found:', { clinicId, doctorId })
      return NextResponse.json(
        { error: 'Doctor not found', params: { clinicId, doctorId } },
        { status: 404 }
      )
    }

    const doctorData = doctorSnap.data()
    console.log('Doctor data:', doctorData)

    const schedule = doctorData.schedule || {
      workingHours: { start: "08:00", end: "18:00" },
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }

    // Generate all possible slots
    const allSlots = []
    const [startHour] = schedule.workingHours.start.split(':').map(Number)
    const [endHour] = schedule.workingHours.end.split(':').map(Number)

    for (let hour = startHour; hour < endHour; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`)
      allSlots.push(`${hour.toString().padStart(2, '0')}:30`)
    }

    console.log('Generated slots:', allSlots)

    return NextResponse.json({ 
      availableSlots: allSlots,
      schedule,
      debug: {
        doctorId,
        clinicId,
        date,
        generatedSlots: allSlots.length
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clinicId, doctorId, date, time, action } = body

    if (!clinicId || !doctorId || !date || !time || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    if (action === 'block') {
      // Generate a unique block ID
      const blockId = `block_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      
      // Create document reference
      const blockRef = doc(db, "temporaryBlocks", blockId)
      
      // Create the document first
      await setDoc(blockRef, {
        clinicId,
        doctorId,
        date: Timestamp.fromDate(new Date(date)),
        time,
        blockedAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)), // 5 minutes from now
        status: 'blocked'
      })

      return NextResponse.json({ blockId })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing appointment action:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
