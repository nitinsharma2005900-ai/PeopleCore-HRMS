# PeopleCore Database Restore Script
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Backup file $BackupFile does not exist."
    Exit 1
}

Write-Host "Restoring PeopleCore database from $BackupFile..."
Copy-Item $BackupFile -Destination "database/peoplecore_store.json" -Force
Write-Host "✅ Database restored successfully to database/peoplecore_store.json!"
