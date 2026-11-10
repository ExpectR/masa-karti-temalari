const {test}=require('node:test'),assert=require('node:assert/strict'),{client,validId}=require('../scripts/horde-client.js');
const id='bd2dd277-b97a-4a06-ab1d-a7924d5f87ae';
test('free anonymous request sends only a prompt and bounded generation settings',async()=>{
 let called;const api=client(async(url,options)=>{called={url,...options};return {ok:true,json:async()=>({id})}});
 assert.equal(await api.start('pink roses',true),id);const body=JSON.parse(called.body);
 assert.equal(called.headers.apikey,'0000000000');assert.equal(body.r2,false);assert.equal(body.shared,true);assert.equal(body.trusted_workers,true);assert.deepEqual(body.models,['Dreamshaper']);assert.equal(body.params.width,640);assert.equal(body.params.height,448);assert.equal(body.params.n,1);
 assert(!('context' in body));assert(!('source_image' in body));await assert.rejects(api.start('x'.repeat(1501),false));
});
test('job identifiers cannot change API routes; API failures have useful errors',async()=>{
 let calls=0;const api=client(async()=>{calls++;return {ok:false,status:429}});
 assert(!validId('../profile'));assert.throws(()=>api.check('../profile'));assert.equal(calls,0);await assert.rejects(api.start('roses',false),/kota/);
 await assert.rejects(client(async()=>({ok:true,json:async()=>({id:'evil'})})).start('roses'),/geçerli/);
});
test('poll, result and cancellation use the documented job routes and reject remote/code payloads',async()=>{
 const calls=[];let generation={img:'UklGRg==',model:'Dreamshaper'};
 const api=client(async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>url.includes('/check/')?{done:true}:{generations:[generation]}}});
 assert((await api.check(id)).done);assert.equal((await api.result(id)).src,'data:image/webp;base64,UklGRg==');await api.cancel(id);assert.equal(calls[2].method,'DELETE');
 for(const bad of [{img:'https://evil.example/a.webp'},{img:'<svg onload=evil>'},{img:'AAAA',censored:true},{img:'A'.repeat(8000001)}]){generation=bad;await assert.rejects(api.result(id))}
});
