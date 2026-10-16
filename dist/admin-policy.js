import {t} from './i18n.js';
export const statuses = ['pending', 'confirmed', 'declined'];
export function validateDecision({status, confirmedDate = '', confirmedTime = ''}, now = new Date()) {
  if (!statuses.includes(status)) throw new Error(t('Choose a valid request status.'));
  if (status !== 'confirmed') return {status, confirmedDate: '', confirmedTime: ''};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(confirmedDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(confirmedTime)) throw new Error(t('Choose a date and an exact appointment time.'));
  const parsed = new Date(confirmedDate + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== confirmedDate) throw new Error(t('Choose a valid calendar date.'));
  if (new Date(`${confirmedDate}T${confirmedTime}:00+07:00`) <= now) throw new Error(t('The confirmed appointment must be in the future (Pattaya time).'));
  return {status, confirmedDate, confirmedTime};
}
export function decisionIsCurrent(current, expected) {
  return current.status === expected.status && (current.updatedAt?.toMillis?.() ?? null) === (expected.updatedAt?.toMillis?.() ?? null);
}
