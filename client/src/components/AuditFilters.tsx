import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

export interface AuditFilters {
  action?: string;
  resource?: string;
  userId?: string;
  success?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AuditFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AuditFilters;
  onApplyFilters: (filters: AuditFilters) => void;
  users: Array<{ id: string; username: string; fullName: string }>;
}

const ACTION_OPTIONS = [
  { value: "all", label: "Все действия" },
  { value: "create", label: "Создание" },
  { value: "read", label: "Просмотр" },
  { value: "update", label: "Обновление" },
  { value: "delete", label: "Удаление" },
  { value: "upload", label: "Загрузка" },
  { value: "download", label: "Скачивание" },
  { value: "login", label: "Вход в систему" },
  { value: "logout", label: "Выход из системы" },
];

const RESOURCE_OPTIONS = [
  { value: "all", label: "Все ресурсы" },
  { value: "document", label: "Документ" },
  { value: "object", label: "Объект" },
  { value: "user", label: "Пользователь" },
  { value: "auth", label: "Авторизация" },
  { value: "password", label: "Пароль" },
];

export function AuditFiltersPanel({ isOpen, onClose, filters, onApplyFilters, users }: AuditFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AuditFilters>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const emptyFilters: AuditFilters = {};
    setLocalFilters(emptyFilters);
    onApplyFilters(emptyFilters);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Фильтры</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="action">Действие</Label>
            <Select
              value={localFilters.action || "all"}
              onValueChange={(value) => setLocalFilters({ ...localFilters, action: value === "all" ? undefined : value })}
            >
              <SelectTrigger id="action">
                <SelectValue placeholder="Выберите действие" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="resource">Ресурс</Label>
            <Select
              value={localFilters.resource || "all"}
              onValueChange={(value) => setLocalFilters({ ...localFilters, resource: value === "all" ? undefined : value })}
            >
              <SelectTrigger id="resource">
                <SelectValue placeholder="Выберите ресурс" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="user">Пользователь</Label>
            <Select
              value={localFilters.userId || "all"}
              onValueChange={(value) => setLocalFilters({ ...localFilters, userId: value === "all" ? undefined : value })}
            >
              <SelectTrigger id="user">
                <SelectValue placeholder="Все пользователи" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName || user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="success">Статус</Label>
            <Select
              value={localFilters.success || "all"}
              onValueChange={(value) => setLocalFilters({ ...localFilters, success: value === "all" ? undefined : value })}
            >
              <SelectTrigger id="success">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="true">Успешно</SelectItem>
                <SelectItem value="false">Ошибка</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dateFrom">Дата от</Label>
            <Input
              id="dateFrom"
              type="date"
              value={localFilters.dateFrom || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="dateTo">Дата до</Label>
            <Input
              id="dateTo"
              type="date"
              value={localFilters.dateTo || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value })}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={handleReset}>
            Сбросить
          </Button>
          <Button onClick={handleApply}>Применить</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
