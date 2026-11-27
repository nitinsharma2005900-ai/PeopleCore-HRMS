param(
  [Parameter(Mandatory=$true)][string]$BackupFile,
  [Parameter(Mandatory=$true)][string]$TargetDatabase
)
$ErrorActionPreference = 'Stop'
if (!$env:DATABASE_URL) { throw 'Set DATABASE_URL to the intended PostgreSQL server.' }
$connection = [Uri]$env:DATABASE_URL
$credentials = $connection.UserInfo.Split(':', 2)
$env:PGHOST = $connection.Host
$env:PGPORT = if ($connection.Port -gt 0) { [string]$connection.Port } else { '5432' }
$env:PGUSER = [Uri]::UnescapeDataString($credentials[0])
$env:PGPASSWORD = if ($credentials.Length -gt 1) { [Uri]::UnescapeDataString($credentials[1]) } else { '' }
$env:PGSSLMODE = if ($connection.Query -match 'sslmode=require') { 'require' } else { 'prefer' }
if ($TargetDatabase -notmatch '^[a-zA-Z0-9_]+$') { throw 'Invalid target database name.' }
if (!(Test-Path -LiteralPath $BackupFile -PathType Leaf)) { throw 'Backup file does not exist.' }
# Restore into an explicitly selected empty database; do not clean an existing database.
& pg_restore --no-owner --exit-on-error --single-transaction --dbname $TargetDatabase $BackupFile
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; the transaction was rolled back.' }
Write-Output "PostgreSQL backup restored into $TargetDatabase."
