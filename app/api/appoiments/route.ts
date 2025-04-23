import { NextResponse } from "next/server"
import { checkSlotsAvailability, blockTimeSlot, unblockTimeSlot } from "@/lib/doctor-scheduling"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clinicId = searchParams.get("clinicId")
    const doctorId = searchParams.get("doctorId")
    const dateParam = searchParams.get("date")

    if (!clinicId || !dateParam) {
      return NextResponse.json(
        { error: "Missing required parameters: clinicId and date are required" },
        { status: 400 },
      )
    }

    const date = new Date(dateParam)

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    // Get available slots
    const availableSlots = await checkSlotsAvailability(clinicId, date, doctorId || undefined)

    return NextResponse.json({ availableSlots })
  } catch (error) {
    console.error("Error fetching available slots:", error)
    return NextResponse.json({ error: "Failed to fetch available slots" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clinicId, doctorId, date, time, action } = body

    if (!clinicId || !doctorId || !date || !time || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Parse the date
    const appointmentDate = new Date(date)

    if (action === "block") {
      // Block the time slot
      const blockId = await blockTimeSlot(clinicId, doctorId, appointmentDate, time)
      return NextResponse.json({ blockId })
    } else if (action === "unblock") {
      const { blockId, status } = body

      if (!blockId || !status) {
        return NextResponse.json({ error: "Missing blockId or status" }, { status: 400 })
      }

      // Unblock the time slot
      await unblockTimeSlot(blockId, status)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing appointment action:", error)
    return NextResponse.json({ error: "Failed to process appointment action" }, { status: 500 })
  }
}
