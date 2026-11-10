'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
function windowsSecretStore(file){
 const ps=path.join(process.env.WINDIR||'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
 function command(text,input){const r=spawnSync(ps,['-NoProfile','-NonInteractive','-Command',text],{input,encoding:'utf8',windowsHide:true,env:{...process.env,PSModulePath:path.join(process.env.WINDIR||'C:\\Windows','System32/WindowsPowerShell/v1.0/Modules'),UMUT_SECRET_PATH:file},timeout:15000});if(r.status!==0)throw Error('Şifreli anahtar dosyası açılamadı.');return r.stdout.replace(/^\uFEFF/,'')}
 return {
  load(){if(!fs.existsSync(file))return null;return JSON.parse(command("$ErrorActionPreference='Stop';$c=Import-Clixml -LiteralPath $env:UMUT_SECRET_PATH; @{apiKey=$c.GetNetworkCredential().Password;token=$c.UserName}|ConvertTo-Json -Compress"))},
  save(key,token){fs.mkdirSync(path.dirname(file),{recursive:true});command("$ErrorActionPreference='Stop';$o=[Console]::In.ReadToEnd()|ConvertFrom-Json;$s=ConvertTo-SecureString $o.apiKey -AsPlainText -Force;$c=New-Object System.Management.Automation.PSCredential($o.token,$s);$tmp=$env:UMUT_SECRET_PATH+'.tmp';$c|Export-Clixml -LiteralPath $tmp;Move-Item -LiteralPath $tmp -Destination $env:UMUT_SECRET_PATH -Force",JSON.stringify({apiKey:key,token}))}
 };
}
module.exports={windowsSecretStore};
