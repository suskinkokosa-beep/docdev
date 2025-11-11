import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Play, Award, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: programs = [], isLoading: programsLoading } = useQuery<TrainingProgram[]>({
    queryKey: ['/api/training'],
    queryFn: async () => {
      const response = await fetch('/api/training', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch training programs');
      return response.json();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Модуль обучения</h1>
          <p className="text-muted-foreground">Программы обучения по ремонту с видео, тестами и сертификатами</p>
        </div>
        <Button data-testid="button-add-program">
          <Plus className="mr-2 h-4 w-4" />
          Создать программу
        </Button>
      </div>

      {programsLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          Нет программ обучения
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {programs.map((program) => {
            // Получаем прогресс для программы (нужно будет добавить отдельный запрос)
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
                    {completed && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Завершено
                      </Badge>
                    )}
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
    </div>
  );
}
