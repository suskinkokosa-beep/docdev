import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, QrCode, Search, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ObjectFormDialog } from "@/components/ObjectFormDialog";
import { QRCodeDialog } from "@/components/QRCodeDialog";

interface Object {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  umgId: string;
  location?: string;
}

export function ObjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState<Object | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrObject, setQrObject] = useState<Object | null>(null);

  const { data: objects = [], isLoading } = useQuery<Object[]>({
    queryKey: ['/api/objects'],
    queryFn: async () => {
      const response = await fetch('/api/objects', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch objects');
      return response.json();
    },
  });

  const filteredObjects = objects.filter((obj) => {
    const query = searchQuery.toLowerCase();
    return (
      obj.code.toLowerCase().includes(query) ||
      obj.name.toLowerCase().includes(query) ||
      obj.type.toLowerCase().includes(query) ||
      obj.location?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Активен</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">На обслуживании</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Неактивен</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Объекты</h1>
          <p className="text-muted-foreground">Управление объектами газопроводов</p>
        </div>
        <Button 
          data-testid="button-add-object"
          onClick={() => {
            setSelectedObject(undefined);
            setDialogMode("create");
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить объект
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск объектов..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-objects"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Местоположение</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'Объекты не найдены' : 'Нет объектов'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredObjects.map((obj) => (
                    <TableRow key={obj.id} data-testid={`row-object-${obj.id}`}>
                      <TableCell className="font-mono text-sm">{obj.code}</TableCell>
                      <TableCell className="font-medium">{obj.name}</TableCell>
                      <TableCell>{obj.type}</TableCell>
                      <TableCell>{obj.location || '-'}</TableCell>
                      <TableCell>{getStatusBadge(obj.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            data-testid={`button-qr-${obj.id}`}
                            onClick={() => {
                              setQrObject(obj);
                              setQrDialogOpen(true);
                            }}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            data-testid={`button-download-${obj.id}`}
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `/api/objects/${obj.id}/export`;
                              link.download = `object-${obj.code}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ObjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        object={selectedObject}
        mode={dialogMode}
      />

      {qrObject && (
        <QRCodeDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          objectCode={qrObject.code}
          objectName={qrObject.name}
        />
      )}
    </div>
  );
}
