declare module 'react-big-calendar' {
  import { Component } from 'react'
  
  export const Views: {
    MONTH: string
    WEEK: string
    WORK_WEEK: string
    DAY: string
    AGENDA: string
  }

  export type View = 'month' | 'week' | 'work_week' | 'day' | 'agenda'

  export interface CalendarProps {
    localizer: any
    events: any[]
    views?: View[] | object
    view?: View
    date?: Date
    onNavigate?: (newDate: Date) => void
    onView?: (view: View) => void
    onSelectEvent?: (event: any) => void
    onSelectSlot?: (slotInfo: any) => void
    components?: any
    style?: object
    startAccessor?: string | ((event: any) => Date)
    endAccessor?: string | ((event: any) => Date)
    messages?: any
    formats?: any
  }

  export class Calendar extends Component<CalendarProps> {}
  export function momentLocalizer(moment: any): any
}
