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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const userFormSchema = z.object({
  username: z.string().min(3, "Минимум 3 символа"),
  password: z.string().min(6, "Минимум 6 символов").or(z.literal("")).optional(),
  fullName: z.string().min(1, "Обязательное поле"),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  roleId: z.string().min(1, "Выберите роль"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  umgIds: z.array(z.string()).optional(),
  serviceIds: z.array(z.string()).optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface Role {
  id: string;
  name: string;
}

interface Umg {
  id: string;
  name: string;
  code: string;
}

interface Service {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  status: string;
  roles?: Role[];
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  mode: "create" | "edit";
}

export function UserFormDialog({ open, onOpenChange, user, mode }: UserFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userDetails, setUserDetails] = useState<any>(null);

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
    queryFn: async () => {
      const response = await fetch('/api/roles', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  const { data: umgList = [] } = useQuery<Umg[]>({
    queryKey: ['/api/umg'],
    queryFn: async () => {
      const response = await fetch('/api/umg', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch UMG');
      return response.json();
    },
  });

  const { data: servicesList = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
  });

  // Загрузить детали пользователя при редактировании
  useEffect(() => {
    if (user && mode === "edit" && open) {
      fetch(`/api/users/${user.id}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setUserDetails(data))
        .catch(err => console.error('Error fetching user details:', err));
    }
  }, [user, mode, open]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      status: "active",
    },
  });

  useEffect(() => {
    if (user && mode === "edit" && userDetails) {
      const firstRoleId = userDetails.roles && userDetails.roles.length > 0 ? userDetails.roles[0].id : "";
      const umgIds = userDetails.umgAccess?.map((u: any) => u.id) || [];
      const serviceIds = userDetails.serviceAccess?.map((s: any) => s.id) || [];
      
      reset({
        username: user.username,
        fullName: user.fullName,
        email: user.email || "",
        status: user.status as any,
        password: "",
        roleId: firstRoleId,
        umgIds,
        serviceIds,
      });
    } else if (mode === "create") {
      reset({
        username: "",
        fullName: "",
        email: "",
        password: "",
        roleId: "",
        status: "active",
        umgIds: [],
        serviceIds: [],
      });
    }
  }, [user, mode, userDetails, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания пользователя');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Успешно",
        description: "Пользователь создан",
      });
      reset();
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
    mutationFn: async (data: Partial<UserFormData>) => {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обновления пользователя');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Успешно",
        description: "Пользователь обновлен",
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

  const onSubmit = (data: UserFormData) => {
    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      const updateData = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateMutation.mutate(updateData);
    }
  };

  const roleId = watch("roleId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Добавить пользователя" : "Редактировать пользователя"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Создайте нового пользователя системы" 
              : "Обновите данные пользователя"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Имя пользователя *</Label>
            <Input
              id="username"
              {...register("username")}
              disabled={mode === "edit"}
              placeholder="username"
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Полное имя *</Label>
            <Input
              id="fullName"
              {...register("fullName")}
              placeholder="Иванов Иван Иванович"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Пароль {mode === "create" ? "*" : "(оставьте пустым для сохранения текущего)"}
            </Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleId">Роль *</Label>
            <Select 
              value={roleId} 
              onValueChange={(value) => setValue("roleId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className="text-sm text-destructive">{errors.roleId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Статус *</Label>
            <Select 
              value={watch("status")} 
              onValueChange={(value: any) => setValue("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активен</SelectItem>
                <SelectItem value="inactive">Неактивен</SelectItem>
                <SelectItem value="suspended">Заблокирован</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Доступ к УМГ</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
              {umgList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет доступных УМГ</p>
              ) : (
                umgList.map((umg) => (
                  <div key={umg.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`umg-${umg.id}`}
                      checked={watch("umgIds")?.includes(umg.id) || false}
                      onCheckedChange={(checked) => {
                        const currentIds = watch("umgIds") || [];
                        if (checked) {
                          setValue("umgIds", [...currentIds, umg.id]);
                        } else {
                          setValue("umgIds", currentIds.filter(id => id !== umg.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`umg-${umg.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {umg.name} ({umg.code})
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Доступ к службам</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
              {servicesList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет доступных служб</p>
              ) : (
                servicesList.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={watch("serviceIds")?.includes(service.id) || false}
                      onCheckedChange={(checked) => {
                        const currentIds = watch("serviceIds") || [];
                        if (checked) {
                          setValue("serviceIds", [...currentIds, service.id]);
                        } else {
                          setValue("serviceIds", currentIds.filter(id => id !== service.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`service-${service.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {service.name} ({service.code})
                    </label>
                  </div>
                ))
              )}
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
