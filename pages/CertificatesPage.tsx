import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Download, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Certificate {
  id: string;
  certificateNumber: string;
  score: number;
  issuedAt: string;
  programId: string;
  program?: {
    title: string;
    description: string;
  };
}

export function CertificatesPage() {
  const { data: certificates = [], isLoading } = useQuery<Certificate[]>({
    queryKey: ['certificates'],
    queryFn: async () => {
      const response = await fetch('/api/certificates', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch certificates');
      return response.json();
    },
  });

  const handleDownload = (cert: Certificate) => {
    // Генерация PDF сертификата (можно добавить API эндпоинт)
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Сертификат ${cert.certificateNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              text-align: center;
            }
            .certificate {
              border: 10px solid #4CAF50;
              padding: 60px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { color: #4CAF50; font-size: 48px; margin-bottom: 20px; }
            h2 { font-size: 32px; margin: 20px 0; }
            p { font-size: 18px; margin: 10px 0; }
            .score { font-size: 36px; color: #4CAF50; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1>🏆 Сертификат</h1>
            <h2>об успешном завершении обучения</h2>
            <p><strong>Программа:</strong> ${cert.program?.title || 'Программа обучения'}</p>
            <p class="score">Результат: ${cert.score} баллов</p>
            <p><strong>Номер сертификата:</strong> ${cert.certificateNumber}</p>
            <p><strong>Дата выдачи:</strong> ${format(new Date(cert.issuedAt), 'dd MMMM yyyy', { locale: ru })}</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Мои сертификаты</h1>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Мои сертификаты</h1>
        <p className="text-muted-foreground">
          Все полученные сертификаты о прохождении обучения
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет сертификатов</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Пройдите программу обучения и успешно сдайте тест, чтобы получить сертификат
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <Badge variant={cert.score >= 90 ? 'default' : 'secondary'}>
                    {cert.score >= 90 ? 'Отлично' : cert.score >= 70 ? 'Хорошо' : 'Удовлетворительно'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <CardTitle className="text-lg mb-2">
                    {cert.program?.title || 'Программа обучения'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cert.program?.description || 'Описание программы'}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Результат: <strong className="text-foreground">{cert.score} баллов</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(cert.issuedAt), 'dd MMMM yyyy', { locale: ru })}</span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-3">
                    №{cert.certificateNumber}
                  </p>
                  <Button 
                    onClick={() => handleDownload(cert)}
                    className="w-full"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Скачать сертификат
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
