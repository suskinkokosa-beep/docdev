import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as XLSX from 'xlsx';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [wordContent, setWordContent] = useState<string>('');
  const [excelContent, setExcelContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const wordContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document && isOpen) {
      setPageNumber(1);
      setScale(1.0);
      setWordContent('');
      setExcelContent('');
      setError('');
      loadDocument();
    }
  }, [document, isOpen]);

  const loadDocument = async () => {
    if (!document) return;

    const mimeType = document.mimeType;
    const isLegacyDoc = mimeType === 'application/msword' || document.fileName.endsWith('.doc');
    const isModernDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      || document.fileName.endsWith('.docx');
    
    const isLegacyXls = mimeType === 'application/vnd.ms-excel' || document.fileName.endsWith('.xls');
    const isModernXlsx = mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || document.fileName.endsWith('.xlsx');

    if (isLegacyDoc) {
      setError('legacy_doc');
      return;
    }

    if (isModernDocx) {
      await loadWordDocument();
    } else if (isLegacyXls || isModernXlsx) {
      await loadExcelDocument();
    }
  };

  const loadWordDocument = async () => {
    if (!document || !wordContainerRef.current) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      const blob = await response.blob();
      
      wordContainerRef.current.innerHTML = '';
      
      const { renderAsync } = await import('docx-preview');
      await renderAsync(blob, wordContainerRef.current);
      
      setWordContent('rendered');
    } catch (err) {
      console.error('Ошибка при загрузке Word документа:', err);
      setError('Не удалось загрузить документ. Попробуйте скачать файл.');
    } finally {
      setLoading(false);
    }
  };

  const loadExcelDocument = async () => {
    if (!document) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/documents/${document.id}/download`);
      const arrayBuffer = await response.arrayBuffer();
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let htmlContent = '';
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const htmlTable = XLSX.utils.sheet_to_html(worksheet, { 
          header: '',
          footer: ''
        });
        
        htmlContent += `
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-3 bg-gray-100 dark:bg-gray-800 p-2 rounded">${sheetName}</h3>
            <div class="overflow-x-auto">
              ${htmlTable}
            </div>
          </div>
        `;
      });
      
      setExcelContent(htmlContent);
    } catch (err) {
      console.error('Ошибка при загрузке Excel документа:', err);
      setError('Не удалось загрузить Excel документ');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    
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
    if (!document?.filePath) return '';
    const fileName = document.filePath.split('/').pop() || '';
    return `/uploads/${fileName}`;
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.2, 0.5));

  const renderContent = () => {
    if (!document) return null;

    const fileUrl = getFileUrl();
    const mimeType = document.mimeType;
    
    const isWordDocument = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      || mimeType === 'application/msword'
      || document.fileName.endsWith('.docx')
      || document.fileName.endsWith('.doc');
    
    const isExcelDocument = mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || mimeType === 'application/vnd.ms-excel'
      || document.fileName.endsWith('.xlsx')
      || document.fileName.endsWith('.xls');

    if (loading && !isWordDocument && !isExcelDocument) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      if (error === 'legacy_doc') {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-amber-800 dark:text-amber-200 font-semibold mb-2">
                Формат .doc не поддерживается для онлайн просмотра
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                Устаревший формат Microsoft Word (.doc) требует скачивания файла. 
                Современные документы .docx можно просматривать онлайн.
              </p>
            </div>
            <Button onClick={handleDownload} size="lg">
              <Download className="mr-2 h-5 w-5" />
              Скачать файл для просмотра
            </Button>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Скачать файл
          </Button>
        </div>
      );
    }

    if (isWordDocument) {
      return (
        <div className="prose max-w-none dark:prose-invert relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
          <div 
            ref={wordContainerRef}
            className="word-document-content p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            style={{
              minHeight: '600px',
              maxHeight: '70vh',
              overflow: 'auto'
            }}
          />
        </div>
      );
    }

    if (isExcelDocument && excelContent) {
      return (
        <div className="excel-document-content">
          <style>{`
            .excel-document-content table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1rem;
            }
            .excel-document-content td, .excel-document-content th {
              border: 1px solid #e5e7eb;
              padding: 0.5rem;
              text-align: left;
            }
            .dark .excel-document-content td, .dark .excel-document-content th {
              border-color: #374151;
            }
            .excel-document-content th {
              background-color: #f3f4f6;
              font-weight: 600;
            }
            .dark .excel-document-content th {
              background-color: #1f2937;
            }
          `}</style>
          <div 
            className="p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            dangerouslySetInnerHTML={{ __html: excelContent }}
            style={{
              minHeight: '600px',
              maxHeight: '70vh',
              overflow: 'auto'
            }}
          />
        </div>
      );
    }

    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <img 
            src={fileUrl} 
            alt={document.name}
            className="max-w-full h-auto rounded-lg"
            style={{ maxHeight: '70vh' }}
          />
        </div>
      );
    }

    if (mimeType === 'application/pdf') {
      return (
        <div className="pdf-viewer-container">
          <div className="flex justify-center items-center gap-4 mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <Button onClick={previousPage} disabled={pageNumber <= 1} size="sm" variant="outline">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Страница {pageNumber} из {numPages}
            </span>
            <Button onClick={nextPage} disabled={pageNumber >= numPages} size="sm" variant="outline">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-2"></div>
            <Button onClick={zoomOut} size="sm" variant="outline">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button onClick={zoomIn} size="sm" variant="outline">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center overflow-auto" style={{ maxHeight: '65vh' }}>
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              }
              error={
                <div className="text-red-500 p-4">
                  Ошибка при загрузке PDF. Попробуйте скачать файл.
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      );
    }

    if (mimeType.startsWith('text/')) {
      return (
        <iframe 
          src={fileUrl}
          className="w-full h-[600px] rounded-lg border border-gray-200 dark:border-gray-700"
          title={document.name}
        />
      );
    }

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
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{document.name}</DialogTitle>
            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={handleDownload} variant="outline" size="sm" title="Скачать">
                <Download className="h-4 w-4" />
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm" title="Закрыть">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4 overflow-auto flex-1">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
