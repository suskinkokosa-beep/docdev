import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock } from "lucide-react";

interface Role {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department?: {
    id: string;
    name: string;
  };
  createdAt: string;
  isActive: boolean;
}

interface AuthData {
  user: UserProfile;
  roles: Role[];
}

export function ProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: authData, isLoading } = useQuery<AuthData>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    },
  });

  const user = authData?.user;

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка изменения пароля");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Пароль успешно изменен",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пароли не совпадают",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
      });
      return;
    }

    passwordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Не удалось загрузить данные профиля</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Профиль</h1>
        <p className="text-muted-foreground">Управление учетной записью</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Информация об аккаунте</CardTitle>
            </div>
            <CardDescription>Ваши личные данные</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Логин</Label>
                <p className="text-sm font-medium">{user.username}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{user.email || "—"}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">ФИО</Label>
                <p className="text-sm font-medium">{user.fullName || "—"}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Роль</Label>
                <p className="text-sm font-medium">{authData?.roles?.[0]?.name || "—"}</p>
              </div>
              {user.department && (
                <div>
                  <Label className="text-sm text-muted-foreground">Отдел</Label>
                  <p className="text-sm font-medium">{user.department.name}</p>
                </div>
              )}
              <div>
                <Label className="text-sm text-muted-foreground">Статус</Label>
                <p className="text-sm font-medium">
                  {user.isActive ? (
                    <span className="text-green-600">Активен</span>
                  ) : (
                    <span className="text-red-600">Неактивен</span>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Дата регистрации</Label>
                <p className="text-sm font-medium">
                  {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              <CardTitle>Изменить пароль</CardTitle>
            </div>
            <CardDescription>Обновите свой пароль для входа в систему</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Текущий пароль</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Минимум 6 символов
                </p>
              </div>
              <div>
                <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={passwordMutation.isPending}
                className="w-full sm:w-auto"
              >
                {passwordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Изменение...
                  </>
                ) : (
                  "Изменить пароль"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
