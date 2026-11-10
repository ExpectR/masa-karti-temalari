'use strict';
const crypto=require('node:crypto'),{promisify}=require('node:util'),scrypt=promisify(crypto.scrypt);
const FORMAT='umutcan-flux-connection',AAD=Buffer.from(FORMAT+':1');
function password(value){if(typeof value!=='string'||value.length<12||value.length>256)throw Error('Parolan en az 12, en fazla 256 karakter olmalı.');return value}
function credential(value){if(!value||typeof value!=='object'||!/^[a-f0-9]{32}$/i.test(value.accountId||'')||!/^[-_A-Za-z0-9]{20,512}$/.test(value.apiKey||''))throw Error('Bağlantı yedeği geçerli değil.');return {accountId:value.accountId,apiKey:value.apiKey}}
async function derive(value,salt){return scrypt(password(value),salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024})}
async function seal(config,pass){const plain=Buffer.from(JSON.stringify(credential(config))),salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=await derive(pass,salt);try{const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(AAD);const data=Buffer.concat([cipher.update(plain),cipher.final()]);return {format:FORMAT,version:1,kdf:'scrypt',cipher:'aes-256-gcm',salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}}finally{key.fill(0);plain.fill(0)}}
async function unseal(bundle,pass){
 password(pass);if(!bundle||typeof bundle!=='object'||Array.isArray(bundle)||Object.keys(bundle).sort().join(',')!=='cipher,data,format,iv,kdf,salt,tag,version'||bundle.format!==FORMAT||bundle.version!==1||bundle.kdf!=='scrypt'||bundle.cipher!=='aes-256-gcm')throw Error('Bu dosya desteklenen bir FLUX bağlantı yedeği değil.');
 function bytes(name,length,max){const text=bundle[name];if(typeof text!=='string'||text.length>max||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))throw Error('Bağlantı yedeği hasarlı.');const b=Buffer.from(text,'base64');if(b.toString('base64')!==text||length&&b.length!==length)throw Error('Bağlantı yedeği hasarlı.');return b}
 const salt=bytes('salt',16,24),iv=bytes('iv',12,16),tag=bytes('tag',16,24),data=bytes('data',0,2048),key=await derive(pass,salt);let plain;
 try{const cipher=crypto.createDecipheriv('aes-256-gcm',key,iv);cipher.setAAD(AAD);cipher.setAuthTag(tag);plain=Buffer.concat([cipher.update(data),cipher.final()]);return credential(JSON.parse(plain.toString('utf8')))}catch(e){throw Error('Parola yanlış veya yedek dosyası hasarlı. Mevcut bağlantın değiştirilmedi.')}finally{key.fill(0);if(plain)plain.fill(0)}
}
module.exports={seal,unseal};
