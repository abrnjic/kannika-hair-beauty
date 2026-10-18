export const menuCategories = ['hair', 'lashes', 'nails'];
const idPattern = /^[a-z][a-z0-9-]{0,63}$/;
function check(ok) { if (!ok) throw new Error('invalid_menu'); }
function keys(value, expected) {
 check(value && typeof value === 'object' && !Array.isArray(value));
 check(Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key)));
}
function bilingual(value, max, required = false) {
 keys(value, ['en', 'th']);
 return Object.fromEntries(['en', 'th'].map(lang => {
  check(typeof value[lang] === 'string' && value[lang].length <= max);
  const text = value[lang].trim();
  check(!required || text.length > 0);
  return [lang, text];
 }));
}
export function validateMenu(input) {
 keys(input, ['schemaVersion', 'groups']);
 check(input.schemaVersion === 1 && Array.isArray(input.groups) && input.groups.length <= 30);
 const groupIds = new Set(), serviceIds = new Set(); let count = 0;
 const groups = input.groups.map(group => {
  keys(group, ['id', 'category', 'name', 'services']);
  check(typeof group.id === 'string' && idPattern.test(group.id) && !groupIds.has(group.id)); groupIds.add(group.id);
  check(menuCategories.includes(group.category) && Array.isArray(group.services) && group.services.length <= 100);
  const services = group.services.map(service => {
   keys(service, ['id', 'name', 'description', 'min', 'max', 'priceKind', 'unit', 'visible']);
   check(typeof service.id === 'string' && idPattern.test(service.id) && !serviceIds.has(service.id)); serviceIds.add(service.id);
   check(++count <= 200 && Number.isSafeInteger(service.min) && Number.isSafeInteger(service.max) && service.min >= 0 && service.max >= service.min && service.max <= 1000000);
   check(['fixed', 'range', 'starting'].includes(service.priceKind) && (service.priceKind !== 'fixed' || service.min === service.max));
   check(typeof service.visible === 'boolean');
   return {id:service.id, name:bilingual(service.name,140,true), description:bilingual(service.description,300), min:service.min, max:service.max, priceKind:service.priceKind, unit:bilingual(service.unit,60), visible:service.visible};
  });
  return {id:group.id, category:group.category, name:bilingual(group.name,100,true), services};
 });
 return {schemaVersion:1, groups};
}
export function menuPrice(service, language = 'en') {
 const f = new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-GB');
 const amount = service.min === service.max ? f.format(service.min) : `${f.format(service.min)}–${f.format(service.max)}`;
 return (service.priceKind === 'starting' ? (language === 'th' ? 'เริ่มต้น ' : 'From ') : '') + amount;
}
export function publicMenu(menu) {
 return {...menu, groups:menu.groups.map(group => ({...group, services:group.services.filter(item => item.visible)})).filter(group => group.services.length)};
}
