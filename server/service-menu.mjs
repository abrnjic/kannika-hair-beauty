import defaults from '../dist/service-menu-default.json' with {type:'json'};
import {validateMenu, publicMenu} from '../dist/service-menu-model.js';
import {clubAuthServices} from './club-auth.mjs';
const origins = ['https://kannika-hair-beauty.vercel.app','https://kannikabeauty.com','https://www.kannikabeauty.com'];
const reply = (status, body) => ({status, body});
const baseline = validateMenu(defaults);
export async function handleServiceMenu(request, {getServices=clubAuthServices, env=process.env, now=()=>new Date()} = {}) {
 if (!['GET','PUT'].includes(request.method)) return reply(405,{error:'method_not_allowed'});
 if (request.method === 'PUT' && request.headers.origin && !origins.includes(request.headers.origin) && !(env.VERCEL_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(request.headers.origin))) return reply(403,{error:'origin_not_allowed'});
 try {
  const {auth,db} = await getServices(env);
  const ref = db.collection('salonContent').doc('serviceMenu');
  if (request.method === 'GET') {
   const saved = (await ref.get()).data();
   const menu = saved ? validateMenu(saved.menu) : baseline;
   // Only explicitly authenticated editors may read unpublished/hidden service rows.
   if (request.query?.editor === '1') {
    const user = await authorised(request.headers.authorization,auth,db);
    if (!user) return reply(403,{error:'administrator_required'});
    return reply(200,{menu,revision:saved?.revision??0,updatedAt:saved?.updatedAt??null});
   }
   return reply(200,{menu:publicMenu(menu),revision:saved?.revision??0,updatedAt:saved?.updatedAt??null});
  }
  const user = await authorised(request.headers.authorization,auth,db);
  if (!user) return reply(request.headers.authorization ? 403 : 401,{error:'administrator_required'});
  let input, menu;
  try {
   input = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
   if (!input || JSON.stringify(input).length > 180000 || Object.keys(input).some(key=>!['menu','revision'].includes(key)) || !Number.isSafeInteger(input.revision) || input.revision < 0) throw Error();
   menu = validateMenu(input.menu);
  } catch { return reply(400,{error:'invalid_menu'}); }
  const result = await db.runTransaction(async tx => {
   const previous = (await tx.get(ref)).data();
   if ((previous?.revision??0) !== input.revision) return null;
   const document = {menu,revision:input.revision+1,updatedAt:now().toISOString(),updatedBy:user.uid};
   tx.set(ref,document); return document;
  });
  if (!result) return reply(409,{error:'menu_changed'});
  return reply(200,{saved:true,menu:result.menu,revision:result.revision,updatedAt:result.updatedAt});
 } catch { return reply(503,{error:'menu_unavailable'}); }
}
async function authorised(authorization,auth,db) {
 try {
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return null;
  // Firebase Admin verifies signature, issuer, expiry and revocation before any privileged write.
  const user = await auth.verifyIdToken(authorization.slice(7),true);
  if (!user.uid || user.email_verified !== true || user.firebase?.sign_in_provider !== 'google.com') return null;
  if (user.email === 'kannika54932@gmail.com') return user;
  const role = (await db.collection('admins').doc(user.uid).get()).data();
  return role?.role === 'owner' ? user : null;
 } catch { return null; }
}
