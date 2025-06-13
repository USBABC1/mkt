// server/multer.config.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export function setupMulter(uploadsPath: string) {
  const UPLOADS_DIR_NAME = path.basename(uploadsPath);
  
  // Define os diretórios específicos para cada tipo de upload
  const LP_ASSETS_DIR = path.join(uploadsPath, 'lp-assets');
  const CREATIVES_ASSETS_DIR = path.join(uploadsPath, 'creatives-assets');
  const MCP_ATTACHMENTS_DIR = path.join(uploadsPath, 'mcp-attachments');

  // Garante que os diretórios existam
  [LP_ASSETS_DIR, CREATIVES_ASSETS_DIR, MCP_ATTACHMENTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Configuração do Multer para criativos
  const creativesUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, CREATIVES_ASSETS_DIR),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 15 * 1024 * 1024 } // Limite de 15MB
  });

  // Configuração do Multer para assets de Landing Page (GrapesJS)
  const lpAssetUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, LP_ASSETS_DIR),
      filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_').toLowerCase())
    }),
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
  });

  // Configuração do Multer para anexos do MCP (Ubie)
  const mcpAttachmentUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, MCP_ATTACHMENTS_DIR),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'mcp-attachment-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
  });

  return {
    creativesUpload,
    lpAssetUpload,
    mcpAttachmentUpload
  };
}
