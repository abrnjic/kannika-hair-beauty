import {t, html, locale, language, localizeValidation} from './i18n.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {initializeAuth, browserSessionPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, getDocsFromServer, collection, query, orderBy, limit, startAfter} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {firebaseConfig, salonEmail} from './firebase-config.js';
import {validateDecision} from './admin-policy.js';
import {bangkokToday} from './booking-validation.js';
// Use same-origin auth helpers on production so redirect sign-in survives storage partitioning.
const sameTabSignIn = location.hostname === 'kannika-hair-beauty.vercel.app';
const app = initializeApp({...firebaseConfig, ...(sameTabSignIn ? {authDomain: location.hostname} : {})}, 'kannika-admin');
const auth = initializeAuth(app, {persistence: browserSessionPersistence, popupRedirectResolver: browserPopupRedirectResolver});
const db = getFirestore(app);
const $ = selector => document.querySelector(selector);
let records = [], cursor = null, activeFilter = 'pending', session = 0, loading = false, saving = false, selected = null, administrator = null;
const requestDialog = $('#request-dialog');
const statusLabel = status => ({pending:t('Awaiting review'), confirmed:t('Confirmed'), declined:t('Declined')}[status] || t('Unknown'));
const dateLabel = value => {if(!value)return t('Not set');const date=new Date(value+'T12:00:00+07:00');return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'}).format(date):value};
const timestampLabel = timestamp => timestamp?.toDate ? new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}).format(timestamp.toDate())+' · '+t('Pattaya') : '—';
const setError = (selector,message='') => {$(selector).textContent=t(message);$(selector).hidden=!message};
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true},4500)}
$('#toast').hidden=true;
$('#today-label').textContent=new Intl.DateTimeFormat(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date())+' · '+t('Pattaya');
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function clearData(){records=[];cursor=null;selected=null;administrator=null;$('#booking-rows').replaceChildren();$('#workspace').hidden=true;$('#access-pending').hidden=true;$('#pending-email').textContent='';$('#pending-uid').value='';$('#admin-email').textContent='';$('#search').value='';if(requestDialog.open)requestDialog.close();for(const key of ['all','pending','confirmed','declined'])$('#count-'+key).textContent='0'}
function render(){
 const search=$('#search').value.trim().toLowerCase();
 const visible=records.filter(record=>(activeFilter==='all'||record.status===activeFilter)&&[record.name,record.email,record.service,t(record.service||''),record.id,record.date,record.confirmedDate].some(value=>String(value??'').toLowerCase().includes(search)));
 $('#count-all').textContent=String(records.length);
 for(const key of ['pending','confirmed','declined'])$('#count-'+key).textContent=String(records.filter(record=>record.status===key).length);
 $('#pending-badge').textContent=$('#count-pending').textContent;
 const rows=document.createDocumentFragment();
 for(const record of visible){
  const row=node('tr');
  const client=node('td');client.append(node('strong',record.name||t('Unnamed client')),node('small',record.email||''));
  const treatment=node('td',t(record.service||'—'));
  const visit=node('td');visit.append(node('strong',dateLabel(record.date)),node('small',t(record.time||'—')));
  if(record.status==='confirmed')visit.append(node('small',t('Confirmed: {date} · {time}',{date:dateLabel(record.confirmedDate),time:record.confirmedTime||'—'})));
  const status=node('td');status.append(node('span',statusLabel(record.status),'status '+(['pending','confirmed','declined'].includes(record.status)?record.status:'')));
  const action=node('td');const button=node('button',t('Review ↗'),'review');button.setAttribute('aria-label',t('Review request from {name}',{name:record.name||t('client')}));button.addEventListener('click',()=>openRequest(record));action.append(button);
  row.append(client,treatment,visit,status,action);rows.append(row);
 }
 $('#booking-rows').replaceChildren(rows);$('#table-wrap').hidden=!visible.length;$('#empty').hidden=!!visible.length||loading;$('#results-label').textContent=t('Showing {visible} of {total} loaded requests · newest first',{visible:visible.length,total:records.length});
}
async function loadRequests(append=false){
 if(loading||!administrator)return;
 const currentSession=session;loading=true;$('#loading').hidden=append;$('#refresh').disabled=true;$('#load-more').disabled=true;setError('#load-error');
 try{
  const constraints=[orderBy('createdAt','desc'),limit(100)];if(append&&cursor)constraints.push(startAfter(cursor));
  const snapshot=await getDocsFromServer(query(collection(db,'bookings'),...constraints));
  if(currentSession!==session)return;
  const page=snapshot.docs.map(document=>({id:document.id,...document.data()}));
  records=append?[...records,...page.filter(record=>!records.some(existing=>existing.id===record.id))]:page;
  cursor=snapshot.docs.at(-1)??null;$('#load-more').hidden=snapshot.size<100;
 }catch(error){if(currentSession===session){if(!append){records=[];cursor=null;$('#load-more').hidden=true}setError('#load-error',error.code==='permission-denied'?t('Your account no longer has permission to read requests. Sign out and contact the salon owner.'):t('Could not load requests. Check your connection and try Refresh.'));}}
 finally{if(currentSession===session){loading=false;$('#loading').hidden=true;$('#refresh').disabled=false;$('#load-more').disabled=false;render()}}
}
function showConfirmationFields(){const confirmed=$('#decision-status').value==='confirmed';$('#confirmed-fields').hidden=!confirmed;$('#confirmed-date').required=confirmed;$('#confirmed-time').required=confirmed;}
function openRequest(record){
 selected=record;setError('#decision-error');$('#client-name').textContent=record.name||t('Unnamed client');$('#detail-status').textContent=statusLabel(record.status);$('#detail-status').className='status '+record.status;
 const email=node('a',record.email||'—');email.href='mailto:'+encodeURIComponent(record.email||'');$('#client-email').replaceChildren(email);
 $('#client-language').textContent=record.language==='th'?'ไทย':record.language==='en'?'English':t('English (language not recorded)');
 $('#client-service').textContent=t(record.service||'—');$('#client-visit').textContent=dateLabel(record.date)+' · '+t(record.time)+' ('+t('Pattaya')+')';$('#client-created').textContent=timestampLabel(record.createdAt);$('#client-notes').textContent=record.notes||t('No notes provided.');$('#client-reference').textContent=record.id;
 $('#decision-status').value=record.status;$('#confirmed-date').min=bangkokToday();$('#confirmed-date').value=record.confirmedDate||record.date||'';$('#confirmed-time').value=record.confirmedTime||'';
 $('#updated-label').textContent=record.updatedAt?t('Last updated {date}',{date:timestampLabel(record.updatedAt)}):'';showConfirmationFields();requestDialog.showModal();
}
$('#decision-status').addEventListener('change',showConfirmationFields);
$('#close-request').addEventListener('click',()=>{if(!saving)requestDialog.close()});
requestDialog.addEventListener('cancel',event=>{if(saving)event.preventDefault()});
$('#decision-form').addEventListener('submit',async event=>{
 event.preventDefault();if(saving||!selected||!administrator)return;setError('#decision-error');
 let decision;try{decision=validateDecision({status:$('#decision-status').value,confirmedDate:$('#confirmed-date').value,confirmedTime:$('#confirmed-time').value})}catch(error){setError('#decision-error',error.message);return}
 saving=true;const currentSession=session, expected=selected;
 $('#save-decision').disabled=true;$('#save-decision').textContent=t('Saving decision…');$('#close-request').disabled=true;$('#decision-form').setAttribute('aria-busy','true');
 try{
  const token=await administrator.getIdToken();
  const response=await fetch('/api/booking-status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({id:expected.id,decision,expected:{status:expected.status,updatedAt:expected.updatedAt?.toDate?.().getTime()??expected.updatedAt?.toMillis?.()??null}})});
  const result=await response.json();
  if(!response.ok||!result.saved)throw new Error(t(response.status===409?'This request changed since you opened it. Close this window, refresh, and review it again.':response.status===403?'You do not have permission to change this request.':'Could not save. Check your connection and try again.'));
  if(currentSession!==session)return;
  selected={...expected,...decision,updatedAt:{toMillis:()=>result.updatedAt}};
  await loadRequests();
  if(result.notification==='sent'){requestDialog.close();toast(t('Decision saved. Status email sent to the client.'))}
  else setError('#decision-error',t(result.notification==='expired'?'This status update is too old to resend safely. Please contact the client directly.':'Decision saved, but the status email could not be sent. Save the same decision again to retry without sending duplicates.'));

 }catch(error){if(currentSession===session)setError('#decision-error',error.code==='permission-denied'?t('You do not have permission to change this request.'):error.message||t('Could not save. Check your connection and try again.'))}
 finally{saving=false;$('#save-decision').disabled=false;$('#save-decision').innerHTML=html('Save decision <span>↗</span>');$('#close-request').disabled=false;$('#decision-form').removeAttribute('aria-busy')}
});
$('#sign-in').addEventListener('click',async()=>{
 setError('#auth-error');$('#sign-in').disabled=true;
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account',hl:language});
 try{await redirectResult;await auth.authStateReady();if(sameTabSignIn){await signInWithRedirect(auth,provider)}else{await signInWithPopup(auth,provider)}}catch(error){setError('#auth-error',({'auth/popup-blocked':t('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'),'auth/popup-closed-by-user':t('Sign-in was closed. Try again when ready.'),'auth/unauthorized-domain':t('This website needs to be added to Firebase Authentication authorised domains.'),'auth/network-request-failed':t('Could not reach Google sign-in. Check your connection and try again.'),'auth/web-storage-unsupported':t('Sign-in needs browser storage. Open this page in a regular browser tab.')}[error.code])||t('Could not sign in. Please try again.'))}
 finally{$('#sign-in').disabled=false}
});
// Recover the result after Google returns to this tab; never log credentials or tokens.
$('#sign-in').disabled=true;
const redirectResult = getRedirectResult(auth).then(()=>null).catch(error=>error).finally(()=>{$('#sign-in').disabled=false});
for(const id of ['#sign-out','#login-sign-out'])$(id).addEventListener('click',async()=>{if(saving){toast(t('Please wait for the current decision to finish saving.'));return}try{await signOut(auth)}catch{toast(t('Could not sign out. Please try again.'))}});
onAuthStateChanged(auth,async user=>{
 const currentSession=++session;clearData();loading=false;$('#login-panel').hidden=false;$('#sign-in').hidden=!!user;$('#login-sign-out').hidden=!user;setError('#auth-error');
 if(!user){const error=await redirectResult;if(currentSession===session&&error)setError('#auth-error',t('Google sign-in could not finish ({code}). Please try again.',{code:error.code||'unknown'}));return;}
 $('#auth-error').textContent=t('Checking administrator access…');$('#auth-error').hidden=false;
 try{
  if(!user.emailVerified||!user.providerData.some(provider=>provider.providerId==='google.com'))throw new Error(t('Sign in using an authorised Google account.'));
  const salonAccount=user.email===salonEmail;
  const role=salonAccount?null:await getDocFromServer(doc(db,'admins',user.uid));if(currentSession!==session)return;setError('#auth-error');
  if(!salonAccount&&(!role?.exists()||role.data().role!=='owner')){$('#access-pending').hidden=false;$('#pending-email').textContent=user.email||'';$('#pending-uid').value=user.uid;return}
  administrator=user;$('#login-panel').hidden=true;$('#workspace').hidden=false;$('#admin-email').textContent=user.email||'';await loadRequests();
 }catch(error){if(currentSession===session)setError('#auth-error',error.message===t('Sign in using an authorised Google account.')?error.message:t('Could not verify administrator access. Check your connection, then sign out and try again.'))}
});
$('#copy-uid').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#pending-uid').value);toast(t('User ID copied'))}catch{$('#pending-uid').select();toast(t('Select and copy the user ID above'))}});
$('#refresh').addEventListener('click',()=>loadRequests());$('#load-more').addEventListener('click',()=>loadRequests(true));$('#search').addEventListener('input',render);
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render()}));

localizeValidation($('#decision-form'));
