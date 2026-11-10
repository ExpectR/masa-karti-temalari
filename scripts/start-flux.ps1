param([switch]$Configure)
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$privateDir=Join-Path $root '.local'
$linkPath=Join-Path $privateDir 'flux-link.json'
function Test-Flux {
 try{$r=Invoke-RestMethod -Uri 'http://127.0.0.1:8766/health' -TimeoutSec 2;return $r.ok -and $r.app -eq 'umutcan-flux'}catch{return $false}
}
$gatewayProcess=$null
if(!(Test-Flux)){
 $node=Join-Path $root 'runtime\node.exe'
 if(!(Test-Path -LiteralPath $node)){$node=(Get-Command node.exe -ErrorAction SilentlyContinue).Source}
 if(!$node){$node=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'}
 if(!(Test-Path -LiteralPath $node)){throw 'Node.js 20 veya üzeri gerekli.'}
 $gatewayProcess=Start-Process -FilePath $node -ArgumentList @('"'+(Join-Path $PSScriptRoot 'flux-gateway.cjs')+'"') -WorkingDirectory $root -WindowStyle Hidden -PassThru
 for($i=0;$i -lt 20;$i++){if((Test-Flux) -and (Test-Path -LiteralPath $linkPath)){break};Start-Sleep -Milliseconds 250}
}
if(!(Test-Flux)){throw 'FLUX yardımcısı başlatılamadı. Port kullanımda olabilir.'}
$link=Get-Content -Raw -LiteralPath $linkPath | ConvertFrom-Json
$url=[Uri]$link.url
if($url.Scheme -ne 'http' -or $url.Host -ne '127.0.0.1' -or $url.Port -ne 8766 -or $url.AbsolutePath -ne '/setup'){throw 'Yerel kurulum adresi geçersiz.'}
$address=$url.AbsoluteUri
if($Configure){$address=$address.Replace('/setup#','/setup?configure=1#')}
Start-Process $address | Out-Null
if($gatewayProcess){Wait-Process -Id $gatewayProcess.Id}
