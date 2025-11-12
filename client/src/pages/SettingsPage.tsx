import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";

export function SettingsPage() {
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();

  const handleSave = () => {
    updateSettings(settings);
    toast({
      title: "Успешно",
      description: "Настройки сохранены. Обновите страницу для применения изменений.",
    });
  };

  const handleCancel = () => {
    window.location.reload();
  };

  const handleChange = (key: string, value: any) => {
    updateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="text-muted-foreground">Конфигурация системы</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Общие настройки</CardTitle>
            <CardDescription>Основные параметры системы</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="system-name">Название системы</Label>
              <Input 
                id="system-name" 
                value={settings.systemName} 
                onChange={(e) => handleChange('systemName', e.target.value)}
                data-testid="input-system-name" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-upload">Макс. размер файла (МБ)</Label>
              <Input 
                id="max-upload" 
                type="number" 
                value={settings.maxUpload} 
                onChange={(e) => handleChange('maxUpload', e.target.value)}
                data-testid="input-max-upload" 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="backup">Автоматическое резервное копирование</Label>
              <Switch 
                id="backup" 
                checked={settings.backup}
                onCheckedChange={(checked) => handleChange('backup', checked)}
                data-testid="switch-backup" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Безопасность</CardTitle>
            <CardDescription>Параметры безопасности</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="2fa">Двухфакторная аутентификация</Label>
              <Switch 
                id="2fa" 
                checked={settings.twoFactor}
                onCheckedChange={(checked) => handleChange('twoFactor', checked)}
                data-testid="switch-2fa" 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="session-timeout">Тайм-аут сессии (мин)</Label>
              <Input 
                id="session-timeout" 
                type="number" 
                value={settings.sessionTimeout} 
                onChange={(e) => handleChange('sessionTimeout', e.target.value)}
                className="w-20" 
                data-testid="input-session-timeout" 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="audit-log">Детальный журнал аудита</Label>
              <Switch 
                id="audit-log" 
                checked={settings.auditLog}
                onCheckedChange={(checked) => handleChange('auditLog', checked)}
                data-testid="switch-audit-log" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Настройка уведомлений</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif">Email уведомления</Label>
              <Switch 
                id="email-notif" 
                checked={settings.emailNotif}
                onCheckedChange={(checked) => handleChange('emailNotif', checked)}
                data-testid="switch-email-notif" 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="doc-update">При обновлении документов</Label>
              <Switch 
                id="doc-update" 
                checked={settings.docUpdate}
                onCheckedChange={(checked) => handleChange('docUpdate', checked)}
                data-testid="switch-doc-update" 
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="new-user">При добавлении пользователя</Label>
              <Switch 
                id="new-user" 
                checked={settings.newUser}
                onCheckedChange={(checked) => handleChange('newUser', checked)}
                data-testid="switch-new-user" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Интеграции</CardTitle>
            <CardDescription>Внешние сервисы</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smtp">SMTP сервер</Label>
              <Input 
                id="smtp" 
                placeholder="smtp.example.com" 
                value={settings.smtp}
                onChange={(e) => handleChange('smtp', e.target.value)}
                data-testid="input-smtp" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ldap">LDAP сервер (опционально)</Label>
              <Input 
                id="ldap" 
                placeholder="ldap://example.com" 
                value={settings.ldap}
                onChange={(e) => handleChange('ldap', e.target.value)}
                data-testid="input-ldap" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel}>Отмена</Button>
        <Button onClick={handleSave} data-testid="button-save-settings">Сохранить настройки</Button>
      </div>
    </div>
  );
}
