import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const testFormSchema = z.object({
  title: z.string().min(1, "Обязательное поле"),
  passingScore: z.number().min(0).max(100),
  questions: z.array(z.object({
    question: z.string().min(1, "Вопрос обязателен"),
    options: z.array(z.string()).min(2, "Минимум 2 варианта"),
    correctAnswer: z.number().min(0),
  })).min(1, "Добавьте хотя бы один вопрос"),
});

type TestFormData = z.infer<typeof testFormSchema>;

interface TestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
}

export function TestFormDialog({ open, onOpenChange, programId }: TestFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<Array<{ question: string; options: string[]; correctAnswer: number }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TestFormData>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      passingScore: 70,
      questions: [],
    },
  });

  useEffect(() => {
    setValue("questions", questions);
  }, [questions, setValue]);

  const createMutation = useMutation({
    mutationFn: async (data: TestFormData) => {
      const testResponse = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          programId,
          title: data.title,
          passingScore: data.passingScore,
        }),
      });
      
      if (!testResponse.ok) throw new Error('Ошибка создания теста');
      const test = await testResponse.json();
      
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        await fetch('/api/test-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            testId: test.id,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            order: i + 1,
          }),
        });
      }
      
      return test;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/training/${programId}/tests`] });
      toast({
        title: "Успешно",
        description: "Тест создан",
      });
      reset();
      setQuestions([]);
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

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", ""], correctAnswer: 0 }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push("");
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const onSubmit = (data: TestFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать тест</DialogTitle>
          <DialogDescription>
            Добавьте вопросы и варианты ответов для проверки знаний
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название теста *</Label>
            <Input id="title" {...register("title")} placeholder="Тест по технике безопасности" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="passingScore">Проходной балл (%) *</Label>
            <Input 
              id="passingScore" 
              type="number" 
              {...register("passingScore", { valueAsNumber: true })} 
              min="0" 
              max="100" 
            />
            {errors.passingScore && <p className="text-sm text-destructive">{errors.passingScore.message}</p>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Вопросы</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить вопрос
              </Button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Label>Вопрос {qIndex + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <Textarea
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                  placeholder="Введите вопрос..."
                  rows={2}
                />

                <div className="space-y-2">
                  <Label>Варианты ответов</Label>
                  {q.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctAnswer === oIndex}
                        onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                      />
                      <Input
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Вариант ${oIndex + 1}`}
                      />
                      {q.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(qIndex, oIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(qIndex)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить вариант
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              Создать тест
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
