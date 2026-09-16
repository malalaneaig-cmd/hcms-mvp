import { HttpError } from './errorHandler.js';

export function isStaff(user) {
  return user?.role === 'admin' || user?.role === 'staff';
}

export function assertStaff(req) {
  if (!isStaff(req.user)) {
    throw new HttpError(403, 'Staff or admin role required');
  }
}

/** Admin/staff: any doctor. Doctors: own schedule only. */
export function assertCanManageDoctorSchedule(req, doctorId) {
  if (isStaff(req.user)) return;
  if (req.user?.role === 'doctor' && Number(req.user.doctor_id) === Number(doctorId)) return;
  throw new HttpError(403, 'Not authorized to manage this doctor schedule');
}
