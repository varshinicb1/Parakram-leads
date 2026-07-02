import os from 'os';
import { exec } from 'child_process';
import { getServiceStatus } from './service-manager.js';

interface SystemStats {
  m: string;
  d: string;
  u: string;
  p: number;
  bak: string;
  t: 'running' | 'stopped' | 'not_installed';
  s: 'running' | 'stopped' | 'not_installed';
  neb: 'running' | 'stopped' | 'not_installed';
  caddy: 'running' | 'stopped' | 'not_installed';
  restic: 'running' | 'stopped' | 'not_installed';
  c: number;
  l: 'running' | 'stopped' | 'not_installed';
}

function execPromise(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      resolve(err ? '' : stdout.trim());
    });
  });
}

export async function getSystemStats(): Promise<SystemStats> {
  const totalMem = os.totalmem() / 1024 ** 3;
  const freeMem = os.freemem() / 1024 ** 3;
  const usedMem = totalMem - freeMem;

  const cpuPercent = Math.min(100, Math.round((1 - freeMem / totalMem) * 100));

  const secs = os.uptime();
  const uptime = `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;

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

  const [sshSt, tunSt, nebSt, caddySt, resticSt, leadsSt] = await Promise.all([
    getServiceStatus('ssh'),
    getServiceStatus('tun'),
    getServiceStatus('neb'),
    getServiceStatus('caddy'),
    getServiceStatus('restic'),
    getServiceStatus('leads'),
  ]);

  const toState = (st: string): 'running' | 'stopped' | 'not_installed' => {
    if (st === 'running') return 'running';
    if (st === 'stopped') return 'stopped';
    return 'not_installed';
  };

  return {
    m: `${usedMem.toFixed(1)}/${totalMem.toFixed(1)} GB`,
    d: `${diskUsed.toFixed(1)}/${diskTotal.toFixed(1)} GB`,
    u: uptime,
    p: 9876,
    bak: resticSt === 'running' ? new Date().toLocaleDateString() : 'na',
    t: toState(tunSt),
    s: toState(sshSt),
    neb: toState(nebSt),
    caddy: toState(caddySt),
    restic: toState(resticSt),
    c: cpuPercent,
    l: toState(leadsSt),
  };
}
