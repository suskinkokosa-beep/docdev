import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const objectFormSchema = z.object({
  code: z.string().min(1, "Обязательное поле"),
  name: z.string().min(1, "Обязательное поле"),
  type: z.string().min(1, "Обязательное поле"),
  umgId: z.string().min(1, "Выберите УМГ"),
  status: z.enum(["active", "maintenance", "inactive"]).default("active"),
  location: z.string().optional(),
  description: z.string().optional(),
});

type ObjectFormData = z.infer<typeof objectFormSchema>;

interface UMG {
  id: string;
  name: string;
  code: string;
}

interface ObjectData {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  umgId: string;
  location?: string;
  description?: string;
}

interface ObjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  object?: ObjectData;
  mode: "create" | "edit";
}

export function ObjectFormDialog({ open, onOpenChange, object, mode }: ObjectFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: umgs = [] } = useQuery<UMG[]>({
    queryKey: ['/api/umg'],
    queryFn: async () => {
      const response = await fetch('/api/umg', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch UMG');
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
  } = useForm<ObjectFormData>({
    resolver: zodResolver(objectFormSchema),
    defaultValues: {
      status: "active",
    },
  });

  useEffect(() => {
    if (object && mode === "edit") {
      reset({
        code: object.code,
        name: object.name,
        type: object.type,
        umgId: object.umgId,
        status: object.status as any,
        location: object.location || "",
        description: object.description || "",
      });
    } else {
      reset({
        code: "",
        name: "",
        type: "",
        umgId: "",
        status: "active",
        location: "",
        description: "",
      });
    }
  }, [object, mode, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: ObjectFormData) => {
      const response = await fetch('/api/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка создания объекта');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/objects'] });
      toast({
        title: "Успешно",
        description: "Объект создан",
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
    mutationFn: async (data: Partial<ObjectFormData>) => {
      const response = await fetch(`/api/objects/${object?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка обновления объекта');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/objects'] });
      toast({
        title: "Успешно",
        description: "Объект обновлен",
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

  const onSubmit = (data: ObjectFormData) => {
    if (mode === "create") {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Добавить объект" : "Редактировать объект"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Создайте новый объект газопровода" 
              : "Обновите данные объекта"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код объекта *</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="OBJ-001"
                disabled={mode === "edit"}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Тип объекта *</Label>
              <Input
                id="type"
                {...register("type")}
                placeholder="Компрессорная станция"
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Наименование *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Название объекта"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="umgId">УМГ *</Label>
              <Select 
                value={watch("umgId")} 
                onValueChange={(value) => setValue("umgId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите УМГ" />
                </SelectTrigger>
                <SelectContent>
                  {umgs.map((umg) => (
                    <SelectItem key={umg.id} value={umg.id}>
                      {umg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.umgId && (
                <p className="text-sm text-destructive">{errors.umgId.message}</p>
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
                  <SelectItem value="maintenance">На обслуживании</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Местоположение</Label>
            <Input
              id="location"
              {...register("location")}
              placeholder="Адрес или координаты"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Дополнительная информация об объекте"
              rows={3}
            />
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
