# Agent System Audit

Date: 2026-07-10
Machine root audited: `C:\Users\varsh\OneDrive\Documents\Varsh-PC`

## Summary

This laptop already has most full-stack development runtimes installed, but the environment is not agent-ready because persistent PATH is noisy and ambiguous:

- User PATH contains a near-duplicate copy of Machine PATH.
- PATH has stale entries, including `C:\Program Files (x86)\Common Files\Oracle\Java\javapath`, Intel FPGA paths, Strawberry Perl paths, `C:\Program Files\curl\bin`, `C:\Program Files\cursor\resources\app\bin`, `C:\Users\varsh\AppData\Local\Muse Hub\lib`, and a corrupt/truncated `C:\Users\varsh\AppDa`.
- Multiple Python versions are installed and `python` currently resolves to Python 3.14.
- Multiple Java paths are present; `JAVA_HOME` and `java` currently resolve to Zulu JDK 17.
- Node is managed through nvm-windows and resolves to Node 22.19.0 at `C:\nvm4w\nodejs`.
- Google Cloud SDK and PostgreSQL client tools are installed but were not reachable from PATH before the agent bootstrap.
- Docker CLI is installed, but Docker Desktop/WSL backend was stopped during audit.
- Only one main drive is present, with about 45 GB free on C:.

Update: User PATH was permanently cleaned and rewritten on 2026-07-10. The new HKCU PATH keeps user-level CLI directories and removes the copied Machine PATH block from User PATH.

## Reachable Tools

Core tools found:

- Git 2.52.0 at `C:\Program Files\Git\cmd\git.exe`
- GitHub CLI 2.81.0 at `C:\Program Files\GitHub CLI\gh.exe`
- Node 22.19.0 via nvm-windows at `C:\nvm4w\nodejs\node.exe`
- npm 10.9.3, pnpm 10.33.4, Yarn 1.22.22
- Deno 2.9.2
- Python 3.14.3 via `python`; Python launcher sees 3.14, 3.13, 3.12, 3.11, 3.10
- uv 0.6.14
- .NET SDK 9.0.315
- Zulu OpenJDK 17.0.18
- Go 1.24.3
- Rust 1.96.0
- Docker CLI 29.1.2 and Docker Compose 2.40.3
- Flutter 3.44.4 and Dart 3.12.2
- Vercel CLI 54.14.0
- Supabase CLI 2.109.1
- Firebase CLI 15.15.0
- SQL Server `sqlcmd`
- VS Code CLI
- winget and Chocolatey
- CMake, ffmpeg, ImageMagick, Ollama

## Missing Or Not Reachable

Not found on PATH during audit:

- `bun`
- `mvn`
- `gradle`
- `helm`
- `az`
- `aws`
- `wrangler`
- `mysql`
- `mongosh`
- `redis-cli`
- `cursor`
- `make`
- `gcc`
- `clang`

Installed but not on PATH before bootstrap:

- `gcloud`: `C:\Users\varsh\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin`
- `psql`: `C:\Program Files\PostgreSQL\18\bin`

## Bootstrap

Use this in a PowerShell session:

```powershell
. "C:\Users\varsh\OneDrive\Documents\Varsh-PC\.codex-agent\agent-env.ps1"
agent-env-check
```

The bootstrap only changes the current shell process. It does not edit the registry PATH and does not delete any SDK folders.

This bootstrap has been wired into both current-user profiles:

- `C:\Users\varsh\OneDrive\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`
- `C:\Users\varsh\OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`

A backup of the previous PowerShell 7 profile was saved at:

- `C:\Users\varsh\OneDrive\Documents\PowerShell\Microsoft.PowerShell_profile.ps1.bak-agent-20260710`

The previous User PATH was backed up at:

- `C:\Users\varsh\OneDrive\Documents\Varsh-PC\.codex-agent\user-path-before-permanent-20260710.txt`

## Permanent User PATH

The permanent User PATH now includes:

- `C:\nvm4w\nodejs` for Node/npm global shims including Firebase, Supabase, and Vercel
- `C:\Users\varsh\AppData\Roaming\npm`
- `C:\Users\varsh\AppData\Local\Programs\Ollama`
- `C:\Users\varsh\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin`
- `C:\Program Files\PostgreSQL\18\bin`
- `C:\Users\varsh\.deno\bin`
- `C:\Users\varsh\.cargo\bin`
- `C:\Users\varsh\.dotnet\tools`
- `C:\tools\flutter\bin`
- `C:\Users\varsh\AppData\Local\Pub\Cache\bin`
- `C:\Users\varsh\AppData\Local\Programs\Microsoft VS Code\bin`
- `C:\Users\varsh\AppData\Local\Microsoft\WinGet\Links`
- `C:\Users\varsh\AppData\Local\Programs\Python\Python312`
- `C:\Users\varsh\AppData\Local\Programs\Python\Python312\Scripts`
- Hermes, Oh My Posh, Warp, Antigravity, `C:\Users\varsh\tools`, and `C:\tools`

## Recommended Next Steps

1. Clean User PATH persistently by removing broken entries and duplicate Machine PATH entries.
2. Decide whether the global `python` outside agent sessions should stay on 3.14 or move to 3.12. For broad package compatibility, 3.12 is safer; 3.14 is newer.
3. Start Docker Desktop before agent work that needs containers or local databases.
4. Install or expose missing storage tools based on actual use:
   - PostgreSQL: already fixed by bootstrap via PostgreSQL 18 client path.
   - MongoDB: install MongoDB Shell if needed.
   - Redis: prefer Docker for Redis unless a native Windows client is required.
   - MySQL: install MySQL client only if projects need it.
5. Install cloud CLIs only if needed:
   - Google Cloud SDK is installed and fixed by bootstrap.
   - AWS CLI and Azure CLI are not currently reachable.
