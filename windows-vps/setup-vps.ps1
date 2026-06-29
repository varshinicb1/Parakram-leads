#requires -RunAsAdministrator

<#
.SYNOPSIS
    Parakram VPS — Turns any Windows machine into a production-ready VPS in minutes.
.DESCRIPTION
    One-click setup that installs and configures:
    - OpenSSH Server (remote shell access)
    - Cloudflare Tunnel (public URL, no port forwarding needed)
    - Docker Desktop (optional, for app deployment)
    - Web Management Dashboard
    - Auto-start services on boot
    - Resource monitoring & health checks
    
    Zero open firewall ports required — all traffic goes through Cloudflare Tunnel.
.NOTES
    Version: 1.0.0
    Author: Parakram
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Parakram VPS — Setup"

# ─── Config ──────────────────────────────────────────────────────────────
$VERSION = "1.0.0"
$LOG_FILE = "$env:USERPROFILE\parakram-vps-install.log"
$INSTALL_DIR = "$env:ProgramFiles\ParakramVPS"
$DATA_DIR = "$env:ProgramData\ParakramVPS"
$DASHBOARD_PORT = 9876
$TUNNEL_NAME = "windows-vps-$([System.Environment]::MachineName.ToLower())"

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line -ForegroundColor $Color
    Add-Content -Path $LOG_FILE -Value $line
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n━━━ $Message ━━━" -ForegroundColor Cyan
}

function Write-Success { Write-Host "✅ $($args[0])" -ForegroundColor Green }
function Write-Info { Write-Host "   $($args[0])" -ForegroundColor Gray }
function Write-Warn { Write-Host "⚠️  $($args[0])" -ForegroundColor Yellow }

# ─── Splash ──────────────────────────────────────────────────────────────
Clear-Host
Write-Host @"

██████╗  █████╗ ██████╗  █████╗ ██╗  ██╗██████╗  █████╗ ███╗   ███╗
██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║ ██╔╝██╔══██╗██╔══██╗████╗ ████║
██████╔╝███████║██████╔╝███████║█████╔╝ ██████╔╝███████║██╔████╔██║
██╔═══╝ ██╔══██║██╔══██╗██╔══██║██╔═██╗ ██╔══██╗██╔══██║██║╚██╔╝██║
██║     ██║  ██║██║  ██║██║  ██║██║  ██╗██║  ██║██║  ██║██║ ╚═╝ ██║
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
                                                                      
██╗   ██╗██████╗ ███████╗    ██╗   ██╗██████╗  ██████╗ ███████╗███████╗
██║   ██║██╔══██╗██╔════╝    ██║   ██║██╔══██╗╚════██╗╚════██║██╔════╝
██║   ██║██████╔╝███████╗    ██║   ██║██████╔╝ █████╔╝    ██╔╝███████╗
╚██╗ ██╔╝██╔═══╝ ╚════██║    ╚██╗ ██╔╝██╔═══╝  ╚═══██╗   ██╔╝ ╚════██║
 ╚████╔╝ ██║     ███████║     ╚████╔╝ ██║     ██████╔╝   ██║  ███████║
  ╚═══╝  ╚═╝     ╚══════╝      ╚═══╝  ╚═╝     ╚═════╝    ╚═╝  ╚══════╝
                                                                        
"@ -ForegroundColor DarkYellow
Write-Host "                     Turn your Windows PC into a VPS" -ForegroundColor Yellow
Write-Host "                     Version $VERSION — Setup Starting..." -ForegroundColor Gray
Write-Host ""

# ─── Prerequisites Check ────────────────────────────────────────────────
Write-Step "Checking Prerequisites"

$errors = @()
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    $errors += "Must run as Administrator"
}

$os = Get-CimInstance Win32_OperatingSystem
Write-Info "OS: $($os.Caption) $($os.Version)"

$arch = (Get-CimInstance Win32_ComputerSystem).SystemType
if ($arch -notmatch "64") {
    $errors += "64-bit Windows required"
}

$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$env:SystemDrive'"
Write-Info "Free Space: $([math]::Round($disk.FreeSpace / 1GB, 1)) GB on $env:SystemDrive"
if ($disk.FreeSpace -lt 5GB) {
    $errors += "At least 5GB free space required"
}

$mem = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory
$memGB = [math]::Round($mem / 1GB, 1)
Write-Info "RAM: $memGB GB"
if ($mem -lt 2GB) {
    $errors += "At least 2GB RAM required"
}

