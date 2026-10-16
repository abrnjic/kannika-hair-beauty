import thai from './translations-th.js';
export const language = typeof document !== 'undefined' && document.documentElement.lang === 'th' ? 'th' : 'en';
export const locale = language === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB';
export function t(message, values = {}, lang = language) {
 const translated = lang === 'th' ? (thai[message] ?? message) : message;
 return translated.replace(/\{(\w+)\}/g, (match,key) => String(values[key] ?? match));
}
// Only use on application-owned markup, never client names, notes or emails.
export function translateTree(root) {
 if(language !== 'th') return;
 const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
 for(let node; (node=walker.nextNode());) {
  const key=node.textContent.trim();
  if(thai[key])node.textContent=node.textContent.replace(key,thai[key]);
 }
 for(const element of root.querySelectorAll('[aria-label],[placeholder],[title]')) {
  for(const attr of ['aria-label','placeholder','title'])if(element.hasAttribute(attr))element.setAttribute(attr,t(element.getAttribute(attr)));
 }
}
export function html(markup) {
 if(language !== 'th')return markup;
 const template=document.createElement('template');template.innerHTML=markup.replace('Your <em>privacy.</em>','ความเป็นส่วนตัว<em>ของคุณ</em>');translateTree(template.content);return template.innerHTML;
}
export function bookingCopy(data,reference='',lang=language) {
 const tr=message=>t(message,{},lang);
 const lines=[tr('KANNIKA — APPOINTMENT REQUEST'),''];
 for(const [key,label] of [['service','Treatment'],['date','Preferred date'],['time','Preferred time'],['name','Your name'],['email','Your email'],['notes','Client notes']]) {
  const value=['service','time'].includes(key)?tr(data[key]):data[key];
  lines.push(`${tr(label)}: ${value||'—'}`);
 }
 lines.push(tr('All appointment times are in Pattaya'));
 if(reference)lines.push('',`${tr('Reference')}: ${reference}`,tr('Status: pending — awaiting salon confirmation.'));
 return lines.join('\n');
}
export function localizeValidation(form) {
 if(language !== 'th')return;
 form.addEventListener('invalid',event=>{
  const field=event.target;
  field.setCustomValidity('');
  if(field.validity.valueMissing)field.setCustomValidity(t(field.type==='checkbox'?'Please agree before sending your request.':'Please complete this field.'));
  else if(field.validity.typeMismatch)field.setCustomValidity(t('Please enter a valid email address.'));
  else if(!field.validity.valid)field.setCustomValidity(t('Please complete this field.'));
 },true);
 form.addEventListener('input',event=>event.target.setCustomValidity?.(''));
}
