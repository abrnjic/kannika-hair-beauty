export async function setupCardEntry({token,signIn,accept,showCard,onDone,message,t,fetchImpl=fetch,documentImpl=document,getStorage=()=>sessionStorage,cryptoImpl=crypto,clearUrl=()=>history.replaceState(null,'',location.pathname)}){
 const $=selector=>documentImpl.querySelector(selector),panel=$('#entry-panel'),form=$('#entry-form'),button=$('#entry-submit');
 let attemptId=cryptoImpl.randomUUID(),busy=false,profile;
 const digest=Array.from(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(token))),value=>value.toString(16).padStart(2,'0')).join('');
 const key='kannikaClubEntry:'+digest;
 try{const saved=getStorage().getItem(key);if(/^[-a-f0-9]{36}$/.test(saved||''))attemptId=saved;else getStorage().setItem(key,attemptId)}catch{}
 async function call(action){const response=await fetchImpl('/api/club-entry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,attemptId,action,...(action==='open'?{confirm:true}:{})})});if(!response.ok)throw Object.assign(Error('Entry unavailable'),{status:response.status});return response.json()}
 try{
  profile=await call('preview');$('#club-loading').hidden=true;$('#access-panel').hidden=true;$('#club-main').classList.toggle('member-view',true);panel.hidden=false;
  $('#entry-email').textContent=profile.email;$('#entry-name').value=profile.name||'';$('#entry-name').required=!profile.enrolled;$('#entry-name-label').hidden=profile.enrolled;$('#entry-consent').hidden=profile.enrolled;
  button.textContent=t(profile.enrolled?'Open my card ↗':'Accept & open my card ↗');message('');
 }catch(error){$('#club-loading').hidden=true;$('#access-panel').hidden=false;clearUrl();onDone();message(error.status===410?'This link has expired or was already used. Request a new card link.':'Could not open this link. Please try again or request a new card link.');return}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const name=$('#entry-name').value.trim();if(!profile.enrolled&&!name){$('#entry-name').focus();return}
  busy=true;button.disabled=true;message('Opening your card…');
  try{
   const {sessionToken}=await call('open'),result=await signIn(sessionToken),user=result.user;
   if(user.email?.toLowerCase()!==profile.email.toLowerCase()||!user.emailVerified)throw Error('Account mismatch');
   if(!profile.enrolled)await accept(user,{name,consent:true,marketingConsent:false,language:profile.language});
   clearUrl();try{getStorage().removeItem(key)}catch{}panel.hidden=true;onDone();message('');await showCard(user);
  }catch(error){message(error.status===410?'This link has expired or was already used. Request a new card link.':'Could not complete your request. Please try again.')}finally{busy=false;button.disabled=false}
 });
}
