export const membershipPending=member=>member?.membershipStatus==='pending';
export function loyaltyRoster(invitations,members){
 const byEmail=new Map(members.map(member=>[member.email.trim().toLowerCase(),member]));
 const rows=invitations.map(invite=>{const member=byEmail.get(invite.email.trim().toLowerCase());if(member)byEmail.delete(invite.email.trim().toLowerCase());return {invitation:invite,member,email:invite.email,name:member?.name||invite.name,status:member?(membershipPending(member)?'accepted':'active'):invite.deliveryStatus==='sent'?'sent':'deliveryPending'}});
 for(const member of byEmail.values())rows.push({member,email:member.email,name:member.name,status:membershipPending(member)?'accepted':'active'});
 const time=value=>value?.toMillis?.()??(typeof value?.seconds==='number'?value.seconds*1000:0);
 return rows.sort((a,b)=>(a.status==='accepted'?0:1)-(b.status==='accepted'?0:1)||time(b.member?.createdAt||b.invitation?.updatedAt)-time(a.member?.createdAt||a.invitation?.updatedAt));
}
