import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, Check } from "lucide-react";

interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  username: string;
  fullName: string;
}

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualClose?: () => void;
  user: User;
}

export function UserPermissionsDialog({ open, onOpenChange, onActualClose, user }: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSelectedRoleId("");
    }
  }, [open, user.id]);

  const { data: userDetails, isLoading: loadingDetails } = useQuery({
    queryKey: [`/api/users/${user.id}/permissions`, user.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user.id}/permissions`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch user permissions');
      return response.json();
    },
    enabled: open,
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
    queryFn: async () => {
      const response = await fetch('/api/roles', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open || !userDetails || !roles.length) return;
    
    if (selectedRoleId === "") {
      if (userDetails.role) {
        setSelectedRoleId(userDetails.role.id);
      } else if (roles.length > 0) {
        setSelectedRoleId(roles[0].id);
      }
    }
  }, [userDetails, roles, open, selectedRoleId]);

  const updateRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обновления роли');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/permissions`] });
      toast({
        title: "Успешно",
        description: "Роль пользователя обновлена",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = (open: boolean) => {
    if (!open && !userDetails?.role && !selectedRoleId) {
      toast({
        title: "Невозможно закрыть",
        description: "Необходимо назначить роль пользователю перед закрытием",
        variant: "destructive",
      });
      onOpenChange(true);
      return;
    }
    onOpenChange(open);
    if (!open && onActualClose) {
      onActualClose();
    }
  };

  const handleSave = () => {
    if (!selectedRoleId) {
      toast({
        title: "Ошибка",
        description: "Необходимо выбрать роль",
        variant: "destructive",
      });
      return;
    }
    updateRoleMutation.mutate(selectedRoleId);
  };

  const groupedPermissions = userDetails?.permissions?.reduce((acc: any, perm: Permission) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {}) || {};

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (!userDetails?.role && !selectedRoleId) {
            e.preventDefault();
            toast({
              title: "Невозможно закрыть",
              description: "Необходимо назначить роль пользователю перед закрытием",
              variant: "destructive",
            });
          }
        }}
        onPointerDownOutside={(e) => {
          if (!userDetails?.role && !selectedRoleId) {
            e.preventDefault();
            toast({
              title: "Невозможно закрыть",
              description: "Необходимо назначить роль пользователю перед закрытием",
              variant: "destructive",
            });
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Права доступа пользователя
          </DialogTitle>
          <DialogDescription>
            Управление ролью и просмотр прав доступа для {user.fullName}
          </DialogDescription>
          {userDetails && !userDetails.role && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm mt-2">
              <strong>Внимание:</strong> У пользователя отсутствует роль. Необходимо явно назначить роль для определения прав доступа.
            </div>
          )}
        </DialogHeader>

        {loadingDetails ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role">Роль пользователя</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className={!selectedRoleId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Выберите роль *" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {role.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {userDetails?.role && (
                <p className="text-sm text-muted-foreground">
                  Текущая роль: <strong>{userDetails.role.name}</strong>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Права доступа через роль</Label>
              {Object.keys(groupedPermissions).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  У пользователя нет прав доступа
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, perms]: [string, any]) => (
                    <div key={module} className="border rounded-lg p-4 space-y-2">
                      <h4 className="font-medium text-sm capitalize">{module}</h4>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm: Permission) => (
                          <Badge key={perm.id} variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            {perm.action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => handleClose(false)}
            disabled={!userDetails?.role && !selectedRoleId}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateRoleMutation.isPending || !selectedRoleId}
          >
            Сохранить изменения
          </Button>
          {!selectedRoleId && (
            <p className="text-xs text-destructive w-full text-left">
              Необходимо выбрать роль для пользователя
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
