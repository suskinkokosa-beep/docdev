import { useQuery } from "@tanstack/react-query";

interface Permission {
  id: string;
  module: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
}

interface AuthResponse {
  user: any;
  permissions: Permission[];
  roles: Role[];
}

export function usePermissions() {
  const { data, isLoading, isError } = useQuery<AuthResponse>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false,
  });

  const hasPermission = (module: string, action: string): boolean => {
    if (!data?.permissions) return false;
    return data.permissions.some(
      (p) => p.module === module && p.action === action
    );
  };

  const isAdmin = (): boolean => {
    if (!data?.roles) return false;
    return data.roles.some((role) => role.name.toLowerCase() === 'admin' || role.name.toLowerCase() === 'администратор');
  };

  const hasRole = (roleName: string): boolean => {
    if (!data?.roles) return false;
    return data.roles.some((role) => role.name.toLowerCase() === roleName.toLowerCase());
  };

  const canCreate = (module: string) => hasPermission(module, 'create');
  const canEdit = (module: string) => hasPermission(module, 'edit');
  const canDelete = (module: string) => hasPermission(module, 'delete');
  const canView = (module: string) => hasPermission(module, 'view');
  const canUpload = (module: string) => hasPermission(module, 'upload');

  return {
    user: data?.user,
    permissions: data?.permissions,
    roles: data?.roles,
    isLoading,
    isError,
    hasPermission,
    isAdmin,
    hasRole,
    canCreate,
    canEdit,
    canDelete,
    canView,
    canUpload,
  };
}
