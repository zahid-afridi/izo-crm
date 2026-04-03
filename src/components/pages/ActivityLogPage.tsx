"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Search,
  Download,
  Filter,
  Eye,
  Edit,
  Trash2,
  Plus,
  UserPlus,
  Package,
  FileText,
  ShoppingCart,
  Settings,
  AlertCircle,
  Loader,
} from "lucide-react";
import { toast } from "sonner";

interface ActivityLogPageProps {
  userRole: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
  action: string;
  module: string;
  description: string;
  ipAddress?: string;
  entityId?: string;
  entityType?: string;
  oldValues?: any;
  newValues?: any;
}

const activityIcons: Record<string, any> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  view: Eye,
  login: UserPlus,
  logout: UserPlus,
  settings: Settings,
  order: ShoppingCart,
  product: Package,
  offer: FileText,
  error: AlertCircle,
  download: Download,
  export: Download,
  publish: Plus,
  unpublish: Trash2,
  approve: Plus,
  reject: Trash2,
  lock: AlertCircle,
  unlock: AlertCircle,
};

const activityColors: Record<string, string> = {
  create: "text-green-600 bg-green-100",
  update: "text-blue-600 bg-blue-100",
  delete: "text-red-600 bg-red-100",
  view: "text-gray-600 bg-gray-100",
  login: "text-brand-600 bg-brand-100",
  logout: "text-orange-600 bg-orange-100",
  settings: "text-orange-600 bg-orange-100",
  order: "text-cyan-600 bg-cyan-100",
  product: "text-indigo-600 bg-indigo-100",
  offer: "text-yellow-600 bg-yellow-100",
  error: "text-red-600 bg-red-100",
  download: "text-purple-600 bg-purple-100",
  export: "text-purple-600 bg-purple-100",
  publish: "text-green-600 bg-green-100",
  unpublish: "text-red-600 bg-red-100",
  approve: "text-green-600 bg-green-100",
  reject: "text-red-600 bg-red-100",
  lock: "text-red-600 bg-red-100",
  unlock: "text-green-600 bg-green-100",
};

