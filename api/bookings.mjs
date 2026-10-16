import {handleBooking} from '../server/booking-notifications.mjs';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Allow','POST');
 try {const result=await handleBooking({method:req.method,headers:req.headers,body:req.body});return res.status(result.status).json(result.body)}
 catch {console.error('booking_request_unavailable');return res.status(503).json({error:'booking_service_unavailable'})}
}
