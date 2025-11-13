import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface DocumentViewerProps {
  document: {
    id: string;
    name: string;
    fileName: string;
    mimeType: string;
    filePath?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  if (!document) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
    }
  };

  const getFileUrl = () => {
    if (!document.filePath) return '';
    const fileName = document.filePath.split('/').pop() || '';
    return `/uploads/${fileName}`;
  };

  const renderContent = () => {
    const fileUrl = getFileUrl();
    
    if (document.mimeType.startsWith('image/')) {
      return (
        <img 
          src={fileUrl} 
          alt={document.name}
          className="w-full h-auto rounded-lg"
        />
      );
    } else if (document.mimeType === 'application/pdf') {
      return (
        <iframe 
          src={fileUrl}
          className="w-full h-[600px] rounded-lg"
          title={document.name}
        />
      );
    } else if (document.mimeType.startsWith('text/')) {
      return (
        <iframe 
          src={fileUrl}
          className="w-full h-[600px] rounded-lg"
          title={document.name}
        />
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Предварительный просмотр недоступен для этого типа файла
          </p>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Скачать файл
          </Button>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{document.name}</DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
