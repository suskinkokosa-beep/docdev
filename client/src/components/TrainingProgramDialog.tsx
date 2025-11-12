import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface TrainingProgram {
  id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  umgId?: string;
  serviceId?: string;
}

interface TrainingProgramDialogProps {
  isOpen: boolean;
  onClose: () => void;
  program?: TrainingProgram;
}

const defaultFormData = {
  title: "",
  description: "",
  duration: 30,
  videoUrl: "",
  umgId: "none",
  serviceId: "none",
};

export function TrainingProgramDialog({ isOpen, onClose, program }: TrainingProgramDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (isOpen) {
      if (program) {
        setFormData({
          title: program.title || "",
          description: program.description || "",
          duration: program.duration || 30,
          videoUrl: program.videoUrl || "",
          umgId: program.umgId || "none",
          serviceId: program.serviceId || "none",
        });
      } else {
        setFormData(defaultFormData);
      }
    }
  }, [isOpen, program]);

  const { data: umgList = [] } = useQuery({
    queryKey: ["/api/umg"],
    queryFn: async () => {
      const response = await fetch("/api/umg", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch UMG");
      return response.json();
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        umgId: data.umgId && data.umgId !== "none" ? data.umgId : null,
        serviceId: data.serviceId && data.serviceId !== "none" ? data.serviceId : null,
      };
      const url = program ? `/api/training/${program.id}` : "/api/training";
      const method = program ? "PUT" : "POST";
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
      queryClient.invalidateQueries({ queryKey: ["/api/training"] });
      toast({
        title: "Успешно",
        description: program ? "Программа обновлена" : "Программа создана",
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{program ? "Редактировать программу" : "Создать программу обучения"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Название программы</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Длительность (минуты)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="videoUrl">URL видео (опционально)</Label>
              <Input
                id="videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="umg">УМГ (опционально)</Label>
              <Select
                value={formData.umgId}
                onValueChange={(value) => setFormData({ ...formData, umgId: value })}
              >
                <SelectTrigger id="umg">
                  <SelectValue placeholder="Выберите УМГ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбрано</SelectItem>
                  {umgList.map((umg: any) => (
                    <SelectItem key={umg.id} value={umg.id}>
                      {umg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="service">Служба (опционально)</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder="Выберите службу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбрано</SelectItem>
                  {services.map((service: any) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {program ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
