import {t} from './i18n.js';
export const treatments = ["Women's haircut", "Men's haircut", 'Wash & blow-dry', 'Hair styling & updos', 'Hair colour', 'Highlights', 'Hair care treatment', 'Manicure & nail shaping', 'Nail extensions', 'Nail polish & nail art', 'Eyelash extensions', 'Pedicure — women', 'Pedicure — men', 'Help me choose'];
export function bangkokToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
}
export function validateBooking(input, now = new Date()) {
  const data = Object.fromEntries(['service', 'date', 'time', 'name', 'email', 'notes'].map(key => [key, String(input[key] ?? '').trim()]));
  if (!treatments.includes(data.service)) throw new Error(t('Please choose a treatment.'));
  const parsed = new Date(data.date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== data.date || data.date < bangkokToday(now)) throw new Error(t('Please choose today or a future date.'));
  if (!['Morning', 'Afternoon', 'Evening'].includes(data.time)) throw new Error(t('Please choose a preferred time.'));
  if (!data.name || data.name.length > 100) throw new Error(t('Please enter your name (up to 100 characters).'));
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error(t('Please enter a valid email address.'));
  if (data.notes.length > 1000) throw new Error(t('Please keep your notes under 1,000 characters.'));
  return data;
}
