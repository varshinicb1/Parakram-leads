param([string]$Action, [string]$InstallDir)

$nodeExe = Join-Path $InstallDir "dashboard\node.exe"
$backend = Join-Path $InstallDir "dashboard\backend.cjs"
$svcName = "ParakramVPS"
$svcDisplay = "Parakram VPS Dashboard"
$svcDesc = "Parakram VPS — Windows VPS management dashboard with real-time system monitoring, service control, and Cloudflare tunnel management."
$binPath = "`"$nodeExe`" `"$backend`""

switch ($Action) {
  "install" {
    # Create service
    sc.exe create $svcName binPath=$binPath start=auto DisplayName="`"$svcDisplay`" | Out-Null
    sc.exe description $svcName "`"$svcDesc`"" | Out-Null
    sc.exe failure $svcName reset=86400 actions=restart/5000/restart/10000/restart/30000 | Out-Null
    sc.exe start $svcName | Out-Null

    # Firewall
    netsh.exe advfirewall firewall add rule name="Parakram VPS Dashboard" dir=in action=allow protocol=TCP localport=9876 profile=any | Out-Null

    Write-Output "Service created and started successfully."
  }
  "uninstall" {
    sc.exe stop $svcName 2>$null | Out-Null
    sc.exe delete $svcName 2>$null | Out-Null
    netsh.exe advfirewall firewall delete rule name="Parakram VPS Dashboard" 2>$null | Out-Null
    Write-Output "Service removed."
  }
}
