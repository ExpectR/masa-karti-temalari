(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.UmutSavedTheme=factory()})(globalThis,function(){
 'use strict';
 function object(o){return o&&typeof o==='object'&&!Array.isArray(o)}
 var motifs=['rect','circle','line','diamond','frame','rose','rose2','peony','peonyw','daisy','poppy','cosmos','anem','sun','leaf','euc','lav','maple','maple2','maple3','oak','pumpkin','dahlia','mum','siklamen','cigdem','hercai','ates','asteri','kadife','aslan','petunya','begonya','sumbul','cuha','nergis','kokina','ruscus','poins','poinsw','star','bauble','snow','wheat','berry','pine','holly'];
 function validateTheme(t,context){
  var keys=['name','background','textColor','accentColor','font','decorations'];
  if(!object(t)||Object.keys(t).some(function(k){return keys.indexOf(k)<0})||typeof t.name!=='string'||!t.name.trim()||t.name.length>80||!Array.isArray(t.decorations)||!t.decorations.length||t.decorations.length>24)throw Error('Üretilen tema geçerli değil.');
  function hex(v){if(typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))throw Error('Tema rengi geçersiz.');return v}
  function num(v,a,b){if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)throw Error('Tema süsü sınırların dışında.');return v}
  var theme={name:t.name.replace(/[\u0000-\u001f]/g,' ').trim(),background:hex(t.background),textColor:hex(t.textColor),accentColor:hex(t.accentColor),font:font(t.font,context)};
  theme.decorations=t.decorations.map(function(d){if(!object(d)||Object.keys(d).some(function(k){return ['kind','x','y','size','height','rotation','opacity','color','stroke','strokeWidth','radius'].indexOf(k)<0})||motifs.indexOf(d.kind)<0)throw Error('Desteklenmeyen tema süsü.');return {kind:d.kind,x:num(d.x,0,100),y:num(d.y,0,100),size:num(d.size,2,105),height:num(d.height===undefined?d.size:d.height,2,74),rotation:num(d.rotation,-180,180),opacity:num(d.opacity,5,100),color:hex(d.color),stroke:hex(d.stroke===undefined?t.accentColor:d.stroke),strokeWidth:num(d.strokeWidth===undefined?(d.kind==='line'||d.kind==='frame'?.4:0):d.strokeWidth,0,3),radius:num(d.radius===undefined?0:d.radius,0,20)}});
  return theme;
 }

 function font(v,c){if(typeof v!=='string'||!c.fonts.some(function(f){return f.value===v}))throw Error('Bilinmeyen yazı tipi.');return v}
 return {validateTheme:validateTheme};
});
