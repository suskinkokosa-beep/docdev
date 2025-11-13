import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Plus, Play, Award, CheckCircle, MoreVertical, Edit, Trash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrainingProgramDialog } from "@/components/TrainingProgramDialog";
import { TestFormDialog } from "@/components/TestFormDialog";
import { useToast } from "@/hooks/use-toast";

interface TrainingProgram {
  id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  umgId?: string;
  serviceId?: string;
  createdAt: string;
}

interface TrainingProgress {
  id: string;
  userId: string;
  programId: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
}

export function TrainingPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | undefined>(undefined);
  const [selectedProgramId, setSelectedProgramId] = useState<string | undefined>(undefined);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; title: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: programs = [], isLoading: programsLoading } = useQuery<TrainingProgram[]>({
    queryKey: ["/api/training"],
    queryFn: async () => {
      const response = await fetch("/api/training", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch training programs");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/training/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка удаления");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training"] });
      toast({
        title: "Успешно",
        description: "Программа удалена",
      });
      setDeleteDialog(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error.message,
      });
    },
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ч ${mins} мин`;
    }
    return `${mins} мин`;
  };

  const handleEdit = (program: TrainingProgram) => {
    setSelectedProgram(program);
    setShowDialog(true);
  };

  const handleDelete = (program: TrainingProgram) => {
    setDeleteDialog({ open: true, id: program.id, title: program.title });
  };

  const confirmDelete = () => {
    if (deleteDialog) {
      deleteMutation.mutate(deleteDialog.id);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedProgram(undefined);
  };

  const handleCreateTest = (program: TrainingProgram) => {
    setSelectedProgramId(program.id);
    setShowTestDialog(true);
  };

  const handleCloseTestDialog = () => {
    setShowTestDialog(false);
    setSelectedProgramId(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Модуль обучения</h1>
          <p className="text-muted-foreground">Программы обучения по ремонту с видео, тестами и сертификатами</p>
        </div>
        <Button
          data-testid="button-add-program"
          onClick={() => {
            setSelectedProgram(undefined);
            setShowDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Создать программу
        </Button>
      </div>

      <TrainingProgramDialog
        isOpen={showDialog}
        onClose={handleCloseDialog}
        program={selectedProgram}
      />

      <TestFormDialog
        open={showTestDialog && !!selectedProgramId}
        onOpenChange={setShowTestDialog}
        programId={selectedProgramId || ""}
      />

      {programsLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">Нет программ обучения</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {programs.map((program) => {
            const progress = 0;
            const completed = false;
            const certificate = false;

            return (
              <Card key={program.id} data-testid={`card-program-${program.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{program.title}</h3>
                      {program.description && (
                        <p className="text-sm text-muted-foreground mt-1">{program.description}</p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Длительность: {formatDuration(program.duration)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {completed && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Завершено
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(program)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCreateTest(program)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Создать тест
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(program)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      className="flex-1"
                      variant={completed ? "outline" : "default"}
                      data-testid={`button-start-${program.id}`}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {progress === 0 ? "Начать" : completed ? "Повторить" : "Продолжить"}
                    </Button>
                    {certificate && (
                      <Button variant="outline" data-testid={`button-certificate-${program.id}`}>
                        <Award className="mr-2 h-4 w-4" />
                        Сертификат
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены что хотите удалить программу "{deleteDialog?.title}"? Это действие нельзя отменить.
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
