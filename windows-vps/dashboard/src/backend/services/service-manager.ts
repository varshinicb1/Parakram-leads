import { exec } from 'child_process';

function execPromise(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 10000 }, (err, stdout) => {
      resolve(err ? '' : stdout.trim());
    });
  });
}

export async function getServiceStatus(name: string): Promise<string> {
  const winName = serviceNames[name] || name;
  const out = await execPromise(`sc query "${winName}" 2>nul`);
  if (out.includes('RUNNING')) return 'running';
  if (out.includes('STOPPED')) return 'stopped';
  return 'unknown';
}

const serviceNames: Record<string, string> = {
  ssh: 'sshd',
  tun: 'cloudflared',
  neb: 'nebula',
  caddy: 'ParakramCaddy',
  restic: 'ParakramRestic',
  leads: 'ParakramLeads',
};

export async function toggleService(name: string): Promise<{ ok: boolean; service: string; status?: string }> {
  const winName = serviceNames[name] || name;
  const status = await getServiceStatus(name);
  const action = status === 'running' ? 'stop' : 'start';
  await execPromise(`sc ${action} "${winName}" 2>nul`);
  return { ok: true, service: name, status: action === 'start' ? 'starting' : 'stopping' };
}
