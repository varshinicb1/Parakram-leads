# JALEBI VPS — stops and removes the dashboard Windows service + firewall rule.
$ErrorActionPreference = "Continue"
$dir = $PSScriptRoot
$svc = Join-Path $dir "JalebiVPS-svc.exe"

if (Test-Path $svc) {
    & $svc stop 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    & $svc uninstall 2>&1 | Out-Null
} else {
    sc.exe stop JalebiVPS 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    sc.exe delete JalebiVPS 2>&1 | Out-Null
}
Remove-NetFirewallRule -DisplayName "JALEBI VPS Dashboard" -ErrorAction SilentlyContinue

# Wait for the WinSW-wrapped node.exe process to actually exit before touching
# its log files — 'svc stop'/'svc uninstall' return before the child process
# handle is fully released, and deleting a file that's still open silently
# no-ops on Windows (leaving it behind, which then blocks RemoveFolders).
for ($i = 0; $i -lt 10; $i++) {
    $stillRunning = Get-Process -Name node -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq (Join-Path $dir "node.exe") }
    if (-not $stillRunning) { break }
    Start-Sleep -Milliseconds 500
}

# Clean up WinSW-generated log/pid files (not tracked as MSI components, so
# RemoveFiles/RemoveFolders won't touch them — remove explicitly for a
# truly clean uninstall with no leftover directory).
Get-ChildItem -Path $dir -Filter "JalebiVPS-svc.*.log" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $dir -Filter "*.pid" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

exit 0
