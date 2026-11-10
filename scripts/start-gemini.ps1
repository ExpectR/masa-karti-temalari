param([switch]$Configure)
& (Join-Path $PSScriptRoot 'start-flux.ps1') @PSBoundParameters
return
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$privateDir=Join-Path $root '.local'
$linkPath=Join-Path $privateDir 'gemini-link.json'
function Test-Gemini {
 try{$r=Invoke-RestMethod -Uri 'http://127.0.0.1:8766/health' -TimeoutSec 2;return $r.ok -and $r.app -eq 'umutcan-gemini'}catch{return $false}
}
$gatewayProcess=$null
if(!(Test-Gemini)){
 $node=(Get-Command node.exe -ErrorAction SilentlyContinue).Source
 if(!$node){$node=Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'}
 if(!(Test-Path -LiteralPath $node)){throw 'Node.js 20 veya üzeri gerekli.'}
 $gatewayProcess=Start-Process -FilePath $node -ArgumentList @('"'+(Join-Path $PSScriptRoot 'gemini-gateway.cjs')+'"') -WorkingDirectory $root -WindowStyle Hidden -PassThru
 for($i=0;$i -lt 20;$i++){if((Test-Gemini) -and (Test-Path -LiteralPath $linkPath)){break};Start-Sleep -Milliseconds 250}
}
if(!(Test-Gemini)){throw 'Gemini yardımcısı başlatılamadı. Port kullanımda olabilir.'}
$link=Get-Content -Raw -LiteralPath $linkPath | ConvertFrom-Json
$url=[Uri]$link.url
if($url.Scheme -ne 'http' -or $url.Host -ne '127.0.0.1' -or $url.Port -ne 8766 -or $url.AbsolutePath -ne '/setup'){throw 'Yerel kurulum adresi geçersiz.'}
$address=$url.AbsoluteUri
if($Configure){$address=$address.Replace('/setup#','/setup?configure=1#')}
Start-Process $address | Out-Null
if($gatewayProcess){Wait-Process -Id $gatewayProcess.Id}
