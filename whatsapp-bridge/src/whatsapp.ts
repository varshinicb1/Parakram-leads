import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import http from 'http';

export class WhatsAppClient {
  private sock: WASocket | null = null;
  private _lastQR: string | null = null;
  private _isConnected = false;
  private _phoneNumber: string | null = null;
  private readonly dataDir: string;
  private readonly webhookUrl: string;

  constructor(dataDir: string, webhookUrl: string) {
    this.dataDir = path.join(dataDir, 'baileys-auth');
    this.webhookUrl = webhookUrl;
  }

  get lastQR(): string | null {
    return this._lastQR;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get phoneNumber(): string | null {
    return this._phoneNumber;
  }

  async initialize(): Promise<void> {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.dataDir);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      syncFullHistory: false,
      emitOwnEvents: false,
      browser: ['Sigma Lead Intel', 'Chrome', '1.0'],
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this._lastQR = qr;
        console.log('QR updated. Scan with WhatsApp > Linked Devices');
      }

      if (connection === 'open') {
        this._isConnected = true;
        this._lastQR = null;
        this._phoneNumber = this.sock?.user?.id?.split(':')[0] || null;
        console.log(`WhatsApp connected as ${this._phoneNumber}`);
      }

      if (connection === 'close') {
        this._isConnected = false;
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`WhatsApp disconnected. Reconnect: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => this.initialize(), 5000);
        }
      }
    });

    this.sock.ev.on('messages.upsert', async (m) => {
      for (const msg of m.messages) {
        await this.handleIncoming(msg);
      }
    });
  }

  async sendMessage(jid: string, text: string): Promise<proto.WebMessageInfo | undefined> {
    if (!this.sock || !this._isConnected) {
      throw new Error('WhatsApp not connected');
    }
    return await this.sock.sendMessage(jid, { text });
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
    this.sock?.end(undefined);
    this.sock = null;
  }

  private async handleIncoming(msg: proto.IWebMessageInfo): Promise<void> {
    const key = msg.key;
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const from = key.remoteJid;
    const isGroup = from?.includes('@g.us');
    const isFromMe = key.fromMe;

    if (isFromMe || !body || !from || isGroup) return;

    const payload = JSON.stringify({
      from: from.replace('@s.whatsapp.net', ''),
      message: body,
      message_id: key.id,
      timestamp: msg.messageTimestamp,
    });

    try {
      const url = new URL(this.webhookUrl);
      const client = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`Inbound message from ${from} forwarded to backend`);
            } else {
              console.error(`Webhook returned ${res.statusCode}: ${data}`);
            }
          });
        }
      );
      client.on('error', (err) => console.error('Webhook error:', err.message));
      client.write(payload);
      client.end();
    } catch (err) {
      console.error('Failed to forward inbound message:', err);
    }
  }
}
