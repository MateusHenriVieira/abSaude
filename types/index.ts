export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  manager?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkingSchedule {
  clinicId: string;
  workingDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
  updatedAt?: Date;
}