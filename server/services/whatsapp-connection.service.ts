// server/services/whatsapp-connection.service.ts

import baileys, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  Browsers,
  WAMessage,
  WASocket,
  isJidBroadcast,
  proto
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { storage } from '../storage';
import { processIncomingMessage } from '../flow-executor';

const makeWASocket = baileys.default;

const SESSIONS_DIR = path.join(process.cwd(), 'server', 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

const logger = pino({ level: 'debug' }).child({ class: 'WhatsappConnectionService' });

export interface WhatsappConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_code_needed' | 'auth_failure' | 'error' | 'disconnected_logged_out';
  qrCode: string | null;
  connectedPhoneNumber?: string;
  lastError?: string;
  userId: number;
}

const activeConnections = new Map<number, { sock: WASocket | null; statusDetails: WhatsappConnectionStatus }>();

export class WhatsappConnectionService {
  private userId: number;
  private userSessionDir: string;
  private sock: WASocket | null = null;

  constructor(userId: number) {
    this.userId = userId;
    this.userSessionDir = path.join(SESSIONS_DIR, `user_${this.userId}`);
    if (!activeConnections.has(userId)) {
        activeConnections.set(userId, { sock: null, statusDetails: { userId: this.userId, status: 'disconnected', qrCode: null } });
    }
  }

  private updateGlobalStatus(partialUpdate: Partial<WhatsappConnectionStatus>) {
    const existingEntry = activeConnections.get(this.userId) || { sock: this.sock, statusDetails: {} as any };
    const newStatus = { ...existingEntry.statusDetails, ...partialUpdate, userId: this.userId };
    activeConnections.set(this.userId, { sock: this.sock, statusDetails: newStatus });
    logger.info({ userId: this.userId, newStatus: newStatus.status, hasQR: !!newStatus.qrCode }, 'Global connection status updated');
  }

  public async connectToWhatsApp(): Promise<void> {
    const existingConnection = activeConnections.get(this.userId);
    if (existingConnection?.sock) {
        logger.warn({ userId: this.userId }, 'Tentativa de conectar com socket já existente.');
        return;
    }
    
    logger.info({ userId: this.userId }, 'Iniciando conexão com o WhatsApp...');
    this.updateGlobalStatus({ status: 'connecting', qrCode: null, lastError: undefined });

    try {
        if (!fs.existsSync(this.userSessionDir)) {
            fs.mkdirSync(this.userSessionDir, { recursive: true });
        }
        
        const authInfoPath = path.join(this.userSessionDir, 'auth_info_baileys');
        const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);
        const { version } = await fetchLatestBaileysVersion();
        
        this.sock = makeWASocket({
          version,
          logger: pino({ level: 'warn' }),
          printQRInTerminal: false,
          auth: state,
          browser: Browsers.ubuntu('Chrome'),
          generateHighQualityLinkPreview: true,
        });
        
        activeConnections.set(this.userId, { 
            sock: this.sock, 
            statusDetails: activeConnections.get(this.userId)!.statusDetails 
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update) => {
          const { connection, lastDisconnect, qr } = update;
          
          if (qr) {
            try {
              const qrDataURL = await QRCode.toDataURL(qr);
              this.updateGlobalStatus({ status: 'qr_code_needed', qrCode: qrDataURL });
            } catch (qrError) {
              this.updateGlobalStatus({ status: 'qr_code_needed', qrCode: qr });
            }
          }
          
          if (connection === 'close') {
            this.handleConnectionClose(lastDisconnect);
          } else if (connection === 'open') {
            this.handleConnectionOpen();
          } else if (connection === 'connecting') {
            this.updateGlobalStatus({ status: 'connecting' });
          }
        });

        this.sock.ev.on('messages.upsert', async (m) => {
          const msg = m.messages[0];
          
          if (!msg.message || msg.key.fromMe || isJidBroadcast(msg.key.remoteJid || '')) {
            return;
          }

          const contactJid = msg.key.remoteJid!;
          
          // ✅ CORREÇÃO: Passando o objeto de mensagem completo para o motor de fluxo
          await processIncomingMessage(this.userId, contactJid, msg, this);
        });

    } catch (error: any) {
        logger.error({ userId: this.userId, error: error.message, stack: error.stack }, "Falha crítica ao inicializar o WhatsApp.");
        this.updateGlobalStatus({ status: 'error', lastError: `Falha na inicialização: ${error.message}` });
        this.cleanup();
    }
  }

  private handleConnectionClose(lastDisconnect: any) {
    const boomError = lastDisconnect?.error as Boom | undefined;
    const statusCode = boomError?.output?.statusCode;
    
    logger.warn({ userId: this.userId, statusCode, error: boomError?.message }, `Conexão fechada.`);
    
    if (statusCode === DisconnectReason.loggedOut) {
        logger.info(`[User ${this.userId}] Usuário deslogado. Limpando sessão.`);
        this.cleanSessionFiles();
        this.updateGlobalStatus({ status: 'disconnected_logged_out', qrCode: null });
    } else if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
        logger.info(`[User ${this.userId}] Reinicialização necessária (StatusCode: ${statusCode}). Tentando reconectar...`);
        this.updateGlobalStatus({ status: 'connecting', qrCode: null });
        this.cleanup();
        setTimeout(() => this.connectToWhatsApp(), 5000);
        return;
    } else {
        const errorMessage = boomError?.message || 'Conexão perdida';
        this.updateGlobalStatus({ status: 'error', lastError: errorMessage });
    }
    
    this.cleanup();
  }

  private handleConnectionOpen() {
    const phone = this.sock?.user?.id?.split(':')[0];
    logger.info(`[User ${this.userId}] Conexão aberta com sucesso para: ${phone}`);
    this.updateGlobalStatus({ status: 'connected', qrCode: null, connectedPhoneNumber: phone, lastError: undefined });
  }

  private cleanup() {
    const currentStatus = activeConnections.get(this.userId)?.statusDetails;
    this.sock = null;
    if (currentStatus) {
        activeConnections.set(this.userId, { sock: null, statusDetails: currentStatus });
    }
  }

  private cleanSessionFiles() {
    try {
        if (fs.existsSync(this.userSessionDir)) {
          fs.rmSync(this.userSessionDir, { recursive: true, force: true });
        }
    } catch (error: any) {
        logger.error({ userId: this.userId, error: error.message }, "Erro ao limpar arquivos de sessão.");
    }
  }

  public async disconnectWhatsApp(): Promise<void> {
    const connection = activeConnections.get(this.userId);
    if (connection?.sock) {
      await connection.sock.logout();
    } else {
      this.cleanSessionFiles();
      this.updateGlobalStatus({ status: 'disconnected', qrCode: null });
    }
  }

  public static getStatus(userId: number): WhatsappConnectionStatus {
    return activeConnections.get(userId)?.statusDetails || { userId, status: 'disconnected', qrCode: null };
  }
  
  public async sendMessage(jid: string, messagePayload: any) {
    const connection = activeConnections.get(this.userId);
    if (!connection?.sock || connection.statusDetails.status !== 'connected') {
        throw new Error('WhatsApp não conectado.');
    }
    return await connection.sock.sendMessage(jid, messagePayload);
  }
}
