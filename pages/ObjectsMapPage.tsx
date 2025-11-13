import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Layers, Search, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ObjectWithLocation {
  object: {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
  };
  location: {
    latitude: string;
    longitude: string;
    address?: string;
    region?: string;
  } | null;
}

export function ObjectsMapPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

  const { data: objects = [], isLoading } = useQuery<ObjectWithLocation[]>({
    queryKey: ['objects-map'],
    queryFn: async () => {
      const response = await fetch('/api/objects-map', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  useEffect(() => {
    // Получаем геолокацию пользователя
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Ошибка получения геолокации:', error);
        }
      );
    }
  }, []);

  const objectsWithLocation = objects.filter(obj => obj.location !== null);

  const filteredObjects = objectsWithLocation.filter(obj => {
    const matchesSearch = obj.object.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         obj.object.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || obj.object.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || obj.object.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'maintenance':
        return 'bg-yellow-500';
      case 'inactive':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активный';
      case 'maintenance':
        return 'На обслуживании';
      case 'inactive':
        return 'Неактивный';
      default:
        return status;
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Карта объектов</h1>
        <p className="text-muted-foreground">
          Геолокация и навигация по объектам газопроводов
        </p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Input
                placeholder="Поиск по названию или коду..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Тип объекта" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="компрессорная станция">Компрессорная станция</SelectItem>
                  <SelectItem value="газопровод">Газопровод</SelectItem>
                  <SelectItem value="крановый узел">Крановый узел</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="maintenance">На обслуживании</SelectItem>
                  <SelectItem value="inactive">Неактивный</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Найдено объектов: {filteredObjects.length} из {objectsWithLocation.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Инфо о карте */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Интерактивная карта</h3>
              <p className="text-sm text-muted-foreground">
                Для отображения интерактивной карты необходимо установить библиотеку react-leaflet.
                Выполните команду: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">npm install react-leaflet leaflet</code>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Пока отображается список объектов с координатами.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список объектов */}
      {isLoading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : filteredObjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Объекты не найдены</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {objectsWithLocation.length === 0 
                ? 'Добавьте геолокацию к объектам для отображения на карте'
                : 'Попробуйте изменить фильтры поиска'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredObjects.map(({ object, location }) => (
            <Card key={object.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{object.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{object.code}</p>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(object.status)} text-white border-0`}>
                    {getStatusLabel(object.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {location?.latitude}, {location?.longitude}
                  </span>
                </div>
                {location?.address && (
                  <p className="text-sm text-muted-foreground">
                    📍 {location.address}
                  </p>
                )}
                {location?.region && (
                  <p className="text-sm text-muted-foreground">
                    🗺️ {location.region}
                  </p>
                )}
                {userLocation && location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Navigation className="h-4 w-4" />
                    <span>
                      Расстояние: ~
                      {calculateDistance(
                        userLocation.lat,
                        userLocation.lon,
                        parseFloat(location.latitude),
                        parseFloat(location.longitude)
                      )} км
                    </span>
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (location) {
                        window.open(
                          `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
                          '_blank'
                        );
                      }
                    }}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    Открыть в Google Maps
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
