# Sinkronkan .env.local ke GitHub Actions Variables & Secrets.
# Nilai tidak pernah dicetak ke output.
param(
    [string]$Repo = 'FauziFerdiansyah/soya-arief',
    [string]$EnvFile = '.env.local'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
    throw "File $EnvFile tidak ditemukan."
}

$values = @{}
foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^\s*#') { continue }
    if ($line -notmatch '=') { continue }
    $idx = $line.IndexOf('=')
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    if ($key) { $values[$key] = $val }
}

$asVariables = @(
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_BASE',
    'VITE_PUBLIC_URL'
)

$asSecrets = @(
    'VITE_ADMIN_KEY',
    'VITE_ADMIN_PASSWORD_HASH'
)

function Set-GhEntry {
    param([string]$Kind, [string]$Name, [string]$Value, [string]$Repo)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ('SKIP  {0,-8} {1}  (kosong di env)' -f $Kind, $Name)
    }

    if ($Kind -eq 'variable') {
        gh variable set $Name --body $Value --repo $Repo 2>&1 | Out-Null
    }
    else {
        gh secret set $Name --body $Value --repo $Repo 2>&1 | Out-Null
    }

    if ($LASTEXITCODE -eq 0) {
        return ('OK    {0,-8} {1}' -f $Kind, $Name)
    }

    return ('GAGAL {0,-8} {1}' -f $Kind, $Name)
}

foreach ($name in $asVariables) {
    Set-GhEntry -Kind 'variable' -Name $name -Value $values[$name] -Repo $Repo
}

foreach ($name in $asSecrets) {
    Set-GhEntry -Kind 'secret' -Name $name -Value $values[$name] -Repo $Repo
}
