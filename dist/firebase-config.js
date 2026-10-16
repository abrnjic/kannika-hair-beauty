// Firebase web configuration identifies the app; it is not an administrator credential.
export const firebaseConfig = {
  apiKey: 'AIzaSyDwRmJr_n4zYaTRLJdWAgaPueYU1icWX10',
  authDomain: 'kannika-4f9b6.firebaseapp.com',
  projectId: 'kannika-4f9b6',
  storageBucket: 'kannika-4f9b6.firebasestorage.app',
  messagingSenderId: '277789798683',
  appId: '1:277789798683:web:1ab1aa91e61d3c2a4e63be'
};
// Enable only after Anonymous Auth and firestore.rules are deployed and verified.
export const bookingsEnabled = true;

// Public salon contact; administrator access is also enforced by Firestore rules.
export const salonEmail = 'kannika54932@gmail.com';
