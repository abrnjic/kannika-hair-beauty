import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {initializeAuth, inMemoryPersistence, signInAnonymously} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {firebaseConfig} from './firebase-config.js';
import {language} from './i18n.js';
import {validateBooking} from './booking-validation.js';
const app=initializeApp(firebaseConfig);
const auth=initializeAuth(app,{persistence:inMemoryPersistence});
let authentication;
const requests=new Map();
export async function sendBooking(input) {
 const booking=validateBooking(input);
 if(!auth.currentUser){authentication??=signInAnonymously(auth).finally(()=>{authentication=undefined});await authentication}
 const fingerprint=JSON.stringify(booking);
 if(!requests.has(fingerprint))requests.set(fingerprint,crypto.randomUUID());
 const id=requests.get(fingerprint);
 const token=await auth.currentUser.getIdToken();
 const response=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({id,booking,language})});
 const result=await response.json();
 if(!response.ok||!result.saved||result.id!==id)throw new Error(result.message||'Could not save your request.');
 return result;
}
