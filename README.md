# Parakram VPS

Turn any Windows laptop into a production-ready VPS with one-click installation.

## Overview

Parakram VPS transforms Windows machines into secure, accessible virtual servers using:
- OpenSSH Server for remote shell access
- Cloudflare Tunnel for public HTTPS URLs (zero open firewall ports)
- Web-based Management Dashboard for real-time monitoring
- Auto-start Configuration for persistence across reboots
- Integrated Subscription & Payment System via Razorpay

## Features

- **Zero-Configuration Public Access**: Access your Windows machine via SSH and HTTPS from anywhere
- **Military-Grade Security**: All traffic encrypted, zero inbound firewall rules required
- **Real-Time Dashboard**: CPU, memory, disk, uptime, and service status monitoring
- **One-Click Installation**: Automated setup of all components via signed Windows EXE
- **Subscription Management**: Tiered plans (Free/Edge/Fleet) with Razorpay integration (UPI, cards)
- **Apple-Style UX**: Black, white, and metallic gold themed installer with guided setup
- **Persistent Operation**: Runs as Windows service, survives reboots and updates

## Quick Start

1. Download `ParakramVPS-Setup.exe` from the [releases page](https://github.com/your-org/parakram-leads/releases)
2. Run the executable as Administrator
3. Follow the guided setup wizard:
   - Create account (email/password or Google Sign-In)
   - Configure tunnel name and optional Cloudflare API token
   - Select subscription plan (Free/Edge/Fleet)
   - Wait for installation to complete
4. Access your VPS:
   - Dashboard: http://localhost:9876
   - SSH: ssh username@localhost
   - Public URL: https://your-tunnel-name.getparakram.in (after Cloudflare setup)

## Architecture

```
Windows Laptop
    │
    ├── OpenSSH Server  ← Remote shell (ssh user@tunnel-url)
    ├── Cloudflare Tunnel ← Public *.getparakram.in URL, zero open ports
    ├── Web Dashboard   ← CPU/Memory/Disk monitoring + service controls
    └── Auto-start on boot  ← Windows service + startup shortcut
```

## Subscription Plans

| Tier | Price/Month | Features |
|------|-------------|----------|
| **Free** | $0 | 1 VPS tunnel, basic dashboard, manual tunnel setup |
| **Edge** | $9 | 5 VPS, custom domain, auto-tunnel setup, priority support |
| **Fleet** | $49 | Unlimited VPS, API access, team management, SLA |

## Technology Stack

- **Installer**: Python/customtkinter (Black/white/gold themed EXE)
- **Core Logic**: Python 3.11+
- **Dashboard Server**: PowerShell HttpListener
- **Web Dashboard**: HTML5/CSS3/Vanilla JS
- **Subscription System**: Razorpay API (UPI, credit/debit cards, netbanking)
- **Cloudflare Integration**: REST API + Tunnel
- **Security**: TLS 1.3+
- **Persistence**: Windows Task Scheduler (runs as SYSTEM at boot)

## Getting Started with Development

### Prerequisites
- Python 3.11+
- Node.js 18+
- Windows 10/11 (for building the installer)

### Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd frontend
npm install
```

### Windows Installer Setup
```bash
cd windows-vps/installer
pip install -r requirements.txt
```

## Building the Installer EXE

To build the Windows installer executable:

```bash
cd windows-vps/installer
python build.py
```

This will create `dist/ParakramVPS-Setup.exe`.

## License

MIT License

## Contact

For support or inquiries, please contact:
- Email: cbvarshini1@gmail.com
- WhatsApp: +91 7259426670 (automatic notifications on new signups)

---

*Part of the Parakram Suite - Autonomous lead discovery, AI-powered scoring, and multi-channel outreach — unified in one premium platform.*