param([string]$BackupDir = './backups')
$ErrorActionPreference = 'Stop'
if (!$env:DATABASE_URL) { throw 'Set DATABASE_URL to the intended PostgreSQL server.' }
$connection = [Uri]$env:DATABASE_URL
$credentials = $connection.UserInfo.Split(':', 2)
$env:PGHOST = $connection.Host
$env:PGPORT = if ($connection.Port -gt 0) { [string]$connection.Port } else { '5432' }
$env:PGUSER = [Uri]::UnescapeDataString($credentials[0])
$env:PGPASSWORD = if ($credentials.Length -gt 1) { [Uri]::UnescapeDataString($credentials[1]) } else { '' }
$env:PGSSLMODE = if ($connection.Query -match 'sslmode=require') { 'require' } else { 'prefer' }
$env:PGDATABASE = $connection.AbsolutePath.TrimStart('/')
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$targetFile = Join-Path $BackupDir ('peoplecore_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.dump')
& pg_dump --format=custom --file $targetFile
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL backup failed.' }
Get-Item -LiteralPath $targetFile | Select-Object FullName, Length
Get-FileHash -LiteralPath $targetFile -Algorithm SHA256
