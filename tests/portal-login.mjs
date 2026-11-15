import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='dist/server';
const modules=['index.js',...(await readdir(root,{recursive:true})).filter(p=>/\.m?js$/.test(p)&&p!=='index.js')].map(p=>({type:'ESModule',path:root+'/'+p}));
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{SITE_ADMIN_EMAIL:'test@example.invalid'}});
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
 assert.ok(html.includes('/signout-with-chatgpt?return_to=%2F%3Fsigned_out%3D1'));
 const account={'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.invalid'};
 const destination=encodeURIComponent('/?signed_out=1');
 for(const path of ['/profile','/student','/faculty','/admin','/staff','/login?return_to=%2Ffaculty']){
  const page=await (await mf.dispatchFetch('https://site.test'+path,{headers:account})).text();
  const signoutLinks=[...page.matchAll(/href="(\/signout-with-chatgpt[^"]+)" target="_top"/g)];
  assert.ok(signoutLinks.length>0,path);
  assert.ok(signoutLinks.every(([,url])=>url==='/signout-with-chatgpt?return_to='+destination),path);
 }
 for(const path of ['https://evil.test','//evil.test','/login','/callback','/signout-with-chatgpt']){
 const html=await (await mf.dispatchFetch('https://site.test/login?return_to='+encodeURIComponent(path))).text();
 assert.ok(html.includes('/signin-with-chatgpt?return_to=%2Fstudent'));
 }
 const home=await (await mf.dispatchFetch('https://site.test/')).text();
 assert.match(home,/<dialog[^>]*id="home-student-login"/);
 assert.match(home,/href="\/signin-with-chatgpt\?return_to=%2Fstudent" target="_top"/);
 assert.match(home,/Browse courses without signing in/);
 assert.match(home,/<dialog[^>]*data-auto-open="true"/);
 const afterSignout=await (await mf.dispatchFetch('https://site.test/?signed_out=1')).text();
 assert.match(afterSignout,/<dialog[^>]*data-auto-open="false"/);
 assert.match(afterSignout,/Student sign in \/ Sign up/);
 for(const path of ['/student','/admin','/faculty','/help','/login']){
  const page=await (await mf.dispatchFetch('https://site.test'+path)).text();
  assert.doesNotMatch(page,/<dialog[^>]*id="home-student-login"/);
 }
 const signedHome=await (await mf.dispatchFetch('https://site.test/',{headers:{'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.invalid'}})).text();
 assert.doesNotMatch(signedHome,/<dialog[^>]*id="home-student-login"/);
 console.log('PASS: portal login, safe return paths and signed-out homepage-only student login dialog.');
}finally{await mf.dispose()}
