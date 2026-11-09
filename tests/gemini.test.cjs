'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createGateway}=require('../scripts/gemini-gateway.cjs'),contract=require('../scripts/gemini-contract.cjs');
const token='a'.repeat(64),context={fonts:[{value:'Arial,sans-serif',name:'Arial'}],themes:[{id:'plain',name:'Sade'}],settings:{size:30,color:'#123456','pos.name.x':50},names:'PRIVATE_NAMES',logo:'PRIVATE_LOGO',hasLogo:true};
const newTheme={name:'Gece Çizgileri',background:'#102030',textColor:'#f7e8c0',accentColor:'#d4af37',font:'Arial,sans-serif',decorations:[{kind:'frame',x:50,y:50,size:96,height:66,rotation:0,opacity:90,color:'#d4af37',stroke:'#d4af37',strokeWidth:.4,radius:2},{kind:'euc',x:10,y:12,size:22,height:22,rotation:-35,opacity:90,color:'#557766'}]};
test('generated themes allow bounded compositions but no scripts, URLs, or unknown drawing commands',()=>{
 const theme=contract.validateTheme(newTheme,context);assert.equal(theme.decorations.length,2);assert.equal(theme.decorations[1].stroke,'#d4af37');
 assert(contract.validate({message:'Yeni tema',changes:[],theme:newTheme},context).theme);
 const bad=[];for(const change of [{kind:'script'},{color:'url(https://attacker.example)'},{x:-1},{size:999},{opacity:0},{svg:'<script>'}])bad.push({...newTheme,decorations:[{...newTheme.decorations[0],...change}]});bad.push({...newTheme,font:'unknown'}, {...newTheme,decorations:Array(25).fill(newTheme.decorations[0])},{...newTheme,code:'alert(1)'});
 for(const item of bad)assert.throws(()=>contract.validateTheme(item,context));
 assert.throws(()=>contract.validate({message:'x',changes:[{field:'theme',value:'plain'}],theme:newTheme},context));
 const cleaned=contract.cleanContext({...context,generatedTheme:newTheme});assert(cleaned.generatedTheme);assert(!JSON.stringify(cleaned).includes('PRIVATE'));
});
test('contract permits bounded edits and rejects dangerous, unknown, duplicate values',()=>{
 const c=contract.cleanContext(context);assert(!JSON.stringify(c).includes('PRIVATE'));
 assert.deepEqual(contract.validate({message:'Öneri',changes:[{field:'size',value:'36'},{field:'italic',value:'true'}]},c).changes,[{field:'size',value:36},{field:'italic',value:true}]);
 for(const changes of [[{field:'size',value:'Infinity'}],[{field:'size',value:'900'}],[{field:'names',value:'sil'}],[{field:'__proto__',value:'x'}],[{field:'theme',value:'missing'}],[{field:'font',value:'javascript:alert(1)'}],[{field:'pos.name.x',value:'-1'}],[{field:'italic',value:'yes'}],[{field:'size',value:'32'},{field:'size',value:'33'}]])assert.throws(()=>contract.validate({message:'x',changes},c));
});
test('gateway authentication, origin, upstream contract, privacy and failures',async()=>{
 let mode='valid',calls=0,captured;
 const server=createGateway({apiKey:'PRIVATE_API_KEY',token,port:18766,minInterval:0,maxRequests:100,fetchImpl:async(url,options)=>{calls++;captured={url,options};if(mode==='quota')return {ok:false,status:429};if(mode==='bad-key')return {ok:false,status:403};return {ok:true,json:async()=>({candidates:[{finishReason:mode==='unfinished'?'MAX_TOKENS':'STOP',content:{parts:[{text:mode==='malformed'?'oops':JSON.stringify({message:'Öneri',changes:[{field:'size',value:mode==='invalid'?'9999':'36'}]})}]}}]})}}});
 await new Promise(resolve=>server.listen(18766,'127.0.0.1',resolve));
 const call=(route='/suggest',options={})=>fetch('http://127.0.0.1:18766'+route,{method:'POST',headers:{Origin:'null','Content-Type':'application/json',Authorization:'Bearer '+token,...options.headers},body:JSON.stringify({prompt:'Yazıyı büyüt',context}),...options,headers:{Origin:'null','Content-Type':'application/json',Authorization:'Bearer '+token,...options.headers}});
 try{
  assert.equal((await call('/suggest',{headers:{Authorization:''}})).status,401);
  assert.equal((await call('/suggest',{headers:{Origin:'https://attacker.example'}})).status,403);
  const wrongHost=await new Promise((resolve,reject)=>{const req=require('node:http').request('http://127.0.0.1:18766/health',{headers:{Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()});assert.equal(wrongHost,403);
  assert.equal(calls,0);
  let r=await call('/connect');assert.equal(r.status,200);assert(!(await r.text()).includes('PRIVATE'));
  r=await fetch('http://127.0.0.1:18766/suggest',{method:'OPTIONS',headers:{Origin:'null','Access-Control-Request-Private-Network':'true'}});assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'null');
  r=await call();assert.equal(r.status,200);assert.equal((await r.json()).changes[0].value,'36');
  assert(captured.url.startsWith('https://generativelanguage.googleapis.com/'));assert(!captured.url.includes('PRIVATE_API_KEY'));assert.equal(captured.options.headers['x-goog-api-key'],'PRIVATE_API_KEY');assert(!captured.options.body.includes('PRIVATE'));assert(!captured.options.body.includes('names'));
  for(const m of ['invalid','unfinished','malformed','bad-key','quota']){mode=m;r=await call();assert.equal(r.status,m==='quota'?429:502);assert(!(await r.text()).includes('PRIVATE_API_KEY'))}
  const count=calls;r=await call('/suggest',{body:JSON.stringify({prompt:'',context})});assert.equal(r.status,400);assert.equal(calls,count);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
test('gateway limits repeated requests without paid-model fallback',async()=>{
 let calls=0;const server=createGateway({apiKey:'fake',token,port:18767,maxRequests:1,minInterval:0,fetchImpl:async()=>{calls++;return {ok:false,status:429}}});await new Promise(r=>server.listen(18767,'127.0.0.1',r));
 try{const options={method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({prompt:'test',context})};assert.equal((await fetch('http://127.0.0.1:18767/suggest',options)).status,429);assert.equal((await fetch('http://127.0.0.1:18767/suggest',options)).status,429);assert.equal(calls,1)}finally{await new Promise(r=>server.close(r))}
});
test('local setup requires its session token, validates a key and never exposes it',async()=>{
 let saved=null,metadataCalls=0;
 const server=createGateway({token,port:18768,saveCredential:(key,access)=>{saved={key,access}},fetchImpl:async()=>{metadataCalls++;return {ok:true}}});await new Promise(r=>server.listen(18768,'127.0.0.1',r));
 const authKey='AQ.'+'DUMMY_AUTH_KEY_'.repeat(30);
 const call=(route,origin='http://127.0.0.1:18768',access=token)=>fetch('http://127.0.0.1:18768'+route,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({apiKey:authKey})});
 try{
  assert.equal((await call('/connect')).status,503);
  assert.equal((await call('/configure','null')).status,403);
  assert.equal((await call('/configure','https://attacker.example')).status,403);
  assert.equal((await call('/configure',undefined,'wrong')).status,401);assert.equal(metadataCalls,0);
  let r=await fetch('http://127.0.0.1:18768/setup');const html=await r.text();assert.equal(r.status,200);assert(!html.includes(token));assert(!html.includes('DUMMY_KEY'));assert(r.headers.get('content-security-policy').includes('frame-ancestors'));
  r=await call('/configure');assert.equal(r.status,200);assert(!(await r.text()).includes('DUMMY'));assert.equal(saved.key,authKey);assert.equal(saved.access,token);assert.equal((await call('/connect')).status,200);
  r=await fetch('http://127.0.0.1:18768/health');assert.equal((await r.json()).configured,true);
 }finally{await new Promise(r=>server.close(r))}
});
test('Windows secret store round-trips with DPAPI without storing a plaintext key',{skip:process.platform!=='win32'},()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'umut-gemini-test-')),file=path.join(dir,'credential.xml');
 try{const store=require('../scripts/gemini-secret.cjs').windowsSecretStore(file);assert.equal(store.load(),null);store.save('DUMMY_KEY_ONLY_FOR_DPAPI_TEST',token);assert(!fs.readFileSync(file,'utf8').includes('DUMMY_KEY_ONLY_FOR_DPAPI_TEST'));const loaded=store.load();assert.equal(loaded.apiKey,'DUMMY_KEY_ONLY_FOR_DPAPI_TEST');assert.equal(loaded.token,token)}finally{if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(dir)}
});
test('theme-generation mode uses a separate schema and rejects incomplete new themes',async()=>{
 let malformed=false,captured;
 const server=createGateway({apiKey:'fake',token,port:18770,minInterval:0,fetchImpl:async(url,options)=>{captured=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({message:'Tema hazır',changes:[],...(malformed?{}:{theme:newTheme})})}]}}]})}}});await new Promise(r=>server.listen(18770,'127.0.0.1',r));
 async function call(mode){return fetch('http://127.0.0.1:18770/suggest',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({mode,prompt:'Yeni tema üret',context})})}
 try{let r=await call('theme');assert.equal(r.status,200);assert.equal((await r.json()).theme.name,newTheme.name);assert(captured.generationConfig.responseSchema.required.includes('theme'));assert.equal(captured.generationConfig.maxOutputTokens,4096);assert(!JSON.stringify(captured).includes('PRIVATE'));r=await call('edit');assert.equal(r.status,502);malformed=true;r=await call('theme');assert.equal(r.status,502)}finally{await new Promise(r=>server.close(r))}
});
