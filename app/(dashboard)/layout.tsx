import type React from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { ClinicProvider } from "@/contexts/clinic-context"
import { DataProvider } from "@/contexts/data-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClinicProvider>
      <DataProvider>
        <DashboardShell>{children}</DashboardShell>
      </DataProvider>
    </ClinicProvider>
  )
}

