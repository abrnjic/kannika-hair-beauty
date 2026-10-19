import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,browserSessionPersistence,inMemoryPersistence,browserPopupRedirectResolver,signInWithCustomToken,getRedirectResult,signInAnonymously,isSignInWithEmailLink,signInWithEmailLink,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,collection,getDocs,query,orderBy,limit} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
import {t,language,locale,localizeValidation} from './i18n.js';
import {enrolMember} from './loyalty-store.js';
import {setupCardEntry} from './club-entry.js';
import {rewardSummary} from './loyalty-policy.js';
const $=s=>document.querySelector(s),production=location.hostname==='kannika-hair-beauty.vercel.app';
const app=initializeApp({...firebaseConfig,...(production?{authDomain:location.hostname}:{})},'kannika-club');
const auth=initializeAuth(app,{persistence:[indexedDBLocalPersistence,browserLocalPersistence,browserSessionPersistence,inMemoryPersistence],popupRedirectResolver:browserPopupRedirectResolver}),db=getFirestore(app);auth.languageCode=language;
let busy=false,session=0;let emailLink=isSignInWithEmailLink(auth,location.href)?location.href:null;const cardToken=new URL(location.href).hash.slice(1).startsWith('access=')?new URLSearchParams(new URL(location.href).hash.slice(1)).get('access'):null;let processingLink=!!emailLink||!!cardToken;
const pendingEmailStores=[()=>localStorage,()=>sessionStorage];
function savedEmail(){for(const getStore of pendingEmailStores){try{const email=getStore().getItem('kannikaClubEmail');if(email)return email}catch{}}return ''}
function rememberEmail(email){for(const getStore of pendingEmailStores){try{getStore().setItem('kannikaClubEmail',email)}catch{}}}
function clearSavedEmail(){for(const getStore of pendingEmailStores){try{getStore().removeItem('kannikaClubEmail')}catch{}}}
function clearLink(){emailLink=null;history.replaceState(null,'',language==='th'?'/th/club':'/club')}
function accessError(text){$('#club-loading').hidden=true;message(text)}
const message=text=>{$('#club-message').textContent=t(text);$('#club-message').hidden=!text};
function controls(disabled){busy=disabled;document.querySelectorAll('button').forEach(b=>b.disabled=disabled)}
async function loadCard(user){
 const current=++session;$('#card-panel').hidden=true;$('#join-panel').hidden=true;$('#approval-panel').hidden=true;$('#club-loading').hidden=false;$('#club-main').classList.toggle('member-view',!!user);$('#card-welcome').hidden=!user;
 if(!user){$('#access-panel').hidden=false;$('#club-sign-out').hidden=true;$('#club-loading').hidden=true;return}
 $('#access-panel').hidden=true;$('#club-sign-out').hidden=false;
 if(!user.emailVerified)throw Error('Verify your email before joining.');
 const snapshot=await getDocFromServer(doc(db,'loyaltyMembers',user.uid));if(current!==session)return;$('#club-loading').hidden=true;
 if(!snapshot.exists()){$('#join-panel').hidden=false;$('#verified-email').textContent=user.email;return}
 const data=snapshot.data();$('#approval-panel').hidden=true;if(data.membershipStatus==='pending'){$('#approval-panel').hidden=false;$('#approval-email').textContent=data.email;return}const summary=rewardSummary(data);$('#member-name').textContent=data.name;$('#member-email').textContent=data.email;
 const fragment=document.createDocumentFragment();for(let i=1;i<=10;i++){const stamp=document.createElement('span');stamp.className='stamp'+(i<=summary.progress?' earned':'');stamp.textContent=i<=summary.progress?'✧':String(i);fragment.append(stamp)}$('#stamp-grid').replaceChildren(fragment);
 $('#stamp-balance').textContent=t('{count} lifetime services · {progress} / 10 this cycle',{count:summary.stamps,progress:summary.progress});$('#next-reward').textContent=t('{count} more services to your next reward',{count:summary.next});
 $('#gift-balance').textContent=t('Free wash & flat-iron styling rewards available: {count}',{count:summary.gifts});$('#card-panel').hidden=false;
 const events=await getDocs(query(collection(db,'loyaltyMembers',user.uid,'events'),orderBy('createdAt','desc'),limit(20)));if(current!==session)return;
 const list=document.createDocumentFragment();for(const item of events.docs){const e=item.data(),li=document.createElement('li');li.textContent=`${e.date} · ${t(e.type==='visit'?'Service stamp added':e.type==='discount'?'10% reward used':'Free wash & flat-iron styling redeemed')}${e.note?' · '+e.note:''}`;list.append(li)}if(events.empty){const li=document.createElement('li');li.textContent=t('Your first beautiful moment is waiting.');list.append(li)}$('#activity').replaceChildren(list);
}
const redirectResult=getRedirectResult(auth).catch(()=>{message('Sign-in could not finish. Please try again.')});
onAuthStateChanged(auth,user=>{if(!processingLink)loadCard(user?.isAnonymous?null:user).catch(()=>accessError('Could not load your card. Please refresh and try again.'))});
function emailEntry(){
 $('#club-loading').hidden=true;$('#access-panel').hidden=false;
 $('#link-form button').textContent=t(emailLink?'Open my card ↗':'Email my sign-in link ↗');
 if(emailLink){$('#club-email').value=savedEmail();message('Enter the email that received this link. We will open your card.');$('#club-email').focus()}
}
async function completeEmail(email){
 controls(true);processingLink=true;message('Opening your card…');let signedIn=null;
 try{const result=await signInWithEmailLink(auth,email,emailLink);signedIn=result.user;clearSavedEmail();clearLink();processingLink=false;message('')}
 catch(error){
  if(['auth/invalid-action-code','auth/expired-action-code'].includes(error.code)){clearLink();clearSavedEmail();message('This link has expired or was already used. Request a new card link.')}
  else message('Enter the email that received this link. We will open your card.');
  processingLink=!!emailLink;emailEntry();
 }finally{controls(false);$('#club-loading').hidden=true}
 if(signedIn)try{await loadCard(signedIn)}catch{accessError('Could not load your card. Please refresh and try again.')}
}
$('#link-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;const email=$('#club-email').value.trim();if(emailLink){await completeEmail(email);return}
 controls(true);message('');try{
  const user=auth.currentUser||(await signInAnonymously(auth)).user;
  const response=await fetch('/api/club-access',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},body:JSON.stringify({email,language})});
  if(!response.ok)throw Object.assign(Error('Email not confirmed'),{status:response.status});
  const result=await response.json();if(result.notification!=='sent')throw Error('Email not confirmed');
  rememberEmail(email);message('Open the email from Kannika and tap Open my card. Check Junk if it does not arrive.');
 }catch(error){message(error.status===429?'Please wait before requesting another link. If you already received one, use that email.':'We could not confirm sending your link. Please try again or contact the salon.')}finally{controls(false)}
});
$('#join-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!auth.currentUser)return;controls(true);try{const data=new FormData(e.currentTarget);await enrolMember(db,auth.currentUser,{name:data.get('name'),consent:data.has('consent'),marketingConsent:data.has('marketingConsent'),language});message('Your membership request has been received. The salon will activate your card.');await loadCard(auth.currentUser)}catch(error){message(t(error.message)||'Could not save your membership. Please try again.')}finally{controls(false)}});
$('#refresh-membership').addEventListener('click',()=>loadCard(auth.currentUser).catch(()=>message('Could not load your card. Please refresh and try again.')));$('#refresh-card').addEventListener('click',()=>loadCard(auth.currentUser).catch(()=>message('Could not load your card. Please refresh and try again.')));$('#club-sign-out').addEventListener('click',async()=>{clearSavedEmail();await signOut(auth);message('')});
for(const id of ['#link-form','#join-form'])localizeValidation($(id));
if(emailLink){const email=savedEmail();if(email)await completeEmail(email);else emailEntry()}

if(cardToken)await setupCardEntry({token:cardToken,signIn:token=>signInWithCustomToken(auth,token),accept:(user,profile)=>enrolMember(db,user,profile),showCard:loadCard,onDone:()=>{processingLink=false;clearSavedEmail()},message,t});