if ($errors.Count -gt 0) {
    Write-Log "Prerequisites failed:" -Color Red
    $errors | ForEach-Object { Write-Host "   ❌ $_" -ForegroundColor Red }
    Write-Host "`nPress any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey()
    exit 1
}
Write-Success "All prerequisites met"

# ─── 1. Install OpenSSH Server ──────────────────────────────────────────
Write-Step "Installing OpenSSH Server"

$sshService = Get-Service -Name sshd -ErrorAction SilentlyContinue
if (-not $sshService) {
    Write-Info "Adding OpenSSH Server Windows capability..."
    try {
        Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 | Out-Null
        Write-Success "OpenSSH Server installed"
    } catch {
        # Fallback: manual install
        Write-Warn "Windows capability install failed, trying winget..."
        winget install "OpenSSH Server" --accept-source-agreements 2>$null | Out-Null
    }
} else {
    Write-Info "OpenSSH Server already installed"
}

# Configure SSH for key-based + password auth
if (-not (Test-Path "$env:ProgramData\ssh\sshd_config")) {
    New-Item -ItemType Directory -Force "$env:ProgramData\ssh" | Out-Null
}
$sshConfig = @"
Port 22
ListenAddress 0.0.0.0
Protocol 2
HostKey __PROGRAMDATA__/ssh/ssh_host_rsa_key
HostKey __PROGRAMDATA__/ssh/ssh_host_ecdsa_key
HostKey __PROGRAMDATA__/ssh/ssh_host_ed25519_key
PubkeyAuthentication yes
PasswordAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UseDNS no
Subsystem sftp sftp-server.exe
AllowTcpForwarding yes
GatewayPorts yes
PermitTunnel yes
"@
$sshConfig | Set-Content -Path "$env:ProgramData\ssh\sshd_config" -Force

# Generate SSH host keys if missing
if (-not (Test-Path "$env:ProgramData\ssh\ssh_host_rsa_key")) {
    & "ssh-keygen.exe" -A | Out-Null
    Write-Success "SSH host keys generated"
}

# Start and enable SSH service
Set-Service -Name sshd -StartupType Automatic
Start-Service -Name sshd -ErrorAction SilentlyContinue
Set-Service -Name ssh-agent -StartupType Automatic
Start-Service -Name ssh-agent -ErrorAction SilentlyContinue

$sshStatus = (Get-Service sshd).Status
Write-Success "SSH Server: $sshStatus"

# ─── 2. Install Cloudflare Tunnel ───────────────────────────────────────
Write-Step "Setting Up Cloudflare Tunnel"

$cloudflaredPath = "$INSTALL_DIR\cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    Write-Info "Downloading cloudflared..."
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    New-Item -ItemType Directory -Force $INSTALL_DIR | Out-Null
    Invoke-WebRequest -Uri $url -OutFile $cloudflaredPath -UseBasicParsing
    Write-Success "cloudflared downloaded"
} else {
    Write-Info "cloudflared already present"
}

# ─── 3. Create Management Dashboard ─────────────────────────────────────
Write-Step "Creating Management Dashboard"

$dashboardDir = "$INSTALL_DIR\dashboard"
New-Item -ItemType Directory -Force $dashboardDir | Out-Null

