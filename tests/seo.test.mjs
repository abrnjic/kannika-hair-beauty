import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const origin='https://kannika-hair-beauty.vercel.app';
for(const [lang,path,file] of [['en','/','dist/index.html'],['th','/th/','dist/th/index.html']]){
 test(`${lang}: canonical and reciprocal language URLs identify only public pages`,()=>{
  const s=read(file);assert.equal((s.match(/rel="canonical"/g)||[]).length,1);assert.ok(s.includes(`rel="canonical" href="${origin+path}"`));
  for(const [language,route] of [['en','/'],['th','/th/'],['x-default','/']])assert.ok(s.includes(`hreflang="${language}" href="${origin+route}"`));
  assert.match(s,/<meta name="robots" content="index,follow,max-image-preview:large">/);assert.equal((s.match(/<h1\b/g)||[]).length,1);
 });
 test(`${lang}: valid structured business data matches visible address and future opening`,()=>{
  const s=read(file),json=JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const business=json['@graph'][0];assert.equal(business.name,'Kannika Hair & Beauty Pattaya');assert.equal(business.telephone,'+66817274874');assert.equal(business.address.postalCode,'20150');assert.equal(business.geo.latitude,12.922515);assert.equal(business.geo.longitude,100.8778609);
  assert.equal(business.openingHoursSpecification[0].validFrom,'2026-11-01');assert.equal(business.openingHoursSpecification[0].dayOfWeek.length,7);assert.equal(business.openingHoursSpecification[0].opens,'09:00');assert.equal(business.openingHoursSpecification[0].closes,'22:00');
  assert.ok(s.includes('datetime="2026-11-01"'));assert.ok(!('aggregateRating' in business));assert.ok(!('review' in business));assert.equal(business.sameAs.length,3);assert.equal(json['@graph'][2].inLanguage,lang);
 });
 test(`${lang}: metadata, real share asset and indexable treatment copy exist before JavaScript`,()=>{
  const s=read(file);assert.equal((s.match(/name="description"/g)||[]).length,1);assert.ok(s.includes(`property="og:url" content="${origin+path}"`));assert.match(s,/name="twitter:card" content="summary_large_image"/);assert.match(s,/og:image:width" content="1200"/);
  assert.ok(existsSync(new URL('../dist/assets/kannika-social.jpg',import.meta.url)));assert.equal((s.match(/class="price-row"/g)||[]).length,49);assert.equal((s.match(/id="visit"/g)||[]).length,1);
  assert.ok(!s.includes('Booking preview'));assert.ok(!s.includes('Online booking is being prepared'));
  const images=s.match(/<img\b[^>]+>/g);for(const image of images){assert.match(image,/width="\d+"/);assert.match(image,/height="\d+"/);if(image.includes('images.unsplash.com'))assert.match(image,/srcset=/);}
 });
}
test('sitemap lists canonical public URLs; private screens permit crawlers to read noindex',()=>{
 const xml=read('dist/sitemap.xml');assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]),[origin+'/',origin+'/th/']);
 const robots=read('dist/robots.txt');assert.ok(robots.includes('Sitemap: '+origin+'/sitemap.xml'));assert.ok(!robots.includes('Disallow: /club'));assert.ok(!robots.includes('Disallow: /admin'));
 for(const path of ['admin.html','club.html','th/admin.html','th/club.html'])assert.match(read('dist/'+path),/name="robots" content="noindex,nofollow"/);
 assert.match(read('dist/404.html'),/noindex,follow/);
});
test('canonical redirects preserve membership routes and authentication proxy',()=>{
 const config=JSON.parse(read('vercel.json'));for(const [source,destination] of [['/index.html','/'],['/th/index.html','/th/'],['/th','/th/'],['/club.html','/club']])assert.ok(config.redirects.some(r=>r.source===source&&r.destination===destination&&r.permanent));
 assert.ok(config.rewrites.some(r=>r.source==='/__/auth/:path*'));assert.equal(config.buildCommand,'npm run build:content');
});
