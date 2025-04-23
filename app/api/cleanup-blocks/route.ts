import { NextResponse } from "next/server"
import { cleanupExpiredBlocks } from "@/lib/doctor-scheduling"

export async function GET() {
  try {
    await cleanupExpiredBlocks()
    return NextResponse.json({ success: true, message: "Expired blocks cleaned up successfully" })
  } catch (error) {
    console.error("Error cleaning up expired blocks:", error)
    return NextResponse.json({ error: "Failed to clean up expired blocks" }, { status: 500 })
  }
}
