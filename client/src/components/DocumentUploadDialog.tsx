import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Upload } from "lucide-react";

const documentFormSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  code: z.string().min(1, "Обязательное поле"),
  categoryId: z.string().min(1, "Выберите категорию"),
  objectId: z.string().optional(),
  umgId: z.string().min(1, "Выберите УМГ"),
  serviceIds: z.array(z.string()).optional(),
  description: z.string().optional(),
  version: z.string().default("1.0"),
});

type DocumentFormData = z.infer<typeof documentFormSchema>;

interface Category {
  id: string;
  name: string;
  code: string;
}

interface PipelineObject {
  id: string;
  code: string;
  name: string;
  type: string;
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
  umgId: string;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadDialog({ open, onOpenChange }: DocumentUploadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/document-categories'],
    queryFn: async () => {
      const response = await fetch('/api/document-categories', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const { data: objects = [] } = useQuery<PipelineObject[]>({
    queryKey: ['/api/objects'],
    queryFn: async () => {
      const response = await fetch('/api/objects', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch objects');
      return response.json();
    },
  });

  const { data: umgs = [] } = useQuery<Umg[]>({
    queryKey: ['/api/umg'],
    queryFn: async () => {
      const response = await fetch('/api/umg', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch UMGs');
      return response.json();
    },
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch services');
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
    control,
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      version: "1.0",
      categoryId: "",
      objectId: "",
      umgId: "",
      serviceIds: [],
    },
  });

  const selectedUmgId = watch("umgId");
  const filteredServices = services.filter(s => s.umgId === selectedUmgId);

  const uploadMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      if (!selectedFile) {
        throw new Error('Выберите файл');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', data.name);
      formData.append('code', data.code);
      formData.append('categoryId', data.categoryId);
      formData.append('umgId', data.umgId);
      formData.append('version', data.version);
      if (data.objectId) {
        formData.append('objectId', data.objectId);
      }
      if (data.serviceIds && data.serviceIds.length > 0) {
        formData.append('serviceIds', JSON.stringify(data.serviceIds));
      }
      if (data.description) {
        formData.append('description', data.description);
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка загрузки документа');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Успешно",
        description: "Документ загружен",
      });
      reset();
      setSelectedFile(null);
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

  const onSubmit = (data: DocumentFormData) => {
    uploadMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Загрузить документ</DialogTitle>
          <DialogDescription>
            Загрузите новый документ в систему
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Файл *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  }
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv,.dwg"
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Выбран: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Код документа *</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="DOC-001"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Версия</Label>
              <Input
                id="version"
                {...register("version")}
                placeholder="1.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Наименование *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Название документа"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="umgId">УМГ *</Label>
            <Controller
              control={control}
              name="umgId"
              render={({ field }) => (
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
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
              )}
            />
            {errors.umgId && (
              <p className="text-sm text-destructive">{errors.umgId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="objectId">Объект (опционально)</Label>
              <Controller
                control={control}
                name="objectId"
                render={({ field }) => (
                  <Select 
                    value={field.value || "none"} 
                    onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите объект" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без объекта</SelectItem>
                      {objects.map((obj) => (
                        <SelectItem key={obj.id} value={obj.id}>
                          {obj.code} - {obj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Категория *</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Описание документа"
              rows={3}
            />
          </div>

          {selectedUmgId && filteredServices.length > 0 && (
            <div className="space-y-2">
              <Label>Доступ для служб (опционально)</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {filteredServices.map((service) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`service-${service.id}`}
                      value={service.id}
                      onChange={(e) => {
                        const currentIds = watch("serviceIds") || [];
                        if (e.target.checked) {
                          setValue("serviceIds", [...currentIds, service.id]);
                        } else {
                          setValue("serviceIds", currentIds.filter(id => id !== service.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`service-${service.id}`} className="text-sm font-normal cursor-pointer">
                      {service.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Если не выбрано ни одной службы, документ будет доступен всем службам данного УМГ
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedFile(null);
              }}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={uploadMutation.isPending || !selectedFile}
            >
              <Upload className="mr-2 h-4 w-4" />
              Загрузить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
