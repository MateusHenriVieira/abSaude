import { NextResponse } from "next/server"
import { processDueReminders } from "@/lib/reminder-service"

export async function GET() {
  try {
    const processedCount = await processDueReminders()
    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} reminders successfully`,
    })
  } catch (error) {
    console.error("Error processing reminders:", error)
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 })
  }
}
