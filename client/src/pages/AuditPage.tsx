import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Filter } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export function AuditPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit'],
    queryFn: async () => {
      const response = await fetch('/api/audit?limit=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
  });

  const filteredLogs = auditLogs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.user?.fullName.toLowerCase().includes(query) ||
      log.user?.username.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.resource.toLowerCase().includes(query) ||
      log.resourceId?.toLowerCase().includes(query)
    );
  });

  const getActionText = (action: string, resource: string) => {
    const actions: Record<string, string> = {
      create: 'создал',
      read: 'просмотрел',
      update: 'обновил',
      delete: 'удалил',
      upload: 'загрузил',
      download: 'скачал',
      login: 'вошел в систему',
      logout: 'вышел из системы',
    };
    const resources: Record<string, string> = {
      document: 'документ',
      object: 'объект',
      user: 'пользователя',
      auth: 'систему',
    };
    return `${actions[action] || action} ${resources[resource] || resource}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Журнал аудита</h1>
          <p className="text-muted-foreground">Детальный журнал всех действий в системе</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-filter">
            <Filter className="mr-2 h-4 w-4" />
            Фильтры
          </Button>
          <Button data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск в журнале..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-audit"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {searchQuery ? 'Записи не найдены' : 'Нет записей в журнале'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-md border hover-elevate"
                  data-testid={`log-${log.id}`}
                >
                  <div className="relative">
                    <div
                      className="absolute left-1/2 top-8 bottom-0 w-px bg-border"
                      style={{ display: index === filteredLogs.length - 1 ? 'none' : 'block' }}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {log.user?.fullName
                          ? log.user.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                          : 'S'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {log.user?.fullName || log.user?.username || 'Система'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getActionText(log.action, log.resource)}
                        </p>
                        {log.resourceId && (
                          <p className="text-sm font-mono mt-1">{log.resourceId}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant={log.success ? "default" : "destructive"}>
                          {log.success ? "Успешно" : "Ошибка"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
