import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const roleFormSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  description: z.string().optional(),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
  mode: "create" | "edit";
}

export function RoleFormDialog({ open, onOpenChange, role, mode }: RoleFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
    queryFn: async () => {
      const response = await fetch('/api/permissions', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    },
  });

  const { data: roleData } = useQuery({
    queryKey: ['/api/roles', role?.id],
    queryFn: async () => {
      if (!role?.id) return null;
      const response = await fetch(`/api/roles/${role.id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch role');
      return response.json();
    },
    enabled: !!role?.id && mode === "edit",
  });

  useEffect(() => {
    if (roleData?.permissions) {
      setSelectedPermissions(roleData.permissions.map((p: Permission) => p.id));
    } else {
      setSelectedPermissions([]);
    }
  }, [roleData]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (role && mode === "edit") {
      reset({
        name: role.name,
        description: role.description || "",
      });
    } else {
      reset({
        name: "",
        description: "",
      });
    }
  }, [role, mode, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: RoleFormData & { permissionIds: string[] }) => {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания роли');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({
        title: "Успешно",
        description: "Роль создана",
      });
      reset();
      setSelectedPermissions([]);
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

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<RoleFormData> & { permissionIds?: string[] }) => {
      const response = await fetch(`/api/roles/${role?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обновления роли');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/roles'] });
      toast({
        title: "Успешно",
        description: "Роль обновлена",
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

  const onSubmit = (data: RoleFormData) => {
    const payload = { ...data, permissionIds: selectedPermissions };
    if (mode === "create") {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Создать роль" : "Редактировать роль"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Создайте новую роль и назначьте права доступа" 
              : "Обновите данные роли"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название роли *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Администратор"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Описание роли"
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Права доступа</Label>
            <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module} className="mb-4">
                  <h4 className="font-medium mb-2">{moduleNames[module] || module}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((perm) => (
                      <div key={perm.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={perm.id}
                          checked={selectedPermissions.includes(perm.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPermissions([...selectedPermissions, perm.id]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(id => id !== perm.id));
                            }
                          }}
                        />
                        <label htmlFor={perm.id} className="text-sm cursor-pointer">
                          {perm.action}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {mode === "create" ? "Создать" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
