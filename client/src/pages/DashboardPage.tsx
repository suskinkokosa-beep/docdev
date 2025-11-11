import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Users, GraduationCap, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Stats {
  objectsCount: number;
  documentsCount: number;
  usersCount: number;
  trainingCount: number;
}

interface RecentDocument {
  id: string;
  name: string;
  updatedAt: string;
}

interface RecentActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  createdAt: string;
  user?: { fullName: string };
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [objects, documents, users, training] = await Promise.all([
        fetch('/api/objects', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/documents', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/users', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/training', { credentials: 'include' }).then(r => r.json()),
      ]);
      return {
        objectsCount: objects.length,
        documentsCount: documents.length,
        usersCount: users.length,
        trainingCount: training.length,
      };
    },
  });

  const { data: recentDocs = [] } = useQuery<RecentDocument[]>({
    queryKey: ['recent-documents'],
    queryFn: async () => {
      const response = await fetch('/api/documents', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const docs = await response.json();
      return docs.slice(0, 5);
    },
  });

  const { data: recentActivity = [] } = useQuery<RecentActivity[]>({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await fetch('/api/audit?limit=10', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const statsCards = [
    { 
      title: "Объекты", 
      value: stats?.objectsCount || 0, 
      icon: Building2, 
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    { 
      title: "Документы", 
      value: stats?.documentsCount || 0, 
      icon: FileText, 
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    { 
      title: "Пользователи", 
      value: stats?.usersCount || 0, 
      icon: Users, 
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    },
    { 
      title: "Программы обучения", 
      value: stats?.trainingCount || 0, 
      icon: GraduationCap, 
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950"
    },
  ];

  const getActionText = (action: string, resource: string) => {
    const actions: Record<string, string> = {
      create: 'создал',
      read: 'просмотрел',
      update: 'обновил',
      delete: 'удалил',
      upload: 'загрузил',
      download: 'скачал',
    };
    const resources: Record<string, string> = {
      document: 'документ',
      object: 'объект',
      user: 'пользователя',
    };
    return `${actions[action] || action} ${resources[resource] || resource}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Панель управления</h1>
        <p className="text-muted-foreground">Общая информация о системе</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          statsCards.map((stat) => (
            <Card key={stat.title} data-testid={`stat-${stat.title.toLowerCase()}`} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  <span>Активно</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Недавние документы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет документов</p>
              ) : (
                recentDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Последняя активность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет активности</p>
              ) : (
                recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.user?.fullName || 'Система'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getActionText(activity.action, activity.resource)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: ru })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
