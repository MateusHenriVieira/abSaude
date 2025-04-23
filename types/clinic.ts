export interface ClinicAddress {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;
}

export interface ClinicContact {
  phone: string;
  secondaryPhone: string;
  email: string;
  website: string;
}

export interface ClinicFacilities {
  hasEmergency: boolean;
  hasPharmacy: boolean;
  hasLaboratory: boolean;
  hasXRay: boolean;
  hasUltrasound: boolean;
  hasMRI: boolean;
  hasCTScan: boolean;
}

export interface ClinicCapacity {
  dailyAppointments: number;
  emergencyBeds: number;
  regularBeds: number;
}

export interface ClinicWorkingHours {
  start: string;
  end: string;
}

export interface ClinicData {
  id?: string;
  name: string;
  code: string;
  type: string;
  status: string;
  address: ClinicAddress;
  contact: ClinicContact;
  description: string;
  specialties: string[];
  facilities: ClinicFacilities;
  capacity: ClinicCapacity;
  workingDays: string[];
  workingHours: ClinicWorkingHours;
  logo?: string;
  photo?: string;
  manager: string;
  notes: string;
  is24Hours?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface ClinicFormData {
  name: string;
  code: string;
  type: string;
  status: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude: string;
    longitude: string;
  };
  contact: {
    phone: string;
    secondaryPhone: string;
    email: string;
    website: string;
  };
  description: string;
  specialties: string[];
  facilities: {
    hasEmergency: boolean;
    hasPharmacy: boolean;
    hasLaboratory: boolean;
    hasXRay: boolean;
    hasUltrasound: boolean;
    hasMRI: boolean;
    hasCTScan: boolean;
  };
  capacity: {
    dailyAppointments: number;
    emergencyBeds: number;
    regularBeds: number;
  };
  workingDays: string[];
  workingHours: {
    start: string;
    end: string;
  };
  logo: string;
  photo: string;
  manager: string;
  notes: string;
}
