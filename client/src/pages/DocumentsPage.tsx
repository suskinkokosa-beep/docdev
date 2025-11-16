import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Search, FileText, Eye, Download, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DocumentUploadDialog } from "@/components/DocumentUploadDialog";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  code: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  categoryId: string;
  updatedAt: string;
  filePath?: string;
  category?: { name: string };
}

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const { canUpload, canDelete } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const response = await fetch('/api/documents', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
  });

  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.code.toLowerCase().includes(query) ||
      doc.name.toLowerCase().includes(query) ||
      doc.fileName.toLowerCase().includes(query)
    );
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Не удалось удалить документ');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: 'Успешно',
        description: 'Документ удален',
      });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeleteClick = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Документы</h1>
          <p className="text-muted-foreground">Централизованное хранилище документации</p>
        </div>
        {canUpload('documents') && (
          <Button 
            data-testid="button-upload-document"
            onClick={() => setDialogOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Загрузить документ
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск документов..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-documents"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {searchQuery ? 'Документы не найдены' : 'Нет документов'}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="hover-elevate cursor-pointer" data-testid={`card-doc-${doc.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <FileText className="h-10 w-10 text-primary" />
                      <Badge variant="secondary">{doc.category?.name || 'Без категории'}</Badge>
                    </div>
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2">{doc.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{formatFileSize(doc.fileSize)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1" 
                        data-testid={`button-view-${doc.id}`}
                        onClick={() => {
                          setSelectedDocument(doc);
                          setViewerOpen(true);
                        }}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Просмотр
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        data-testid={`button-download-${doc.id}`}
                        onClick={() => {
                          window.open(`/api/documents/${doc.id}/download`, '_blank');
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      {canDelete('documents') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-delete-${doc.id}`}
                          onClick={(e) => handleDeleteClick(doc, e)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <DocumentViewer
        document={selectedDocument}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить документ "{documentToDelete?.name}"? 
              Это действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
