// Preserve the supplied logo's alpha silhouette and use the site's exact gold.
// sips only creates smaller source copies; SVG compositing sets the display colour.
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const gold=readFileSync('dist/style.css','utf8').match(/--gold:(#[0-9a-f]{6})/i)[1];
const temp=mkdtempSync(join(tmpdir(),'kannika-brand-'));
try {
 for(const [name,size,width,height] of [['logo',800,1999,787],['emblem',256,1254,1254]]) {
  const png=join(temp,name+'.png');
  execFileSync('/usr/bin/sips',['-Z',String(size),`dist/assets/kannika-${name}-transparent.png`,'--out',png]);
  const data=readFileSync(png).toString('base64');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="gold" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feFlood flood-color="${gold}"/><feComposite in2="SourceAlpha" operator="in"/></filter></defs><image width="${width}" height="${height}" href="data:image/png;base64,${data}" filter="url(#gold)"/></svg>\n`;
  writeFileSync(`dist/assets/kannika-${name}-gold.svg`,svg);
 }
} finally {rmSync(temp,{recursive:true,force:true})}
