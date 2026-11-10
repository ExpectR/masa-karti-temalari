const {test}=require('node:test'),assert=require('node:assert/strict'),{seal,unseal}=require('../scripts/portable-connection.cjs'),{createGateway}=require('../scripts/flux-gateway.cjs');
const secret={apiKey:'FAKE_CF_CREDENTIAL_FOR_TEST_ONLY',accountId:'b'.repeat(32)},pass='Test için uzun parola 123!';
test('portable backup authenticates all ciphertext fields and never contains the plaintext key',async()=>{
 const first=await seal(secret,pass),second=await seal(secret,pass);assert.notEqual(first.data,second.data);assert.notEqual(first.salt,second.salt);assert(!JSON.stringify(first).includes(secret.apiKey));assert(!JSON.stringify(first).includes(secret.accountId));assert.deepEqual(await unseal(first,pass),secret);
 await assert.rejects(unseal(first,'Yanlış parola 123456'),/Parola yanlış/);await assert.rejects(seal(secret,'short'),/12/);
 for(const key of ['salt','iv','tag','data']){const bad={...first};const bytes=Buffer.from(bad[key],'base64');bytes[0]^=1;bad[key]=bytes.toString('base64');await assert.rejects(unseal(bad,pass))}
 for(const bad of [{...first,version:2},{...first,kdf:'pbkdf2'},{...first,iterations:1e9},{...first,data:'A'.repeat(9000)}])await assert.rejects(unseal(bad,pass));
});
test('portable routes require local setup origin and auth; import verifies access before replacing credentials',async()=>{
 const token='e'.repeat(64);let saved=[],upstream=0,blocked=false;const server=createGateway({token,port:18779,cloudflare:secret,saveCloudflareCredential:(apiKey,accountId)=>saved.push({apiKey,accountId}),fetchImpl:async()=>{upstream++;return {ok:!blocked,status:blocked?403:200,json:async()=>({success:true,result:[]})}}});await new Promise(r=>server.listen(18779,'127.0.0.1',r));
 const post=(route,data,origin='http://127.0.0.1:18779',access=token)=>fetch('http://127.0.0.1:18779'+route,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
 assert.equal((await post('/connection/export',{password:pass},'null')).status,403);assert.equal((await post('/connection/export',{password:pass},'https://evil.invalid')).status,403);assert.equal((await post('/connection/export',{password:pass},undefined,'bad')).status,401);
 const response=await post('/connection/export',{password:pass});assert.equal(response.status,200);const exported=await response.json();assert(!JSON.stringify(exported).includes(secret.apiKey));assert.equal(upstream,0);
 assert.equal((await post('/connection/import',{bundle:exported.bundle,password:'Wrong password 123'})).status,400);assert.equal(upstream,0);assert.equal(saved.length,0);
 blocked=true;assert.equal((await post('/connection/import',{bundle:exported.bundle,password:pass})).status,502);assert.equal(saved.length,0);
 blocked=false;const imported=await post('/connection/import',{bundle:exported.bundle,password:pass});assert.equal(imported.status,200);assert.deepEqual(saved,[secret]);assert(!JSON.stringify(await imported.json()).includes(secret.apiKey));
 }finally{await new Promise(r=>server.close(r))}
});
test('same backup installs into a second helper with its own connection token',async()=>{
 const bundle=await seal(secret,pass),token='9'.repeat(64);let installed;const server=createGateway({token,port:18780,saveCloudflareCredential:(apiKey,accountId)=>installed={apiKey,accountId},fetchImpl:async()=>({ok:true,json:async()=>({success:true,result:[]})})});await new Promise(r=>server.listen(18780,'127.0.0.1',r));
 try{const r=await fetch('http://127.0.0.1:18780/connection/import',{method:'POST',headers:{Origin:'http://127.0.0.1:18780',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({bundle,password:pass})});assert.equal(r.status,200);assert.deepEqual(installed,secret)}finally{await new Promise(r=>server.close(r))}
});
