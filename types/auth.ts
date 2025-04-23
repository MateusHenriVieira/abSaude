export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  type?: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'patient';
  clinicId?: string;
  doctorId?: string;
}
