import React, { useEffect, useRef } from 'react';
import GrapesJSStudioSDK from '@grapesjs/studio-sdk'; // Importação padrão
import '@grapesjs/studio-sdk/dist/style.css';

interface StudioEditorProps {
  publicKey: string;
  pageId?: string;
  onSave?: (data: any) => void;
  onLoad?: (data: any) => void;
  onError?: (error: any) => void;
}

// Precisamos saber o tipo da instância do Studio para o useRef
// Se o SDK fornecer tipos, use-os. Caso contrário, 'any' temporariamente.
// Exemplo: import { StudioInstanceType } from '@grapesjs/studio-sdk/types';
type StudioInstance = any; 

const StudioEditor: React.FC<StudioEditorProps> = ({ 
  publicKey, 
  pageId, 
  onSave,
  onLoad,
  onError
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const studioInstanceRef = useRef<StudioInstance | null>(null);

  useEffect(() => {
    if (editorRef.current && !studioInstanceRef.current && publicKey) {
      let currentStudioInstance: StudioInstance | null = null;
      try {
        currentStudioInstance = new (GrapesJSStudioSDK as any)({ // Usando a importação padrão
          publicKey: publicKey,
          container: editorRef.current,
          editor: {
            height: '100%', 
            width: 'auto',
          },
          onLoad: (data: any) => {
            if (onLoad) onLoad(data);
          },
          onSave: (data: any) => {
            if (onSave) onSave(data);
          },
          onError: (error: any) => {
            if (onError) onError(error);
          }
        });

        if (pageId) {
          currentStudioInstance.load({ id: pageId })
            .catch((err: any) => {
              if (onError) onError(err);
              console.error("Studio SDK: Error loading project", err);
            });
        } else {
          currentStudioInstance.create(); 
        }
        
        studioInstanceRef.current = currentStudioInstance;

      } catch (error) {
        console.error("Failed to initialize GrapesJS Studio SDK:", error);
        if (onError) onError(error);
      }
    }

    return () => {
      if (studioInstanceRef.current) {
        studioInstanceRef.current.destroy();
        studioInstanceRef.current = null;
      }
    };
  }, [publicKey, pageId, onSave, onLoad, onError]);

  return <div ref={editorRef} style={{ height: '100%', width: '100%' }} />;
};

export default StudioEditor;
