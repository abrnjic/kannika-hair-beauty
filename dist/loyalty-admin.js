import {collection,query,where,getDocs,getDocFromServer,doc,orderBy,limit} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {recordLoyaltyEvent} from './loyalty-store.js';
import {rewardSummary} from './loyalty-policy.js';
import {t,localizeValidation} from './i18n.js';
import {bangkokToday} from './booking-validation.js';
export function setupLoyaltyAdmin(db,getUser){
 const $=s=>document.querySelector(s);let memberId=null,requestId=crypto.randomUUID(),busy=false,generation=0;
 const message=text=>{$('#loyalty-message').textContent=t(text);$('#loyalty-message').hidden=!text};
 async function notify(eventId,uid){const user=getUser();if(!user)return;const response=await fetch('/api/loyalty-notification',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify({memberId:uid,eventId})});const result=await response.json();if(!response.ok||result.notification!=='sent')throw Error('Saved, but the email could not be sent. Retry from the activity list.');}
 async function display(){
  const uid=memberId,user=getUser(),current=generation;if(!uid||!user)return;
  const snapshot=await getDocFromServer(doc(db,'loyaltyMembers',uid));if(current!==generation||getUser()?.uid!==user.uid)return;if(!snapshot.exists())throw Error('Ask the client to join Beauty Club first.');
  const data=snapshot.data(),s=rewardSummary(data);$('#loyalty-member').textContent=`${data.name} · ${data.email}`;$('#loyalty-totals').textContent=t('{visits} stamps · {discounts} discounts · {gifts} gifts available',{visits:s.stamps,discounts:s.discounts,gifts:s.gifts});$('#loyalty-actions').hidden=false;
  const snapshotEvents=await getDocs(query(collection(db,'loyaltyMembers',uid,'events'),orderBy('createdAt','desc'),limit(20)));if(current!==generation)return;
  const list=document.createDocumentFragment();for(const item of snapshotEvents.docs){const e=item.data(),li=document.createElement('li');li.textContent=`${e.date} · ${t(e.type==='visit'?'Visit stamp added':e.type==='discount'?'10% reward used':'Complimentary treatment used')} · ${e.reference} `;const retry=document.createElement('button');retry.type='button';retry.className='text-button';retry.textContent=t('Retry progress email ↗');retry.addEventListener('click',async()=>{if(busy)return;retry.disabled=true;try{await notify(item.id,uid);message('Progress email sent.')}catch(error){message(error.message)}finally{retry.disabled=false}});li.append(retry);list.append(li)}$('#loyalty-history').replaceChildren(list);
 }
 async function lookup(email,bookingId=''){
  const user=getUser();if(!user)return;const current=++generation;memberId=null;$('#loyalty-actions').hidden=true;message('');$('#loyalty-form').reset();$('#loyalty-date').max=bangkokToday();$('#loyalty-date').value=bangkokToday();$('#loyalty-booking').value=bookingId;
  const results=await getDocs(query(collection(db,'loyaltyMembers'),where('email','==',email.trim().toLowerCase()),limit(2)));if(current!==generation||getUser()?.uid!==user.uid)return;
  if(results.size!==1){message('Ask the client to join Beauty Club first.');return}memberId=results.docs[0].id;requestId=crypto.randomUUID();await display();
 }
 $('#loyalty-lookup').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;try{await lookup($('#loyalty-email').value)}catch{message('Could not load membership. Please try again.')}});
 $('#loyalty-form').addEventListener('input',()=>{requestId=crypto.randomUUID()});
 $('#loyalty-form').addEventListener('submit',async e=>{e.preventDefault();const user=getUser(),uid=memberId;if(busy||!uid||!user)return;busy=true;$('#loyalty-save').disabled=true;message('');
  try{const result=await recordLoyaltyEvent(db,user,uid,{type:$('#loyalty-action').value,date:$('#loyalty-date').value,reference:$('#loyalty-reference').value,bookingId:$('#loyalty-booking').value,note:$('#loyalty-note').value,completedPaid:$('#loyalty-paid').checked,requestId});message(result.duplicate?'This visit has already earned a stamp.':'Beauty Club updated.');await display();try{await notify(result.eventId,uid);message('Beauty Club updated and progress email sent.')}catch(error){message(error.message)}}
  catch(error){message(error.code==='permission-denied'?'You do not have permission to change this card.':error.message||'Could not save. Check your connection and try again.')}
  finally{busy=false;$('#loyalty-save').disabled=false}
 });
 $('#loyalty-date').value=bangkokToday();$('#loyalty-date').max=bangkokToday();for(const id of ['#loyalty-form','#loyalty-lookup'])localizeValidation($(id));
 return {reset(){generation++;memberId=null;$('#loyalty-actions').hidden=true;$('#loyalty-history').replaceChildren();$('#loyalty-lookup').reset();$('#loyalty-form').reset();$('#loyalty-member').textContent='';$('#loyalty-totals').textContent='';message('')},async open(booking){$('#loyalty-email').value=booking.email||'';$('#request-dialog').close();$('#loyalty-section').scrollIntoView({behavior:'smooth'});try{await lookup(booking.email,booking.id);$('#loyalty-date').value=booking.confirmedDate||bangkokToday()}catch{message('Could not load membership. Please try again.')}}};
}
