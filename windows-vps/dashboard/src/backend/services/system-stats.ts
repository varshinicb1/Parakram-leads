import os from 'os';
import { exec } from 'child_process';

interface SystemStats {
  m: string;   // memory used/total GB
  d: string;   // disk used/total GB
  u: string;   // uptime
  p: number;   // port
  bak: string; // backup status
  t: boolean;  // tunnel running
  s: boolean;  // ssh running
  neb: boolean; // nebula running
  c: number;   // cpu %
  l: string;   // leads status
}

function execPromise(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      resolve(err ? '' : stdout.trim());
    });
  });
}

export async function getSystemStats(): Promise<SystemStats> {
  // Memory
  const totalMem = os.totalmem() / 1024 ** 3;
  const freeMem = os.freemem() / 1024 ** 3;
  const usedMem = totalMem - freeMem;

  // CPU
  const cpus = os.cpus();
  const cpuPercent = cpus.length > 0
    ? Math.round((1 - os.freemem() / os.totalmem()) * 100)
    : 0;

  // Uptime
  const secs = os.uptime();
  const uptime = `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;

  // Disk (Windows - use wmic or PowerShell)
  let diskUsed = 0;
  let diskTotal = 0;
  try {
    const diskOutput = await execPromise(
      'powershell -Command "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json -Compress"'
    );
    if (diskOutput) {
      const d = JSON.parse(diskOutput);
      diskUsed = (d.Used || 0) / 1e9;
      diskTotal = ((d.Used || 0) + (d.Free || 0)) / 1e9;
    }
  } catch { /* fallback */ }

  // Service checks
  const sshRunning = await checkProcess('sshd');
  const nebRunning = await checkProcess('nebula');
  const tunRunning = await checkProcess('cloudflared');

  return {
    m: `${usedMem.toFixed(1)}/${totalMem.toFixed(1)} GB`,
    d: `${diskUsed.toFixed(1)}/${diskTotal.toFixed(1)} GB`,
    u: uptime,
    p: 9876,
    bak: 'na',
    t: tunRunning,
    s: sshRunning,
    neb: nebRunning,
    c: cpuPercent,
    l: 'not_installed',
  };
}

async function checkProcess(name: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      const out = await execPromise(`tasklist /FI "IMAGENAME eq ${name}.exe" /NH`);
      return out.toLowerCase().includes(name);
    }
    return false;
  } catch {
    return false;
  }
}
