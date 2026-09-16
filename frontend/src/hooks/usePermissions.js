import { useAuth } from './useAuth.jsx';

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;
  const isStaff = role === 'admin' || role === 'staff';

  return {
    role,
    isAdmin: role === 'admin',
    isStaff,
    isDoctor: role === 'doctor',
    canManageClinic: isStaff,
    canManageDoctorSchedule: (doctorId) =>
      isStaff || Number(user?.doctor_id) === Number(doctorId),
  };
}
