import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface UMG {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Service {
  id: string;
  name: string;
  code: string;
  umgId: string;
  description?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  serviceId: string;
  parentId?: string;
  level: number;
  description?: string;
}

interface UMGDialogProps {
  isOpen: boolean;
  onClose: () => void;
  umg?: UMG;
}

export function UMGDialog({ isOpen, onClose, umg }: UMGDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: umg?.name || "",
    code: umg?.code || "",
    description: umg?.description || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = umg ? `/api/umg/${umg.id}` : "/api/umg";
      const method = umg ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка сохранения");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/umg"] });
      toast({
        title: "Успешно",
        description: umg ? "УМГ обновлен" : "УМГ создан",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{umg ? "Редактировать УМГ" : "Создать УМГ"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="code">Код</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {umg ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service;
  umgList: UMG[];
}

export function ServiceDialog({ isOpen, onClose, service, umgList }: ServiceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: service?.name || "",
    code: service?.code || "",
    umgId: service?.umgId || "",
    description: service?.description || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = service ? `/api/services/${service.id}` : "/api/services";
      const method = service ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка сохранения");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Успешно",
        description: service ? "Служба обновлена" : "Служба создана",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.umgId) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Выберите УМГ",
      });
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Редактировать службу" : "Создать службу"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="umg">УМГ</Label>
            <Select
              value={formData.umgId}
              onValueChange={(value) => setFormData({ ...formData, umgId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите УМГ" />
              </SelectTrigger>
              <SelectContent>
                {umgList.map((umg) => (
                  <SelectItem key={umg.id} value={umg.id}>
                    {umg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="code">Код</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {service ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DepartmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department;
  services: Service[];
  departments: Department[];
}

export function DepartmentDialog({
  isOpen,
  onClose,
  department,
  services,
  departments,
}: DepartmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: department?.name || "",
    code: department?.code || "",
    serviceId: department?.serviceId || "",
    parentId: department?.parentId || "",
    level: department?.level || 1,
    description: department?.description || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        parentId: data.parentId || null,
      };
      const url = department ? `/api/departments/${department.id}` : "/api/departments";
      const method = department ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка сохранения");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Успешно",
        description: department ? "Подразделение обновлено" : "Подразделение создано",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceId) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Выберите службу",
      });
      return;
    }
    mutation.mutate(formData);
  };

  const availableParents = formData.serviceId
    ? departments.filter((d) => d.serviceId === formData.serviceId && d.id !== department?.id)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {department ? "Редактировать подразделение" : "Создать подразделение"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="service">Служба</Label>
            <Select
              value={formData.serviceId}
              onValueChange={(value) => setFormData({ ...formData, serviceId: value, parentId: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите службу" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="parent">Родительское подразделение (опционально)</Label>
            <Select
              value={formData.parentId || "none"}
              onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Нет родительского" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Нет родительского</SelectItem>
                {availableParents.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="code">Код</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="level">Уровень</Label>
            <Input
              id="level"
              type="number"
              min="1"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {department ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
