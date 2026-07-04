# JALEBI VPS — stops and removes the dashboard Windows service + firewall rule.
$ErrorActionPreference = "Continue"
$dir = $PSScriptRoot
$svc = Join-Path $dir "JalebiVPS-svc.exe"

$logDir = Join-Path $env:ProgramData "JalebiVPS"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir "uninstall-service.log"
function Write-Log([string]$msg) {
    Add-Content -Path $logFile -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg)
}

Write-Log "=== uninstall-service.ps1 started ==="

if (Test-Path $svc) {
    $r1 = & $svc stop 2>&1 | Out-String
    Write-Log "svc stop => $($r1.Trim())"
    Start-Sleep -Seconds 2
    $r2 = & $svc uninstall 2>&1 | Out-String
    Write-Log "svc uninstall => $($r2.Trim())"
} else {
    $r1 = sc.exe stop JalebiVPS 2>&1 | Out-String
    Write-Log "sc.exe stop (no WinSW exe found) => $($r1.Trim())"
    Start-Sleep -Seconds 2
    $r2 = sc.exe delete JalebiVPS 2>&1 | Out-String
    Write-Log "sc.exe delete => $($r2.Trim())"
}

# WinSW's *own host process* is the thing registered as the service binary —
# 'svc stop' asks it to shut down the wrapped node.exe, but the WinSW host
# process itself can keep running (and keep the SCM handle to its own service
# entry open) if it doesn't exit promptly. Kill it explicitly before retrying
# delete; retrying `sc delete` alone is a no-op once a service is already in
# the "marked for deletion, waiting on handle close" state.
for ($i = 0; $i -lt 10; $i++) {
    $winswProc = Get-Process -Name "JalebiVPS-svc" -ErrorAction SilentlyContinue
    if (-not $winswProc) { Write-Log "WinSW host process exited"; break }
    Write-Log "WinSW host process still running (PID $($winswProc.Id -join ',')); stopping it"
    $winswProc | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

for ($i = 0; $i -lt 10; $i++) {
    $stillRegistered = Get-Service JalebiVPS -ErrorAction SilentlyContinue
    if (-not $stillRegistered) { Write-Log "Service no longer registered (after $i extra delete attempts)"; break }
    $r3 = sc.exe delete JalebiVPS 2>&1 | Out-String
    Write-Log "retry sc.exe delete [$i] => $($r3.Trim())"
    Start-Sleep -Seconds 1
}

$finalState = Get-Service JalebiVPS -ErrorAction SilentlyContinue
Write-Log "Final state: $(if ($finalState) { "STILL REGISTERED ($($finalState.Status))" } else { 'gone' })"

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

Write-Log "=== uninstall-service.ps1 complete ==="
exit 0