export function ActivityLogPage({
  userRole,
}: ActivityLogPageProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  
  // Calculate date range: from 1 year ago to today
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const [dateFrom, setDateFrom] = useState(oneYearAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const canExport = userRole === "admin";

  useEffect(() => {
    fetchActivityLogs();
  }, [actionFilter, moduleFilter, dateFrom, dateTo, offset]);

  const fetchActivityLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (moduleFilter !== 'all') params.append('module', moduleFilter);
      
      // Only add date filters if they're explicitly set
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      console.log('Fetching activity logs with params:', {
        dateFrom,
        dateTo,
        action: actionFilter,
        module: moduleFilter,
        url: `/api/activity-logs?${params.toString()}`,
      });

      const response = await fetch(`/api/activity-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');

      const data = await response.json();
      console.log('Activity logs response:', data);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast.error(t('activityLog.loadingFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.fullName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      log.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      log.module
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getActionIcon = (action: string) => {
    const Icon = activityIcons[action] || AlertCircle;
    const colorClass =
      activityColors[action] || "text-gray-600 bg-gray-100";
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}
      >
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  const getActionLabel = (action: string) => {
    const key = `activityLog.actions.${action}`;
    const translated = t(key);
    return translated !== key ? translated : action;
  };

  const getModuleLabel = (module: string) => {
    const key = `activityLog.modules.${module}`;
    const translated = t(key);
    return translated !== key ? translated : module;
  };

  const getRoleLabel = (role: string) => {
    const key = `roles.${role}`;
    const translated = t(key);
    return translated !== key ? translated : role;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">{t('activityLog.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('activityLog.subtitle')}
          </p>
        </div>
        {canExport && (
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('activityLog.exportLogs')}
          </Button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">
            {t('activityLog.totalActivities')}
          </p>
          <p className="text-gray-900">
            {total}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('activityLog.created')}</p>
          <p className="text-2xl font-semibold text-green-600">
            {
              logs.filter(
                (l) => l.action === "create",
              ).length
            }
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('activityLog.updated')}</p>
          <p className="text-2xl font-semibold text-blue-600">
            {
              logs.filter(
                (l) => l.action === "update",
              ).length
            }
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('activityLog.deleted')}</p>
          <p className="text-2xl font-semibold text-red-600">
            {
              logs.filter(
                (l) => l.action === "delete",
              ).length
            }
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">
            {t('activityLog.activeUsers')}
          </p>
          <p className="text-gray-900">
            {new Set(logs.map((l) => l.user.id)).size}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-gray-900">{t('activityLog.filters')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={t('activityLog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('activityLog.actionType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('activityLog.allActions')}</SelectItem>
                <SelectItem value="create">{t('activityLog.actions.create')}</SelectItem>
                <SelectItem value="update">{t('activityLog.actions.update')}</SelectItem>
                <SelectItem value="delete">{t('activityLog.actions.delete')}</SelectItem>
                <SelectItem value="view">{t('activityLog.actions.view')}</SelectItem>
                <SelectItem value="login">{t('activityLog.actions.login')}</SelectItem>
                <SelectItem value="logout">{t('activityLog.actions.logout')}</SelectItem>
                <SelectItem value="export">{t('activityLog.actions.export')}</SelectItem>
                <SelectItem value="publish">{t('activityLog.actions.publish')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={moduleFilter}
              onValueChange={(value) => {
                setModuleFilter(value);
                setOffset(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('activityLog.module')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('activityLog.allModules')}</SelectItem>
                <SelectItem value="Products">{t('activityLog.modules.Products')}</SelectItem>
                <SelectItem value="Services">{t('activityLog.modules.Services')}</SelectItem>
                <SelectItem value="Orders">{t('activityLog.modules.Orders')}</SelectItem>
                <SelectItem value="Clients">{t('activityLog.modules.Clients')}</SelectItem>
                <SelectItem value="Offers">{t('activityLog.modules.Offers')}</SelectItem>
                <SelectItem value="Sites">{t('activityLog.modules.Sites')}</SelectItem>
                <SelectItem value="Workers">{t('activityLog.modules.Workers')}</SelectItem>
                <SelectItem value="Cars">{t('activityLog.modules.Cars')}</SelectItem>
                <SelectItem value="Teams">{t('activityLog.modules.Teams')}</SelectItem>
                <SelectItem value="Assignments">{t('activityLog.modules.Assignments')}</SelectItem>
                <SelectItem value="Website">{t('activityLog.modules.Website')}</SelectItem>
                <SelectItem value="Settings">{t('activityLog.modules.Settings')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setOffset(0);
              }}
            />
          </div>
        </div>

        <div className="mt-4">
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setOffset(0);
            }}
            placeholder={t('activityLog.dateTo')}
          />
        </div>
      </Card>

      {/* Activity Log Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('activityLog.timestamp')}</TableHead>
                  <TableHead>{t('activityLog.action')}</TableHead>
                  <TableHead>{t('activityLog.user')}</TableHead>
                  <TableHead>{t('activityLog.role')}</TableHead>
                  <TableHead>{t('activityLog.module')}</TableHead>
                  <TableHead>{t('activityLog.description')}</TableHead>
                  <TableHead>{t('activityLog.ipAddress')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {t('activityLog.noLogsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-gray-600 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge
                            variant="outline"
                            className="capitalize"
                          >
                            {getActionLabel(log.action)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {log.user.fullName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getRoleLabel(log.user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getModuleLabel(log.module)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 max-w-[300px]">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-gray-500 text-xs">
                        {log.ipAddress || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('activityLog.showingRange', {
              from: offset + 1,
              to: Math.min(offset + limit, total),
              total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              {t('activityLog.previous')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
            >
              {t('activityLog.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}