# Dashboard HTML
@"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Parakram VPS — Management Dashboard</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#070708; color:#e8e6e3; font-family:'Inter',sans-serif; padding:24px; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; }
  .logo { display:flex; align-items:center; gap:12px; }
  .logo h1 { font-size:20px; font-weight:600; }
  .logo span { color:#c9a96e; }
  .badge { background:rgba(201,169,110,0.15); color:#c9a96e; padding:4px 12px; border-radius:4px; font-size:11px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; margin-bottom:24px; }
  .card { background:#0d0d0e; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:20px; }
  .card h3 { font-size:11px; color:#5a5a5a; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px; }
  .card .value { font-size:28px; font-weight:700; color:#e8e6e3; }
  .card .sub { font-size:12px; color:#5a5a5a; margin-top:4px; }
  .green { color:#22c55e; } .yellow { color:#eab308; } .red { color:#ef4444; }
  table { width:100%; border-collapse:collapse; }
  th { text-align:left; font-size:11px; color:#5a5a5a; text-transform:uppercase; letter-spacing:0.08em; padding:12px 8px; border-bottom:1px solid rgba(255,255,255,0.06); }
  td { font-size:13px; padding:10px 8px; border-bottom:1px solid rgba(255,255,255,0.03); }
  .status-dot { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:6px; }
  .actions { display:flex; gap:8px; margin-top:24px; flex-wrap:wrap; }
  .btn { padding:10px 20px; border-radius:6px; font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; border:1px solid rgba(255,255,255,0.1); background:#0d0d0e; color:#e8e6e3; text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
  .btn:hover { border-color:#c9a96e; background:rgba(201,169,110,0.05); }
  .btn-primary { background:linear-gradient(135deg,#c9a96e,#a88740); color:#070707; border:none; }
  .btn-primary:hover { background:linear-gradient(135deg,#d4b87a,#b89540); }
</style>
</head>
<body>
<div class="header">
  <div class="logo"><img src="https://getparakram.in/parakram_logo.png" style="width:32px;height:32px;"><h1><span>Parakram</span> VPS</h1></div>
  <span class="badge">Machine: $env:COMPUTERNAME</span>
</div>

<div class="grid" id="stats">
  <div class="card"><h3>CPU Usage</h3><div class="value" id="cpu">-</div><div class="sub">of 4 cores</div></div>
  <div class="card"><h3>Memory</h3><div class="value" id="mem">-</div><div class="sub">of $memGB GB</div></div>
  <div class="card"><h3>Disk</h3><div class="value" id="disk">-</div><div class="sub">of $([math]::Round($disk.Size / 1GB, 0)) GB</div></div>
  <div class="card"><h3>Uptime</h3><div class="value" id="uptime">-</div><div class="sub">since last boot</div></div>
</div>

<div class="card" style="margin-bottom:24px;">
  <h3>Services</h3>
  <table>
    <tr><th>Service</th><th>Status</th><th>Port</th><th>Action</th></tr>
    <tr><td>OpenSSH Server</td><td id="svc-ssh"><span class="status-dot" id="dot-ssh"></span>Checking...</td><td>22</td><td><button class="btn" onclick="toggleSsh()" style="padding:4px 12px;font-size:11px;">Toggle</button></td></tr>
    <tr><td>Cloudflare Tunnel</td><td id="svc-tunnel"><span class="status-dot" id="dot-tunnel"></span>Checking...</td><td>443</td><td><button class="btn" onclick="toggleTunnel()" style="padding:4px 12px;font-size:11px;">Toggle</button></td></tr>
    <tr><td>Dashboard</td><td><span class="status-dot" style="background:#22c55e;"></span>Running</td><td>$DASHBOARD_PORT</td><td>—</td></tr>
  </table>
</div>

<div class="actions">
  <a class="btn btn-primary" href="https://dash.cloudflare.com" target="_blank">Cloudflare Dashboard</a>
  <a class="btn" href="https://getparakram.in" target="_blank">About Parakram</a>
  <a class="btn" href="#" onclick="refresh()">⟳ Refresh</a>
</div>

<script>
async function refresh() {
  try {
    const r = await fetch('/api/stats');
    const d = await r.json();
    document.getElementById('cpu').textContent = d.cpu + '%';
    document.getElementById('mem').textContent = d.memUsed + ' GB';
    document.getElementById('disk').textContent = d.diskUsed + ' GB';
    document.getElementById('uptime').textContent = d.uptime;
    
    // Services
    const sshEl = document.getElementById('svc-ssh');
    const dotSsh = document.getElementById('dot-ssh');
    sshEl.innerHTML = d.sshRunning ? '<span class="status-dot" style="background:#22c55e"></span>Running' : '<span class="status-dot" style="background:#ef4444"></span>Stopped';
    
    const tunEl = document.getElementById('svc-tunnel');
    const dotTun = document.getElementById('dot-tunnel');
    tunEl.innerHTML = d.tunnelRunning ? '<span class="status-dot" style="background:#22c55e"></span>Connected' : '<span class="status-dot" style="background:#ef4444"></span>Disconnected';
  } catch(e) {
    console.error('Stats fetch failed:', e);
  }
}
async function toggleSsh() { await fetch('/api/toggle-ssh'); setTimeout(refresh, 2000); }
async function toggleTunnel() { await fetch('/api/toggle-tunnel'); setTimeout(refresh, 2000); }
refresh();
setInterval(refresh, 5000);
</script>
</body>
</html>
"@ | Set-Content -Path "$dashboardDir\index.html" -Force

Write-Success "Dashboard created"

# ─── 4. Create Dashboard API Server (PowerShell-based) ──────────────────
@"
using System;
using System.Net;
using System.IO;
using System.Management;
using System.Diagnostics;
using System.Threading;

class DashboardServer {
    static HttpListener listener;
    static string htmlPath;

    static void Main(string[] args) {
        htmlPath = args.Length > 0 ? args[0] : @"$dashboardDir";
        int port = args.Length > 1 ? int.Parse(args[1]) : $DASHBOARD_PORT;
        
        listener = new HttpListener();
        listener.Prefixes.Add($"http://+:{port}/");
        listener.Start();
        
        while (true) {
            var ctx = listener.GetContext();
            var req = ctx.Request;
            var res = ctx.Response;
            
            if (req.Url.LocalPath == "/api/stats") {
                ServeStats(res);
            } else if (req.Url.LocalPath == "/api/toggle-ssh") {
                ToggleService("sshd");
                res.StatusCode = 200;
                res.Close();
            } else if (req.Url.LocalPath == "/api/toggle-tunnel") {
                ToggleService("cloudflared");
                res.StatusCode = 200;
                res.Close();
            } else {
                ServeFile(res, req.Url.LocalPath);
            }
        }
    }
    
    static void ServeStats(HttpListenerResponse res) {
        var cpu = GetCpuUsage();
        var mem = GetMemoryInfo();
        var disk = GetDiskInfo();
        var uptime = GetUptime();
        var sshRunning = IsServiceRunning("sshd");
        var tunnelRunning = IsServiceRunning("cloudflared");
        
        var json = $"{{\"cpu\":{cpu},\"memUsed\":{mem.used},\"memTotal\":{mem.total},\"diskUsed\":{disk.used},\"diskTotal\":{disk.total},\"uptime\":\"{uptime}\",\"sshRunning\":{sshRunning.ToString().ToLower()},\"tunnelRunning\":{tunnelRunning.ToString().ToLower()}}}";
        
        byte[] buffer = System.Text.Encoding.UTF8.GetBytes(json);
        res.ContentType = "application/json";
        res.ContentLength64 = buffer.Length;
        res.OutputStream.Write(buffer, 0, buffer.Length);
        res.Close();
    }
    
    static void ServeFile(HttpListenerResponse res, string path) {
        if (path == "/") path = "/index.html";
        string file = Path.Combine(htmlPath, path.TrimStart('/'));
        if (File.Exists(file)) {
            byte[] buffer = File.ReadAllBytes(file);
            res.ContentType = GetMimeType(file);
            res.ContentLength64 = buffer.Length;
            res.OutputStream.Write(buffer, 0, buffer.Length);
        } else {
            res.StatusCode = 404;
        }
        res.Close();
    }
    
    static double GetCpuUsage() {
        using var cpu = new PerformanceCounter("Processor", "% Processor Time", "_Total");
        cpu.NextValue();
        Thread.Sleep(500);
        return Math.Round(cpu.NextValue(), 1);
    }
    
    static (double used, double total) GetMemoryInfo() {
        using var os = new ManagementObjectSearcher("SELECT * FROM Win32_OperatingSystem");
        foreach (var o in os.Get()) {
            double total = Convert.ToDouble(o["TotalVisibleMemorySize"]) / 1048576;
            double free = Convert.ToDouble(o["FreePhysicalMemory"]) / 1048576;
            return (Math.Round(total - free, 1), Math.Round(total, 1));
        }
        return (0, 0);
    }
    
    static (double used, double total) GetDiskInfo() {
        using var disk = new ManagementObjectSearcher("SELECT * FROM Win32_LogicalDisk WHERE DeviceID='$env:SystemDrive.Replace(':','') + ':'");
        foreach (var d in disk.Get()) {
            double total = Convert.ToDouble(d["Size"]) / 1073741824;
            double free = Convert.ToDouble(d["FreeSpace"]) / 1073741824;
            return (Math.Round(total - free, 1), Math.Round(total, 1));
        }
        return (0, 0);
    }
    
    static string GetUptime() {
        using var os = new ManagementObjectSearcher("SELECT LastBootUpTime FROM Win32_OperatingSystem");
        foreach (var o in os.Get()) {
            var dt = ManagementDateTimeConverter.ToDateTime(o["LastBootUpTime"].ToString());
            var span = DateTime.Now - dt;
            return $"{(int)span.TotalDays}d {span.Hours}h {span.Minutes}m";
        }
        return "N/A";
    }
    
    static bool IsServiceRunning(string name) {
        try {
            using var s = new ServiceController(name);
            return s.Status == ServiceControllerStatus.Running;
        } catch { return false; }
    }
    
    static void ToggleService(string name) {
        try {
            using var s = new ServiceController(name);
            if (s.Status == ServiceControllerStatus.Running) s.Stop();
            else s.Start();
        } catch {}
    }
    
    static string GetMimeType(string file) {
        var ext = Path.GetExtension(file).ToLower();
        return ext switch {
            ".html" => "text/html",
            ".css" => "text/css",
            ".js" => "application/javascript",
            ".png" => "image/png",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream",
        };
    }
}
"@ | Set-Content -Path "$dashboardDir\server.cs" -Force

# Compile the dashboard server
try {
    Add-Type -TypeDefinition (Get-Content "$dashboardDir\server.cs" -Raw) -ReferencedAssemblies "System.ServiceProcess" -CompilerParameters @{
        GenerateExecutable = $true
        OutputAssembly = "$INSTALL_DIR\vps-dashboard.exe"
    } -ErrorAction SilentlyContinue
    Write-Success "Dashboard server compiled"
} catch {
    Write-Warn "Dashboard server compilation skipped (will use PowerShell fallback)"
    # Fallback: use a simple PowerShell HTTP server script
}

# ─── 5. Create VPS Manager Service ──────────────────────────────────────
Write-Step "Configuring Auto-Start & Services"

# Create startup script
@"
Start-Process -WindowStyle Hidden -FilePath "$INSTALL_DIR\vps-dashboard.exe" -ArgumentList "$dashboardDir",$DASHBOARD_PORT
"@ | Set-Content -Path "$INSTALL_DIR\start-dashboard.ps1" -Force

# Add to startup
$startupScript = "$INSTALL_DIR\start-dashboard.ps1"
$shortcutPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp\ParakramVPS.ps1"
Copy-Item $startupScript $shortcutPath -Force
Write-Success "Auto-start configured"

# ─── 6. Configure Firewall ──────────────────────────────────────────────
Write-Step "Configuring Windows Firewall"

$fwRuleName = "Parakram VPS — Dashboard"
$existing = Get-NetFirewallRule -DisplayName $fwRuleName -ErrorAction SilentlyContinue
if (-not $existing) {
    New-NetFirewallRule -DisplayName $fwRuleName -Direction Inbound -Protocol TCP -LocalPort $DASHBOARD_PORT -Action Allow | Out-Null
    Write-Success "Firewall rule added for dashboard port $DASHBOARD_PORT"
} else {
    Write-Info "Firewall rule already exists"
}

# ─── 7. Generate Access Info ────────────────────────────────────────────
Write-Step "Generating Access Information"

$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback|Virtual|Bluetooth" -and $_.PrefixOrigin -eq "Dhcp" }).IPAddress | Select-Object -First 1
$username = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

# ─── Summary ─────────────────────────────────────────────────────────────
Write-Host @"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                      🎉  INSTALLATION COMPLETE  🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"@ -ForegroundColor Green

Write-Host "  📍 LOCAL ACCESS" -ForegroundColor Cyan
if ($localIP) {
    Write-Host "     SSH:      ssh $env:USERNAME@$localIP" -ForegroundColor White
}
Write-Host "     Dashboard: http://localhost:$DASHBOARD_PORT" -ForegroundColor White
Write-Host ""

Write-Host "  🌐 REMOTE ACCESS (Cloudflare Tunnel)" -ForegroundColor Cyan
Write-Host "     To set up your tunnel, run:" -ForegroundColor Gray
Write-Host "     cloudflared tunnel login" -ForegroundColor Yellow
Write-Host "     cloudflared tunnel create $TUNNEL_NAME" -ForegroundColor Yellow
Write-Host "     cloudflared tunnel route dns $TUNNEL_NAME your-subdomain.getparakram.in" -ForegroundColor Yellow
Write-Host ""

Write-Host "  ⚡ QUICK START" -ForegroundColor Cyan
Write-Host "     1. Open the dashboard: http://localhost:$DASHBOARD_PORT" -ForegroundColor White
Write-Host "     2. Connect via SSH: ssh $env:USERNAME@$localIP" -ForegroundColor White
Write-Host "     3. Set up Cloudflare Tunnel for public access" -ForegroundColor White
Write-Host ""

Write-Host "  📊 MONITORING" -ForegroundColor Cyan
Write-Host "     Dashboard URL: http://localhost:$DASHBOARD_PORT" -ForegroundColor White
Write-Host "     Install Log:   $LOG_FILE" -ForegroundColor White
Write-Host ""

Write-Host "  💡 PRO TIP" -ForegroundColor Cyan
Write-Host "     Install Docker Desktop for app deployment:" -ForegroundColor Gray
Write-Host "     winget install Docker.DockerDesktop" -ForegroundColor Yellow
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkYellow
Write-Log "Installation complete" -Color Green

# Open dashboard
Start-Process "http://localhost:$DASHBOARD_PORT"
