import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {initializeAuth, inMemoryPersistence, signInAnonymously} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore, doc, getDoc, setDoc, serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore-lite.js';
import {firebaseConfig} from './firebase-config.js';
import {validateBooking} from './booking-validation.js';
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {persistence: inMemoryPersistence});
const database = getFirestore(app);
let authentication;
const requests = new Map();
export async function sendBooking(input) {
  const data = validateBooking(input);
  if (!auth.currentUser) {
    authentication ??= signInAnonymously(auth).finally(() => {authentication = undefined;});
    await authentication;
  }
  // Reuse one document reference for retries of the same request in this session.
  // The create-only rule prevents overwriting an already submitted appointment.
  const fingerprint = JSON.stringify(data);
  if (!requests.has(fingerprint)) requests.set(fingerprint, crypto.randomUUID());
  const id = requests.get(fingerprint);
  const reference = doc(database, 'bookings', id);
  try {
    await setDoc(reference, {...data, customerId: auth.currentUser.uid, timezone: 'Asia/Bangkok', status: 'pending', consent: true, createdAt: serverTimestamp()});
  } catch (error) {
    // A response can be lost after a successful write. Confirm our exact request
    // before reporting failure, instead of creating a duplicate on retry.
    try {if ((await getDoc(reference)).exists()) return {id};} catch {}
    throw error;
  }
  return {id};
}
