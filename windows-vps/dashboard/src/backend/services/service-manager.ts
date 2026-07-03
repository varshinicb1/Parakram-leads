import { exec } from 'child_process';

function execPromise(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 10000 }, (err, stdout) => {
      resolve(err ? '' : stdout.trim());
    });
  });
}

// Real, honest status only. A service that isn't actually installed and
// running must report 'not_installed' — never fake a green status.
const serviceMap: Record<string, { serviceName: string; checkProcess: string | null }> = {
  ssh: { serviceName: 'sshd', checkProcess: 'sshd.exe' },
  tun: { serviceName: 'cloudflared', checkProcess: 'cloudflared.exe' },
  neb: { serviceName: 'nebula', checkProcess: 'nebula.exe' },
  caddy: { serviceName: 'JalebiCaddy', checkProcess: 'caddy.exe' },
  restic: { serviceName: 'JalebiRestic', checkProcess: 'restic.exe' },
  leads: { serviceName: 'JalebiLeads', checkProcess: null },
};

export async function getServiceStatus(name: string): Promise<string> {
  const entry = serviceMap[name];
  if (!entry) return 'unknown';

  const scOut = await execPromise(`sc query "${entry.serviceName}" 2>nul`);
  if (scOut.includes('RUNNING')) return 'running';
  if (scOut.includes('STOPPED')) return 'stopped';

  if (entry.checkProcess) {
    const procOut = await execPromise(`tasklist /FI "IMAGENAME eq ${entry.checkProcess}" 2>nul`);
    if (procOut.includes(entry.checkProcess)) return 'running';
  }

  return 'not_installed';
}

export async function toggleService(name: string): Promise<{ ok: boolean; service: string; status?: string; error?: string }> {
  const entry = serviceMap[name];
  if (!entry) return { ok: false, service: name, status: 'unknown' };

  const status = await getServiceStatus(name);
  if (status === 'not_installed') {
    return { ok: false, service: name, status: 'not_installed', error: 'Not installed on this VPS' };
  }

  const action = status === 'running' ? 'stop' : 'start';
  await execPromise(`sc ${action} "${entry.serviceName}" 2>nul`);
  return { ok: true, service: name, status: action === 'start' ? 'starting' : 'stopping' };
}
