import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {initializeAuth,browserSessionPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithRedirect,signInWithPopup,getRedirectResult,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,collection,getDocs,query,orderBy,limit} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
import {t,language,locale,localizeValidation} from './i18n.js';
import {enrolMember} from './loyalty-store.js';
import {rewardSummary} from './loyalty-policy.js';
const $=s=>document.querySelector(s),production=location.hostname==='kannika-hair-beauty.vercel.app';
const app=initializeApp({...firebaseConfig,...(production?{authDomain:location.hostname}:{})},'kannika-club');
const auth=initializeAuth(app,{persistence:browserSessionPersistence,popupRedirectResolver:browserPopupRedirectResolver}),db=getFirestore(app);auth.languageCode=language;
let busy=false,session=0;let emailLink=isSignInWithEmailLink(auth,location.href)?location.href:null;
const message=text=>{$('#club-message').textContent=t(text);$('#club-message').hidden=!text};
function controls(disabled){busy=disabled;document.querySelectorAll('button').forEach(b=>b.disabled=disabled)}
async function loadCard(user){
 const current=++session;$('#card-panel').hidden=true;$('#join-panel').hidden=true;
 if(!user){$('#access-panel').hidden=false;$('#club-sign-out').hidden=true;return}
 $('#access-panel').hidden=true;$('#club-sign-out').hidden=false;
 if(!user.emailVerified)throw Error('Verify your email before joining.');
 const snapshot=await getDocFromServer(doc(db,'loyaltyMembers',user.uid));if(current!==session)return;
 if(!snapshot.exists()){$('#join-panel').hidden=false;$('#verified-email').textContent=user.email;return}
 const data=snapshot.data(),summary=rewardSummary(data);$('#member-name').textContent=data.name;$('#member-email').textContent=data.email;
 const fragment=document.createDocumentFragment();for(let i=1;i<=10;i++){const stamp=document.createElement('span');stamp.className='stamp'+(i<=summary.progress?' earned':'');stamp.textContent=i<=summary.progress?'✧':String(i);fragment.append(stamp)}$('#stamp-grid').replaceChildren(fragment);
 $('#stamp-balance').textContent=t('{count} lifetime visits · {progress} / 10 this cycle',{count:summary.stamps,progress:summary.progress});$('#next-reward').textContent=t('{count} more visits to your next reward',{count:summary.next});
 $('#discount-balance').textContent=t('10% rewards available: {count}',{count:summary.discounts});$('#gift-balance').textContent=t('Complimentary treatments available: {count}',{count:summary.gifts});$('#card-panel').hidden=false;
 const events=await getDocs(query(collection(db,'loyaltyMembers',user.uid,'events'),orderBy('createdAt','desc'),limit(20)));if(current!==session)return;
 const list=document.createDocumentFragment();for(const item of events.docs){const e=item.data(),li=document.createElement('li');li.textContent=`${e.date} · ${t(e.type==='visit'?'Visit stamp added':e.type==='discount'?'10% reward used':'Complimentary treatment used')}${e.note?' · '+e.note:''}`;list.append(li)}if(events.empty){const li=document.createElement('li');li.textContent=t('Your first beautiful moment is waiting.');list.append(li)}$('#activity').replaceChildren(list);
}
const redirectResult=getRedirectResult(auth).catch(()=>{message('Sign-in could not finish. Please try again.')});
onAuthStateChanged(auth,user=>loadCard(user).catch(()=>message('Could not load your card. Please refresh and try again.')));
$('#link-form').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;controls(true);message('');const email=$('#club-email').value.trim();try{
 if(emailLink){await signInWithEmailLink(auth,email,emailLink);sessionStorage.removeItem('kannikaClubEmail');history.replaceState(null,'',language==='th'?'/th/club':'/club');emailLink=null;message('You are signed in.');}
 else{await sendSignInLinkToEmail(auth,email,{url:'https://kannika-hair-beauty.vercel.app'+(language==='th'?'/th/club':'/club'),handleCodeInApp:true});sessionStorage.setItem('kannikaClubEmail',email);message('Check your email for your secure sign-in link.');}
 }catch(error){message(error.code==='auth/too-many-requests'||error.code==='auth/quota-exceeded'?'Email sign-in is temporarily unavailable. Try Google sign-in or contact the salon.':'Could not sign in. Request a new link and use the same email.');}finally{controls(false)}});
$('#club-google').addEventListener('click',async()=>{if(busy)return;controls(true);try{await redirectResult;const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account',hl:language});if(production)await signInWithRedirect(auth,provider);else await signInWithPopup(auth,provider)}catch{message('Sign-in could not finish. Please try again.')}finally{controls(false)}});
$('#join-form').addEventListener('submit',async e=>{e.preventDefault();if(busy||!auth.currentUser)return;controls(true);try{const data=new FormData(e.currentTarget);await enrolMember(db,auth.currentUser,{name:data.get('name'),consent:data.has('consent'),marketingConsent:data.has('marketingConsent'),language});message('Welcome to Beauty Club. Your card is ready.');await loadCard(auth.currentUser)}catch(error){message(t(error.message)||'Could not save your membership. Please try again.')}finally{controls(false)}});
$('#refresh-card').addEventListener('click',()=>loadCard(auth.currentUser).catch(()=>message('Could not load your card. Please refresh and try again.')));$('#club-sign-out').addEventListener('click',async()=>{await signOut(auth);message('')});
for(const id of ['#link-form','#join-form'])localizeValidation($(id));
if(emailLink){$('#club-email').value=sessionStorage.getItem('kannikaClubEmail')||'';message('Enter the email this link was sent to, then continue.');$('#link-form button').textContent=t('Open my card ↗')}
