param(
    [Parameter(Mandatory = $true)][string]$Password,
    [string]$EnvFile = '.env.local'
)

$ErrorActionPreference = 'Stop'

$sha = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($Password)
$hash = ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''

$lines = Get-Content $EnvFile
$found = $false

$updated = $lines | ForEach-Object {
    if ($_ -match '^\s*VITE_ADMIN_PASSWORD_HASH\s*=') {
        $found = $true
        "VITE_ADMIN_PASSWORD_HASH=$hash"
    }
    else { $_ }
}

if (-not $found) {
    $updated = $updated + "VITE_ADMIN_PASSWORD_HASH=$hash"
}

Set-Content -Path $EnvFile -Value $updated

$check = (Get-Content $EnvFile | Where-Object { $_ -match '^VITE_ADMIN_PASSWORD_HASH=' })
'hash_terpasang   = {0}' -f ($check -match ('^VITE_ADMIN_PASSWORD_HASH=' + $hash + '$'))
'panjang_hash_hex = {0}' -f $hash.Length
