import {doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {memberDetails,rewardSummary,manualEventId} from './loyalty-policy.js';
import {bangkokToday} from './booking-validation.js';
export async function enrolMember(db,user,input){
 if(!user?.emailVerified||!user.email)throw Error('Verify your email before joining.');
 const profile=memberDetails(input),ref=doc(db,'loyaltyMembers',user.uid);
 await runTransaction(db,async tx=>{const current=await tx.get(ref);if(current.exists())return;tx.set(ref,{...profile,email:user.email.toLowerCase(),membershipStatus:'pending',stamps:0,discountsUsed:0,giftsUsed:0,createdAt:serverTimestamp()})});
}
export async function recordLoyaltyEvent(db,user,memberId,input){
 if(!user)throw Error('Administrator access required.');
 const type=input.type;if(!['visit','discount','gift'].includes(type))throw Error('Choose a valid reward action.');
 const date=input.date||bangkokToday();const parsed=new Date(date+'T12:00:00+07:00');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date>bangkokToday())throw Error('Choose a completed visit date.');
 const reference=String(input.reference??'').trim().toUpperCase();
 if(!reference||reference.length>100)throw Error('Enter a unique receipt or visit reference.');
 const bookingId=input.bookingId||'';
 if(bookingId&&!/^[a-f\d-]{36}$/i.test(bookingId))throw Error('Choose a valid booking reference.');
 const eventId=type==='visit'?(bookingId?'booking_'+bookingId:await manualEventId(date,reference)):'redeem_'+input.requestId;
 if(!/^(booking_[a-f\d-]{36}|manual_[a-f\d]{64}|redeem_[a-f\d-]{36})$/i.test(eventId))throw Error('Invalid event reference.');
 const note=String(input.note??'').trim();if(note.length>300||(type==='gift'&&!note))throw Error('Describe the selected complimentary treatment.');
 const memberRef=doc(db,'loyaltyMembers',memberId),eventRef=doc(db,'loyaltyMembers',memberId,'events',eventId);
 return runTransaction(db,async tx=>{
  const [member,existing]=await Promise.all([tx.get(memberRef),tx.get(eventRef)]);
  if(!member.exists())throw Error('Ask the client to join Beauty Club first.');
  if(existing.exists()){const e=existing.data();if(e.type!==type||e.reference!==reference||e.date!==date)throw Error('This visit has already earned a stamp.');return {eventId,duplicate:true}}
  const data=member.data();if(data.membershipStatus==='pending')throw Error('Activate this membership before adding stamps or using rewards.');const summary=rewardSummary(data);
  if(type==='visit'&&input.completedPaid!==true)throw Error('Confirm the service is completed and paid.');
  if(bookingId){const booking=await tx.get(doc(db,'bookings',bookingId));const b=booking.data();if(!b||b.status!=='confirmed'||b.email.toLowerCase()!==data.email||b.confirmedDate>bangkokToday())throw Error('Only a completed, confirmed booking for this client can earn a stamp.');}
  if(type==='discount'&&!summary.discounts||type==='gift'&&!summary.gifts)throw Error('This reward is not available yet.');
  const balance={stamps:data.stamps+(type==='visit'?1:0),discountsUsed:data.discountsUsed+(type==='discount'?1:0),giftsUsed:data.giftsUsed+(type==='gift'?1:0)};
  tx.set(eventRef,{type,date,reference,note,bookingId,completedPaid:type==='visit',...balance,language:data.language,createdAt:serverTimestamp(),createdBy:user.uid});
  tx.update(memberRef,{...balance,lastEventId:eventId,updatedAt:serverTimestamp(),updatedBy:user.uid});
  return {eventId,duplicate:false};
 });
}

export async function activateMembership(db,user,memberId){
 if(!user)throw Error('Administrator access required.');
 const ref=doc(db,'loyaltyMembers',memberId);
 return runTransaction(db,async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists()||snapshot.data().consent!==true)throw Error('The client must accept the programme rules first.');if(snapshot.data().membershipStatus!=='pending')return {alreadyActive:true};tx.update(ref,{membershipStatus:'active',approvedAt:serverTimestamp(),approvedBy:user.uid});return {alreadyActive:false}});
}
