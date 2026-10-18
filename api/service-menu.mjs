import {handleServiceMenu} from '../server/service-menu.mjs';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Allow','GET, PUT');
 const result = await handleServiceMenu({method:req.method,headers:req.headers,body:req.body,query:req.query});
 return res.status(result.status).json(result.body);
}
