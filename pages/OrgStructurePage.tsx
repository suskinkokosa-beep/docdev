import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, ChevronDown, Plus, Building2, Users, MoreVertical, Edit, Trash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { UMGDialog, ServiceDialog, DepartmentDialog } from "@/components/OrgStructureDialogs";
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

interface UMG {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Service {
  id: string;
  name: string;
  code: string;
  umgId: string;
  description?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  serviceId: string;
  parentId?: string;
  level: number;
  description?: string;
}

interface TreeNode {
  id: string;
  name: string;
  type: "umg" | "service" | "department";
  children?: TreeNode[];
}

type DialogType = "umg" | "service" | "department" | null;

export function OrgStructurePage() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState<DialogType>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: umgList = [], isLoading: umgLoading } = useQuery<UMG[]>({
    queryKey: ["/api/umg"],
    queryFn: async () => {
      const response = await fetch("/api/umg", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch UMG");
      return response.json();
    },
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const response = await fetch("/api/services", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch services");
      return response.json();
    },
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await fetch("/api/departments", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const url = type === "umg" ? `/api/umg/${id}` : type === "service" ? `/api/services/${id}` : `/api/departments/${id}`;
      const response = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка удаления");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/${variables.type === "umg" ? "umg" : variables.type === "service" ? "services" : "departments"}`] });
      toast({
        title: "Успешно",
        description: "Элемент удален",
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

  const isLoading = umgLoading || servicesLoading || departmentsLoading;

  const buildTree = (): TreeNode[] => {
    const tree: TreeNode[] = [];

    umgList.forEach((umg) => {
      const umgNode: TreeNode = {
        id: `umg-${umg.id}`,
        name: umg.name,
        type: "umg",
        children: [],
      };

      const umgServices = services.filter((s) => s.umgId === umg.id);
      umgServices.forEach((service) => {
        const serviceNode: TreeNode = {
          id: `service-${service.id}`,
          name: service.name,
          type: "service",
          children: [],
        };

        const serviceDepartments = departments.filter((d) => d.serviceId === service.id);

        const buildDepartmentTree = (parentId?: string): TreeNode[] => {
          return serviceDepartments
            .filter((d) => d.parentId === parentId)
            .map((dept) => ({
              id: `dept-${dept.id}`,
              name: dept.name,
              type: "department" as const,
              children: buildDepartmentTree(dept.id),
            }));
        };

        serviceNode.children = buildDepartmentTree();
        umgNode.children!.push(serviceNode);
      });

      tree.push(umgNode);
    });

    return tree;
  };

  const orgStructure = buildTree();

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleEdit = (nodeId: string, type: string) => {
    const id = nodeId.split("-")[1];
    if (type === "umg") {
      const item = umgList.find((u) => u.id === id);
      setSelectedItem(item);
      setDialogOpen("umg");
    } else if (type === "service") {
      const item = services.find((s) => s.id === id);
      setSelectedItem(item);
      setDialogOpen("service");
    } else {
      const item = departments.find((d) => d.id === id);
      setSelectedItem(item);
      setDialogOpen("department");
    }
  };

  const handleDelete = (nodeId: string, type: string, name: string) => {
    const id = nodeId.split("-")[1];
    setDeleteDialog({ open: true, type, id, name });
  };

  const confirmDelete = () => {
    if (deleteDialog) {
      deleteMutation.mutate({ type: deleteDialog.type, id: deleteDialog.id });
    }
  };

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.id} style={{ marginLeft: `${level * 24}px` }}>
          <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md group">
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer"
              onClick={() => hasChildren && toggleNode(node.id)}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )
              ) : (
                <div className="w-4" />
              )}
              {node.type === "umg" && <Building2 className="h-4 w-4 text-primary" />}
              {node.type === "service" && <Users className="h-4 w-4 text-blue-600" />}
              {node.type === "department" && <Users className="h-4 w-4 text-green-600" />}
              <span className="font-medium text-sm">{node.name}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(node.id, node.type)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(node.id, node.type, node.name)}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isExpanded && hasChildren && renderTree(node.children!, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Организационная структура</h1>
          <p className="text-muted-foreground">УМГ → Службы → Подразделения</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button data-testid="button-add-org">
              <Plus className="mr-2 h-4 w-4" />
              Добавить элемент
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setSelectedItem(null); setDialogOpen("umg"); }}>
              <Building2 className="mr-2 h-4 w-4" />
              Добавить УМГ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSelectedItem(null); setDialogOpen("service"); }}>
              <Users className="mr-2 h-4 w-4" />
              Добавить службу
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSelectedItem(null); setDialogOpen("department"); }}>
              <Users className="mr-2 h-4 w-4" />
              Добавить подразделение
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Структура организации</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" style={{ marginLeft: `${i * 24}px` }} />
              ))}
            </div>
          ) : orgStructure.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Нет данных об организационной структуре
            </div>
          ) : (
            <div className="space-y-1">{renderTree(orgStructure)}</div>
          )}
        </CardContent>
      </Card>

      <UMGDialog
        isOpen={dialogOpen === "umg"}
        onClose={() => { setDialogOpen(null); setSelectedItem(null); }}
        umg={selectedItem}
      />

      <ServiceDialog
        isOpen={dialogOpen === "service"}
        onClose={() => { setDialogOpen(null); setSelectedItem(null); }}
        service={selectedItem}
        umgList={umgList}
      />

      <DepartmentDialog
        isOpen={dialogOpen === "department"}
        onClose={() => { setDialogOpen(null); setSelectedItem(null); }}
        department={selectedItem}
        services={services}
        departments={departments}
      />

      <AlertDialog open={deleteDialog?.open || false} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены что хотите удалить "{deleteDialog?.name}"? Это действие нельзя отменить.
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
