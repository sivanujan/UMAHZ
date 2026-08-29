# Script to update php.ini with CA certificate bundle
$phpIni = "C:\Program Files\Php-8.5.0\php.ini"
$caCert = "C:\Users\Sivanujan_PC\cacert.pem"

if (-not (Test-Path $caCert)) {
    Invoke-WebRequest -Uri "https://curl.se/ca/cacert.pem" -OutFile $caCert
}

if (Test-Path $phpIni) {
    $content = Get-Content $phpIni -Raw
    
    # Replace curl.cainfo
    if ($content -match '(?m)^\s*;?\s*curl\.cainfo\s*=.*$') {
        $content = $content -replace '(?m)^\s*;?\s*curl\.cainfo\s*=.*$', "curl.cainfo = `"$caCert`""
    } else {
        $content += "`r`ncurl.cainfo = `"$caCert`""
    }

    # Replace openssl.cafile
    if ($content -match '(?m)^\s*;?\s*openssl\.cafile\s*=.*$') {
        $content = $content -replace '(?m)^\s*;?\s*openssl\.cafile\s*=.*$', "openssl.cafile = `"$caCert`""
    } else {
        $content += "`r`nopenssl.cafile = `"$caCert`""
    }

    Set-Content -Path $phpIni -Value $content
    Write-Host "Successfully updated $phpIni"
} else {
    Write-Error "php.ini not found at $phpIni"
}
