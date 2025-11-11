import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Plus, Building2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export function OrgStructurePage() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { data: umgList = [], isLoading: umgLoading } = useQuery<UMG[]>({
    queryKey: ['/api/umg'],
    queryFn: async () => {
      const response = await fetch('/api/umg', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch UMG');
      return response.json();
    },
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ['/api/departments'],
    queryFn: async () => {
      const response = await fetch('/api/departments', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
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
        const rootDepartments = serviceDepartments.filter((d) => !d.parentId);
        
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

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.id} style={{ marginLeft: `${level * 24}px` }}>
          <div
            className="flex items-center gap-2 p-2 hover-elevate rounded-md cursor-pointer"
            onClick={() => hasChildren && toggleNode(node.id)}
            data-testid={`node-${node.id}`}
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
        <Button data-testid="button-add-org">
          <Plus className="mr-2 h-4 w-4" />
          Добавить элемент
        </Button>
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
    </div>
  );
}
