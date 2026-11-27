# PeopleCore Database Backup Automation Script
param (
    [string]$BackupDir = "./backups"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$targetFile = "$BackupDir/peoplecore_backup_$timestamp.json"
Write-Host "Creating PeopleCore database backup: $targetFile..."

if (Test-Path "database/peoplecore_store.json") {
    Copy-Item "database/peoplecore_store.json" -Destination $targetFile
    $hash = Get-FileHash $targetFile -Algorithm SHA256
    Write-Host "✅ Backup completed successfully!"
    Write-Host "SHA-256 Checksum: $($hash.Hash)"
} else {
    Write-Host "❌ Database file database/peoplecore_store.json not found."
}
