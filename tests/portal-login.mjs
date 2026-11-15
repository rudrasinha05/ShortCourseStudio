import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='dist/server';
const modules=['index.js',...(await readdir(root,{recursive:true})).filter(p=>/\.m?js$/.test(p)&&p!=='index.js')].map(p=>({type:'ESModule',path:root+'/'+p}));
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort()){
  for(const s of (await readFile('drizzle/'+file,'utf8')).split('--> statement-breakpoint'))if(s.trim())await db.prepare(s.trim()).run();
 }
 for(const [path,role] of [['/student','Student'],['/faculty','Faculty'],['/admin','Admin'],['/staff','Staff']]){
 const response=await mf.dispatchFetch('https://site.test/login?return_to='+encodeURIComponent(path));
 const html=(await response.text()).replace(/<!--.*?-->/g,'');
 assert.equal(response.status,200,html);
 assert.ok(html.includes('Sign in to the '+role+' Portal')||html.includes('Sign in / Sign up'));
 assert.ok(html.includes('/signin-with-chatgpt?return_to='+encodeURIComponent(path)));
 }
 const html=await (await mf.dispatchFetch('https://site.test/login?return_to=%2Fstudent',{headers:{'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.invalid'}})).text();
 assert.ok(html.includes('Your account is currently signed in.'));
 assert.ok(html.includes('/signout-with-chatgpt?return_to=%2F'));
 for(const path of ['https://evil.test','//evil.test','/login','/callback','/signout-with-chatgpt']){
 const html=await (await mf.dispatchFetch('https://site.test/login?return_to='+encodeURIComponent(path))).text();
 assert.ok(html.includes('/signin-with-chatgpt?return_to=%2Fstudent'));
 }
 const home=await (await mf.dispatchFetch('https://site.test/')).text();
 assert.match(home,/<dialog[^>]*id="home-student-login"/);
 assert.match(home,/href="\/signin-with-chatgpt\?return_to=%2Fstudent" target="_top"/);
 assert.match(home,/Browse courses without signing in/);
 for(const path of ['/student','/admin','/faculty','/help','/login']){
  const page=await (await mf.dispatchFetch('https://site.test'+path)).text();
  assert.doesNotMatch(page,/<dialog[^>]*id="home-student-login"/);
 }
 const signedHome=await (await mf.dispatchFetch('https://site.test/',{headers:{'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.invalid'}})).text();
 assert.doesNotMatch(signedHome,/<dialog[^>]*id="home-student-login"/);
 console.log('PASS: portal login, safe return paths and signed-out homepage-only student login dialog.');
}finally{await mf.dispose()}
