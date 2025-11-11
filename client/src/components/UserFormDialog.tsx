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
import { useToast } from "@/hooks/use-toast";

const userFormSchema = z.object({
  username: z.string().min(3, "Минимум 3 символа"),
  password: z.string().min(6, "Минимум 6 символов").or(z.literal("")).optional(),
  fullName: z.string().min(1, "Обязательное поле"),
  email: z.string().email("Неверный формат email").optional().or(z.literal("")),
  roleId: z.string().min(1, "Выберите роль"),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface Role {
  id: string;
  name: string;
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

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
    queryFn: async () => {
      const response = await fetch('/api/roles', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

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
    if (user && mode === "edit") {
      const firstRoleId = user.roles && user.roles.length > 0 ? user.roles[0].id : "";
      reset({
        username: user.username,
        fullName: user.fullName,
        email: user.email || "",
        status: user.status as any,
        password: "",
        roleId: firstRoleId,
      });
    } else {
      reset({
        username: "",
        fullName: "",
        email: "",
        password: "",
        roleId: "",
        status: "active",
      });
    }
  }, [user, mode, reset]);

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
      <DialogContent className="sm:max-w-[500px]">
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
