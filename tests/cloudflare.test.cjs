const {test}=require('node:test'),assert=require('node:assert/strict'),{createGateway}=require('../scripts/flux-gateway.cjs');
const token='f'.repeat(64),account='a'.repeat(32),key='FAKE_CLOUDFLARE_KEY_NEVER_SENT_EXTERNALLY';
test('Cloudflare local setup, credential privacy, fixed model, bounded prompts and provider failures',async()=>{
 let upstream=[],saved=null,failure=0,nowImage='UklGRg==';
 const server=createGateway({token,port:18773,cloudflare:undefined,saveCloudflareCredential:(key,accountId)=>saved={key,accountId},fetchImpl:async(url,o)=>{upstream.push({url,...o});return {ok:!failure,status:failure||200,json:async()=>({success:true,result:url.includes('/search')?[]:{image:nowImage}})}}});
 await new Promise(r=>server.listen(18773,'127.0.0.1',r));
 const post=(path,body={},origin='null',access=token)=>fetch('http://127.0.0.1:18773'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer '+access},body:JSON.stringify(body)});
 try{
 assert.equal((await post('/suggest',{prompt:'old assistant'})).status,404);assert.equal((await post('/configure',{apiKey:'old provider'})).status,404);assert.equal(upstream.length,0);
 assert.equal((await post('/image/status',{},'null','bad')).status,401);assert.equal((await post('/image/status',{},'https://evil.invalid')).status,403);assert.equal((await post('/image/generate',{prompt:'roses'})).status,503);
 assert.equal((await post('/configure-cloudflare',{accountId:account,apiKey:key})).status,403);
 assert.equal((await post('/configure-cloudflare',{accountId:'../other',apiKey:key},'http://127.0.0.1:18773')).status,400);
 const configured=await post('/configure-cloudflare',{accountId:account,apiKey:key},'http://127.0.0.1:18773');assert.equal(configured.status,200);assert.deepEqual(saved,{key,accountId:account});assert(!(await configured.text()).includes(key));
 const status=await (await post('/image/status')).json();assert(status.configured);assert(!JSON.stringify(status).includes(key));assert(!JSON.stringify(status).includes(account));
 assert.equal((await post('/image/generate',{prompt:'x'.repeat(1501)})).status,400);
 const result=await (await post('/image/generate',{prompt:'watercolor roses',names:'PRIVATE',model:'paid-model',steps:100})).json();assert.equal(result.src,'data:image/jpeg;base64,UklGRg==');const sent=upstream[1];assert(sent.url.endsWith('/ai/run/@cf/black-forest-labs/flux-1-schnell'));assert.equal(sent.headers.Authorization,'Bearer '+key);assert.deepEqual(Object.keys(JSON.parse(sent.body)).sort(),['prompt','steps']);assert.equal(JSON.parse(sent.body).steps,4);assert(!sent.body.includes('PRIVATE'));assert(!sent.body.includes('paid-model'));assert.equal((await post('/image/generate',{prompt:'again'})).status,429);
 }finally{await new Promise(r=>server.close(r))}
});
test('quota and malformed image responses do not return credentials, external URLs or paid fallbacks',async()=>{
 const {createCloudflareHandler}=require('../scripts/cloudflare-image.cjs');
 const {Readable}=require('node:stream');
 for(const status of [429,403,502,200]){
 let calls=0;const handler=createCloudflareHandler({config:{apiKey:key,accountId:account},fetchImpl:async()=>{calls++;return {ok:status===200,status,json:async()=>({success:true,result:{image:'https://evil.invalid/a.svg'}})}}});
 const req=Readable.from([Buffer.from(JSON.stringify({prompt:'roses'}))]);req.url='/image/generate';req.method='POST';req.headers={'content-type':'application/json'};let output='';const res={writeHead(){},end(s){output=s}};await handler(req,res,'null');assert.equal(calls,1);assert(output.includes('error'));assert(!output.includes(key));assert(!output.includes('https://evil'));
 }
});
