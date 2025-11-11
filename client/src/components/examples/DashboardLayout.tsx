import { DashboardLayout } from "../DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardLayoutExample() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Пример контента</h1>
        <Card>
          <CardHeader>
            <CardTitle>Пример карточки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Это пример контента внутри layout с боковой панелью навигации.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
