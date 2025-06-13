// server/services/google-drive.service.ts
import { google } from 'googleapis';
import { GOOGLE_API_KEY } from '../config';

// Define a interface para os arquivos que retornaremos
export interface GoogleDriveFile {
  id: string;
  name: string;
  thumbnailLink?: string; // Link para a miniatura gerada pelo Google
  webViewLink?: string; // Link para visualizar o arquivo no Google Drive
  webContentLink?: string; // Link para download direto do arquivo
  iconLink?: string; // Link para o ícone do tipo de arquivo
}

class GoogleDriveService {
  private drive;

  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('[GoogleDriveService] API Key do Google não fornecida. O serviço não funcionará.');
      this.drive = null;
      return;
    }
    this.drive = google.drive({
      version: 'v3',
      auth: apiKey
    });
  }

  /**
   * Lista os arquivos de uma pasta pública do Google Drive.
   * A pasta DEVE estar compartilhada com "Qualquer pessoa com o link".
   * @param folderId O ID da pasta do Google Drive.
   * @returns Uma lista de arquivos com seus metadados.
   */
  async listFilesFromFolder(folderId: string): Promise<GoogleDriveFile[]> {
    if (!this.drive) {
      throw new Error('Serviço do Google Drive não inicializado. Verifique a API Key.');
    }
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`, // Busca arquivos nesta pasta, que não estejam na lixeira
        fields: 'files(id, name, thumbnailLink, webViewLink, webContentLink, iconLink)', // Campos que queremos receber
        pageSize: 200, // Limite de 200 arquivos por pasta
      });

      if (!response.data.files) {
        return [];
      }

      return response.data.files as GoogleDriveFile[];
    } catch (error: any) {
      console.error(`[GoogleDriveService] Erro ao buscar arquivos da pasta ${folderId}:`, error.message);
      if (error.code === 404) {
          throw new Error('Pasta não encontrada. Verifique o ID e as permissões de compartilhamento.');
      }
      if (error.code === 403) {
          throw new Error('Acesso negado. A pasta precisa ser compartilhada publicamente ("Qualquer pessoa com o link").');
      }
      throw new Error('Falha ao comunicar com a API do Google Drive.');
    }
  }
}

// Exporta uma instância única do serviço
export const googleDriveService = new GoogleDriveService(GOOGLE_API_KEY);
