import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const guides=JSON.parse(read('content/service-guides.json'));
const origin='https://www.kannikabeauty.com';
const paths=guides.flatMap(g=>['/'+g.slug+'/','/th/'+g.slug+'/']);
test('every service URL is discoverable from the correct homepage and sitemap',()=>{
 const sitemap=read('dist/sitemap.xml');
 for(const lang of ['en','th']){
  const home=read(`dist/${lang==='th'?'th/':''}index.html`);
  assert.equal((home.match(/id="treatment-guides-title"/g)||[]).length,1);
  for(const g of guides)assert.ok(home.includes(`href="${lang==='th'?'/th/':'/'}${g.slug}/"`));
 }
 for(const path of paths)assert.ok(sitemap.includes(`<loc>${origin+path}</loc>`));
});
for(const g of guides)for(const lang of ['en','th'])test(`${g.slug} ${lang}: complete indexable service page with matching schema and language links`,()=>{
 const route=`${lang==='th'?'/th/':'/'}${g.slug}/`,s=read('dist'+route+'index.html');
 assert.equal((s.match(/<h1\b/g)||[]).length,1);
 assert.equal((s.match(/rel="canonical"/g)||[]).length,1);
 assert.ok(s.includes(`rel="canonical" href="${origin+route}"`));
 assert.ok(s.includes(`hreflang="en" href="${origin}/${g.slug}/"`));
 assert.ok(s.includes(`hreflang="th" href="${origin}/th/${g.slug}/"`));
 assert.ok(s.includes(`hreflang="x-default" href="${origin}/${g.slug}/"`));
 assert.ok(s.includes('<meta name="robots" content="index,follow,max-image-preview:large">'));
 const schema=JSON.parse(s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const service=schema['@graph'].find(x=>x['@type']==='Service');
 assert.equal(service.url,origin+route);assert.equal(service.name,g[lang].name);
 assert.equal(service.provider['@id'],origin+'/#salon');
 assert.ok(schema['@graph'].some(x=>x['@type']==='BreadcrumbList'));
 assert.ok(!('aggregateRating' in service));assert.ok(!('offers' in service));
 assert.ok(s.includes('tel:+66817274874'));
 assert.ok(s.includes(`href="${lang==='th'?'/th/':'/'}#prices"`));
 assert.ok(existsSync(new URL(`../dist/assets/${g.image}-1120.webp`,import.meta.url)));
 assert.ok(s.includes(`width="${g.imageWidth}" height="${g.imageHeight}"`));
 for(const other of guides.filter(x=>x.slug!==g.slug))assert.ok(s.includes(`href="${lang==='th'?'/th/':'/'}${other.slug}/"`));
});
