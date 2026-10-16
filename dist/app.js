import {bookingsEnabled} from './firebase-config.js';
import {validateBooking, bangkokToday} from './booking-validation.js';
let submitting = false;
let completed = false;
const booking = document.querySelector('#booking-dialog');
const form = document.querySelector('#booking-form');
let draft = '';
const toast = message => {const el=document.querySelector('.toast');el.textContent=message;el.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('visible'),3500)};
document.querySelector('#date').min=bangkokToday();
document.querySelector('#year').textContent=new Date().getFullYear();
if(bookingsEnabled){
 document.querySelector('.notice').textContent='Send an appointment request to Kannika. Your preferred date and time are subject to confirmation by the salon. Email notifications are not available yet.';
 form.querySelector('[type=submit]').innerHTML='Send appointment request <span>↗</span>';
 form.querySelector('.consent').lastChild.textContent=' I agree to share these details with Kannika to handle my request. My appointment requires salon confirmation.';
 document.querySelector('.booking-banner small').textContent='Request your preferred time. Appointments are confirmed by the salon.';
 document.querySelector('.share-note').textContent='Instagram: copy the link to add it to your story.';
 document.querySelector('#privacy-dialog').innerHTML='<button class="close-dialog" aria-label="Close privacy information">×</button><h2>Your <em>privacy.</em></h2><p>When you send an appointment request, your name, email, preferred service, date, time and optional notes are stored in the salon’s Firebase database to handle your enquiry. Avoid including sensitive personal information in notes. Your request is pending until the salon confirms it.</p><p>A temporary Firebase sign-in protects access to your request. Other visitors cannot browse your details. Closing this page ends that sign-in session. Downloaded copies remain on your device.</p><p>Fonts and photographs load from Google Fonts and Unsplash. Social sharing opens the selected platform. For enquiries or privacy requests, contact <a href="mailto:kannika54932@gmail.com">kannika54932@gmail.com</a>. Data retention details will be added before the booking service is promoted to clients.</p>';
}
const submitButton = form.querySelector('[type=submit]');
const submitLabel = submitButton.innerHTML;
const formError = document.createElement('p');formError.id='booking-error';formError.setAttribute('role','alert');formError.hidden=true;form.append(formError);
document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{document.querySelector('#date').min=bangkokToday();form.hidden=false;completed=false;formError.hidden=true;document.querySelector('#draft-result').hidden=true;const value=button.dataset.book;if(value)document.querySelector('#service').value=value;booking.showModal()}));
document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog && !submitting){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}}));
booking.addEventListener('cancel',event=>{if(submitting)event.preventDefault()});
booking.addEventListener('close',()=>{form.reset();draft='';document.querySelector('#draft-summary').textContent='';form.hidden=false;document.querySelector('#draft-result').hidden=true});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(submitting||completed)return;
 formError.hidden=true;
 let data;
 try{data=validateBooking(Object.fromEntries(new FormData(form)));}catch(error){formError.textContent=error.message;formError.hidden=false;return;}
 draft=`KANNIKA — APPOINTMENT REQUEST${bookingsEnabled?'':' DRAFT'}\n\nTreatment: ${data.service}\nPreferred date: ${data.date}\nPreferred time: ${data.time} (Pattaya, Thailand)\nName: ${data.name}\nEmail: ${data.email}\nNotes: ${data.notes || '—'}`;
 let reference='';
 if(bookingsEnabled){
  submitting=true;submitButton.disabled=true;submitButton.textContent='Sending your request…';form.setAttribute('aria-busy','true');booking.querySelector('.close-dialog').disabled=true;
  try{const {sendBooking}=await import('./firebase-booking.js');const result=await sendBooking(data);reference=result.id;completed=true;draft+=`\n\nRequest reference: ${reference}\nStatus: pending — awaiting salon confirmation.`;}
  catch(error){formError.textContent='We could not confirm your request. Please check your connection and try again. Your details have been kept in this form.';formError.hidden=false;return;}
  finally{submitting=false;submitButton.disabled=false;submitButton.innerHTML=submitLabel;form.removeAttribute('aria-busy');booking.querySelector('.close-dialog').disabled=false;}
 }else{draft+='\n\nThis is a draft. No appointment has been sent or confirmed.';}
 const result=document.querySelector('#draft-result');
 result.querySelector('h3').textContent=bookingsEnabled?'Your request has been received.':'Your appointment draft is ready.';
 document.querySelector('#draft-summary').textContent=`${data.service} · ${data.date} · ${data.time} (Pattaya time)`;
 result.querySelector('p:nth-of-type(2)').textContent=bookingsEnabled?`Reference: ${reference}. Your preferred time is awaiting confirmation by the salon. No confirmation email has been sent.`:'No request has been sent. Keep this draft and contact the salon once contact details are available.';
 document.querySelector('#download-draft').textContent=bookingsEnabled?'Download request copy ↓':'Download draft ↓';
 document.querySelector('#edit-draft').hidden=bookingsEnabled;
 form.hidden=true;result.hidden=false;result.querySelector('h3').setAttribute('tabindex','-1');result.querySelector('h3').focus();
});
document.querySelector('#date').addEventListener('input',event=>event.target.setCustomValidity(''));
document.querySelector('#edit-draft').addEventListener('click',()=>{form.hidden=false;document.querySelector('#draft-result').hidden=true;document.querySelector('#service').focus()});
document.querySelector('#download-draft').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([draft],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=bookingsEnabled?'kannika-appointment-request.txt':'kannika-appointment-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your appointment copy has been downloaded')});
let sharedTitle='';let sharedURL='';
document.querySelectorAll('[data-share]').forEach(button=>button.addEventListener('click',()=>{sharedURL=new URL('#'+button.dataset.share,window.location.href).href;sharedTitle=button.dataset.title+' | Kannika';document.querySelector('#share-title').textContent=button.dataset.title;document.querySelector('#share-url').value=sharedURL;document.querySelector('#share-facebook').href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(sharedURL);document.querySelector('#share-whatsapp').href='https://wa.me/?text='+encodeURIComponent(sharedTitle+' '+sharedURL);document.querySelector('#share-line').href='https://social-plugins.line.me/lineit/share?url='+encodeURIComponent(sharedURL);document.querySelector('#native-share').hidden=!navigator.share;document.querySelector('#share-dialog').showModal()}));
document.querySelector('#native-share').addEventListener('click',async()=>{try{await navigator.share({title:sharedTitle,url:sharedURL})}catch(error){if(error.name!=='AbortError')toast('Use Copy story link to share this story.')}});
document.querySelector('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(sharedURL);toast('Story link copied')}catch{document.querySelector('#share-url').select();toast('Select and copy the story link above')}});
document.querySelector('#privacy-button').addEventListener('click',()=>document.querySelector('#privacy-dialog').showModal());
document.querySelector('.menu-toggle').addEventListener('click',event=>{const open=document.querySelector('nav').classList.toggle('open');event.currentTarget.setAttribute('aria-expanded',String(open));event.currentTarget.setAttribute('aria-label',open?'Close menu':'Open menu')});
document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('nav').classList.remove('open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false')}));
