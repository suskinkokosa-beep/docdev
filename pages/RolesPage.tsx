import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Shield, Pencil, Trash2, MoreVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleFormDialog } from "@/components/RoleFormDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

interface RolePermission {
  role: Role;
  permissions: Permission[];
}

export function RolesPage() {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [roleToEdit, setRoleToEdit] = useState<Role | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
    queryFn: async () => {
      const response = await fetch('/api/roles', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
    queryFn: async () => {
      const response = await fetch('/api/permissions', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
  });

  const { data: rolePermissions = { role: null, permissions: [] }, isLoading: rolePermissionsLoading } = useQuery<RolePermission>({
    queryKey: ['/api/roles', selectedRoleId],
    queryFn: async () => {
      if (!selectedRoleId) return { role: null, permissions: [] };
      const response = await fetch(`/api/roles/${selectedRoleId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch role permissions');
      return response.json();
    },
    enabled: !!selectedRoleId,
  });

  const isLoading = rolesLoading || permissionsLoading || rolePermissionsLoading;

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const rolePermissionIds = rolePermissions.permissions?.map((p: Permission) => p.id) || [];

  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const moduleNames: Record<string, string> = {
    users: "Пользователи",
    objects: "Объекты",
    documents: "Документы",
    orgstructure: "Оргструктура",
    roles: "Роли",
    training: "Обучение",
    audit: "Аудит",
  };

  const actionNames: Record<string, string> = {
    view: "Просмотр",
    create: "Создание",
    edit: "Редактирование",
    delete: "Удаление",
    upload: "Загрузка",
    manage: "Управление",
    export: "Экспорт",
  };

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка удаления роли');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({
        title: "Успешно",
        description: "Роль удалена",
      });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      if (selectedRoleId === roleToDelete?.id) {
        setSelectedRoleId(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditRole = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleToEdit(role);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDeleteRole = (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (roleToDelete) {
      deleteMutation.mutate(roleToDelete.id);
    }
  };

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId, add }: { roleId: string; permissionId: string; add: boolean }) => {
      const url = `/api/roles/${roleId}/permissions/${permissionId}`;
      const method = add ? 'POST' : 'DELETE';
      const response = await fetch(url, {
        method,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка изменения прав');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles', selectedRoleId] });
      toast({
        title: "Успешно",
        description: "Права роли обновлены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTogglePermission = (permissionId: string, currentlyHas: boolean) => {
    if (!selectedRoleId || !selectedRole) return;
    if (selectedRole.isSystem) {
      toast({
        title: "Ошибка",
        description: "Системные роли нельзя редактировать",
        variant: "destructive",
      });
      return;
    }
    togglePermissionMutation.mutate({
      roleId: selectedRoleId,
      permissionId,
      add: !currentlyHas,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Права и роли</h1>
          <p className="text-muted-foreground">Конструктор ролей с гранулярными правами</p>
        </div>
        {canCreate('roles') && (
          <Button 
            data-testid="button-add-role"
            onClick={() => {
              setDialogMode("create");
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать роль
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Роли</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Нет ролей</div>
            ) : (
              roles.map((role) => (
                <div
                  key={role.id}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer hover-elevate ${
                    selectedRoleId === role.id ? "toggle-elevate toggle-elevated" : ""
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                  data-testid={`role-${role.id}`}
                >
                  <div className={`h-3 w-3 rounded-full ${role.isSystem ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                  {!role.isSystem && (canEdit('roles') || canDelete('roles')) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit('roles') && (
                          <DropdownMenuItem onClick={(e) => handleEditRole(role, e)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                        )}
                        {canDelete('roles') && (
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteRole(role, e)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Права доступа</CardTitle>
              {selectedRole && (
                <Badge>
                  <Shield className="mr-1 h-3 w-3" />
                  {selectedRole.name}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedRole ? (
              <div className="text-center text-muted-foreground py-12">
                Выберите роль для просмотра прав
              </div>
            ) : isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                  <div key={module} className="space-y-3">
                    <h3 className="font-semibold text-sm">{moduleNames[module] || module}</h3>
                    <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                      {modulePermissions.map((permission) => {
                        const hasPermission = rolePermissionIds.includes(permission.id);
                        return (
                          <div key={permission.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`${module}-${permission.action}`}
                              checked={hasPermission}
                              disabled={selectedRole?.isSystem || togglePermissionMutation.isPending}
                              onCheckedChange={() => handleTogglePermission(permission.id, hasPermission)}
                              data-testid={`checkbox-${module}-${permission.action}`}
                            />
                            <label
                              htmlFor={`${module}-${permission.action}`}
                              className={`text-sm ${!selectedRole?.isSystem ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                            >
                              {actionNames[permission.action] || permission.action}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RoleFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setRoleToEdit(undefined);
          }
        }}
        role={dialogMode === "edit" ? roleToEdit : undefined}
        mode={dialogMode}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить роль "{roleToDelete?.name}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
