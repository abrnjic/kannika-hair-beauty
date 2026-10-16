import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {initializeAuth, browserSessionPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, getDocsFromServer, collection, query, orderBy, limit, startAfter, runTransaction, serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
import {validateDecision, decisionIsCurrent} from './admin-policy.js';
import {bangkokToday} from './booking-validation.js';
const app = initializeApp(firebaseConfig, 'kannika-admin');
const auth = initializeAuth(app, {persistence: browserSessionPersistence, popupRedirectResolver: browserPopupRedirectResolver});
const db = getFirestore(app);
const $ = selector => document.querySelector(selector);
let records = [], cursor = null, activeFilter = 'pending', session = 0, loading = false, saving = false, selected = null, administrator = null;
const requestDialog = $('#request-dialog');
const statusLabel = status => ({pending:'Awaiting review', confirmed:'Confirmed', declined:'Declined'}[status] || 'Unknown');
const dateLabel = value => {if(!value)return 'Not set';const date=new Date(value+'T12:00:00+07:00');return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'}).format(date):value};
const timestampLabel = timestamp => timestamp?.toDate ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}).format(timestamp.toDate())+' · Pattaya' : '—';
const setError = (selector,message='') => {$(selector).textContent=message;$(selector).hidden=!message};
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').hidden=true},4500)}
$('#toast').hidden=true;
$('#today-label').textContent=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'}).format(new Date())+' · Pattaya';
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function clearData(){records=[];cursor=null;selected=null;administrator=null;$('#booking-rows').replaceChildren();$('#workspace').hidden=true;$('#access-pending').hidden=true;$('#pending-email').textContent='';$('#pending-uid').value='';$('#admin-email').textContent='';$('#search').value='';if(requestDialog.open)requestDialog.close();for(const key of ['all','pending','confirmed','declined'])$('#count-'+key).textContent='0'}
function render(){
 const search=$('#search').value.trim().toLowerCase();
 const visible=records.filter(record=>(activeFilter==='all'||record.status===activeFilter)&&[record.name,record.email,record.service,record.id,record.date,record.confirmedDate].some(value=>String(value??'').toLowerCase().includes(search)));
 $('#count-all').textContent=String(records.length);
 for(const key of ['pending','confirmed','declined'])$('#count-'+key).textContent=String(records.filter(record=>record.status===key).length);
 $('#pending-badge').textContent=$('#count-pending').textContent;
 const rows=document.createDocumentFragment();
 for(const record of visible){
  const row=node('tr');
  const client=node('td');client.append(node('strong',record.name||'Unnamed client'),node('small',record.email||''));
  const treatment=node('td',record.service||'—');
  const visit=node('td');visit.append(node('strong',dateLabel(record.date)),node('small',record.time||'—'));
  if(record.status==='confirmed')visit.append(node('small','Confirmed: '+dateLabel(record.confirmedDate)+' · '+(record.confirmedTime||'—')));
  const status=node('td');status.append(node('span',statusLabel(record.status),'status '+(['pending','confirmed','declined'].includes(record.status)?record.status:'')));
  const action=node('td');const button=node('button','Review ↗','review');button.setAttribute('aria-label','Review request from '+(record.name||'client'));button.addEventListener('click',()=>openRequest(record));action.append(button);
  row.append(client,treatment,visit,status,action);rows.append(row);
 }
 $('#booking-rows').replaceChildren(rows);$('#table-wrap').hidden=!visible.length;$('#empty').hidden=!!visible.length||loading;$('#results-label').textContent=`Showing ${visible.length} of ${records.length} loaded requests · newest first`;
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
 }catch(error){if(currentSession===session){if(!append){records=[];cursor=null;$('#load-more').hidden=true}setError('#load-error',error.code==='permission-denied'?'Your account no longer has permission to read requests. Sign out and contact the salon owner.':'Could not load requests. Check your connection and try Refresh.');}}
 finally{if(currentSession===session){loading=false;$('#loading').hidden=true;$('#refresh').disabled=false;$('#load-more').disabled=false;render()}}
}
function showConfirmationFields(){const confirmed=$('#decision-status').value==='confirmed';$('#confirmed-fields').hidden=!confirmed;$('#confirmed-date').required=confirmed;$('#confirmed-time').required=confirmed;}
function openRequest(record){
 selected=record;setError('#decision-error');$('#client-name').textContent=record.name||'Unnamed client';$('#detail-status').textContent=statusLabel(record.status);$('#detail-status').className='status '+record.status;
 const email=node('a',record.email||'—');email.href='mailto:'+encodeURIComponent(record.email||'');$('#client-email').replaceChildren(email);
 $('#client-service').textContent=record.service||'—';$('#client-visit').textContent=dateLabel(record.date)+' · '+record.time+' (Pattaya)';$('#client-created').textContent=timestampLabel(record.createdAt);$('#client-notes').textContent=record.notes||'No notes provided.';$('#client-reference').textContent=record.id;
 $('#decision-status').value=record.status;$('#confirmed-date').min=bangkokToday();$('#confirmed-date').value=record.confirmedDate||record.date||'';$('#confirmed-time').value=record.confirmedTime||'';
 $('#updated-label').textContent=record.updatedAt?'Last updated '+timestampLabel(record.updatedAt):'';showConfirmationFields();requestDialog.showModal();
}
$('#decision-status').addEventListener('change',showConfirmationFields);
$('#close-request').addEventListener('click',()=>{if(!saving)requestDialog.close()});
requestDialog.addEventListener('cancel',event=>{if(saving)event.preventDefault()});
$('#decision-form').addEventListener('submit',async event=>{
 event.preventDefault();if(saving||!selected||!administrator)return;setError('#decision-error');
 let decision;try{decision=validateDecision({status:$('#decision-status').value,confirmedDate:$('#confirmed-date').value,confirmedTime:$('#confirmed-time').value})}catch(error){setError('#decision-error',error.message);return}
 saving=true;const currentSession=session, expected=selected, uid=administrator.uid;
 $('#save-decision').disabled=true;$('#save-decision').textContent='Saving decision…';$('#close-request').disabled=true;$('#decision-form').setAttribute('aria-busy','true');
 try{
  const reference=doc(db,'bookings',expected.id);
  await runTransaction(db,async transaction=>{
   const snapshot=await transaction.get(reference);
   if(!snapshot.exists())throw new Error('This request no longer exists. Refresh the list.');
   if(!decisionIsCurrent(snapshot.data(),expected))throw new Error('This request changed since you opened it. Close this window, refresh, and review it again.');
   transaction.update(reference,{...decision,updatedAt:serverTimestamp(),updatedBy:uid});
  });
  if(currentSession!==session)return;
  requestDialog.close();toast('Decision saved. No email has been sent.');await loadRequests();
 }catch(error){if(currentSession===session)setError('#decision-error',error.code==='permission-denied'?'You do not have permission to change this request.':error.message||'Could not save. Check your connection and try again.')}
 finally{saving=false;$('#save-decision').disabled=false;$('#save-decision').innerHTML='Save decision <span>↗</span>';$('#close-request').disabled=false;$('#decision-form').removeAttribute('aria-busy')}
});
$('#sign-in').addEventListener('click',async()=>{
 setError('#auth-error');$('#sign-in').disabled=true;
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 try{await signInWithPopup(auth,provider)}catch(error){setError('#auth-error',({'auth/popup-blocked':'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.','auth/popup-closed-by-user':'Sign-in was closed. Try again when ready.','auth/unauthorized-domain':'This website needs to be added to Firebase Authentication authorised domains.'}[error.code])||'Could not sign in. Please try again.')}
 finally{$('#sign-in').disabled=false}
});
for(const id of ['#sign-out','#login-sign-out'])$(id).addEventListener('click',async()=>{if(saving){toast('Please wait for the current decision to finish saving.');return}try{await signOut(auth)}catch{toast('Could not sign out. Please try again.')}});
onAuthStateChanged(auth,async user=>{
 const currentSession=++session;clearData();loading=false;$('#login-panel').hidden=false;$('#sign-in').hidden=!!user;$('#login-sign-out').hidden=!user;setError('#auth-error');
 if(!user)return;
 $('#auth-error').textContent='Checking administrator access…';$('#auth-error').hidden=false;
 try{
  if(!user.emailVerified||!user.providerData.some(provider=>provider.providerId==='google.com'))throw new Error('Sign in using an authorised Google account.');
  const role=await getDocFromServer(doc(db,'admins',user.uid));if(currentSession!==session)return;setError('#auth-error');
  if(!role.exists()||role.data().role!=='owner'){$('#access-pending').hidden=false;$('#pending-email').textContent=user.email||'';$('#pending-uid').value=user.uid;return}
  administrator=user;$('#login-panel').hidden=true;$('#workspace').hidden=false;$('#admin-email').textContent=user.email||'';await loadRequests();
 }catch(error){if(currentSession===session)setError('#auth-error',error.message?.startsWith('Sign in')?error.message:'Could not verify administrator access. Check your connection, then sign out and try again.')}
});
$('#copy-uid').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#pending-uid').value);toast('User ID copied')}catch{$('#pending-uid').select();toast('Select and copy the user ID above')}});
$('#refresh').addEventListener('click',()=>loadRequests());$('#load-more').addEventListener('click',()=>loadRequests(true));$('#search').addEventListener('input',render);
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render()}));
