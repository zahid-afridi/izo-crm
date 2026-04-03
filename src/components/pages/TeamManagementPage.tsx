'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Users,
    Search,
    Edit,
    Lock,
    Unlock,
    Mail,
    Phone,
    Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    username: string;
    role: string;
    status: string;
    isLocked: boolean;
    dateOfBirth: string | null;
    idNumber: string | null;
    address: string | null;
    lastLogin: string | null;
    createdAt: string;
    updatedAt: string;
    isOnline: boolean;
}

interface TeamStats {
    totalSalesAgents: number;
    totalOfficeEmployees: number;
    activeSalesAgents: number;
    activeOfficeEmployees: number;
    onlineSalesAgents: number;
    onlineOfficeEmployees: number;
}

export function TeamManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [stats, setStats] = useState<TeamStats>({
        totalSalesAgents: 0,
        totalOfficeEmployees: 0,
        activeSalesAgents: 0,
        activeOfficeEmployees: 0,
        onlineSalesAgents: 0,
        onlineOfficeEmployees: 0,
    });

    // Fetch team members (sales_agent and office_employee)
    const fetchTeamMembers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/users?roles=sales_agent,office_employee');

            if (!response.ok) {
                throw new Error('Failed to fetch team members');
            }

            const data = await response.json();
            setUsers(data.users || []);
            calculateStats(data.users || []);
        } catch (error) {
            console.error('Error fetching team members:', error);
            toast.error('Failed to load team members');
        } finally {
            setLoading(false);
        }
    };

    // Calculate team statistics
    const calculateStats = (teamUsers: User[]) => {
        const salesAgents = teamUsers.filter(user => user.role === 'sales_agent');
        const officeEmployees = teamUsers.filter(user => user.role === 'office_employee');

        setStats({
            totalSalesAgents: salesAgents.length,
            totalOfficeEmployees: officeEmployees.length,
            activeSalesAgents: salesAgents.filter(user => user.status === 'active').length,
            activeOfficeEmployees: officeEmployees.filter(user => user.status === 'active').length,
            onlineSalesAgents: salesAgents.filter(user => user.isOnline).length,
            onlineOfficeEmployees: officeEmployees.filter(user => user.isOnline).length,
        });
    };

    // Filter users based on search and filters
    useEffect(() => {
        let filtered = users;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.phone.includes(searchTerm)
            );
        }

        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(user => user.status === statusFilter);
        }

        setFilteredUsers(filtered);
    }, [users, searchTerm, roleFilter, statusFilter]);

    // Toggle user lock status
    const toggleUserLock = async (userId: string, isLocked: boolean) => {
        try {
            const endpoint = isLocked ? '/api/users/unlock' : '/api/users/lock';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                throw new Error(`Failed to ${isLocked ? 'unlock' : 'lock'} user`);
            }

            toast.success(`User ${isLocked ? 'unlocked' : 'locked'} successfully`);
            fetchTeamMembers(); // Refresh data
        } catch (error) {
            console.error('Error toggling user lock:', error);
            toast.error(`Failed to ${isLocked ? 'unlock' : 'lock'} user`);
        }
    };

    // Update user details
    const updateUser = async (userData: Partial<User>) => {
        try {
            const response = await fetch(`/api/users/${selectedUser?.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                throw new Error('Failed to update user');
            }

            toast.success('User updated successfully');
            setIsEditDialogOpen(false);
            setSelectedUser(null);
            fetchTeamMembers(); // Refresh data
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Failed to update user');
        }
    };

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'sales_agent':
                return 'bg-blue-100 text-blue-800';
            case 'office_employee':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'inactive':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatLastLogin = (lastLogin: string | null) => {
        if (!lastLogin) return 'Never';
        const date = new Date(lastLogin);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 60) {
            return `${diffInMinutes} minutes ago`;
        } else if (diffInMinutes < 1440) {
            return `${Math.floor(diffInMinutes / 60)} hours ago`;
        } else {
            return `${Math.floor(diffInMinutes / 1440)} days ago`;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-gray-600">Manage your Sales Agents and Office Employees</p>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Sales Agents</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.totalSalesAgents}</p>
                                <p className="text-xs text-gray-500">
                                    {stats.activeSalesAgents} active • {stats.onlineSalesAgents} online
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Office Employees</p>
                                <p className="text-2xl font-bold text-green-600">{stats.totalOfficeEmployees}</p>
                                <p className="text-xs text-gray-500">
                                    {stats.activeOfficeEmployees} active • {stats.onlineOfficeEmployees} online
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Active</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.activeSalesAgents + stats.activeOfficeEmployees}
                                </p>
                                <p className="text-xs text-gray-500">Active team members</p>
                            </div>
                            <Activity className="h-8 w-8 text-gray-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Online Now</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {stats.onlineSalesAgents + stats.onlineOfficeEmployees}
                                </p>
                                <p className="text-xs text-gray-500">Currently online</p>
                            </div>
                            <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by name, email, username, or phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="sales_agent">Sales Agents</SelectItem>
                                <SelectItem value="office_employee">Office Employees</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Team Members Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                                        <span className="text-sm font-medium text-gray-600">
                                                            {user.fullName.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-medium text-gray-900">{user.fullName}</span>
                                                        {user.isOnline && (
                                                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-gray-500">@{user.username}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getRoleColor(user.role)}>
                                                {user.role === 'sales_agent' ? 'Sales Agent' : 'Office Employee'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Mail className="h-3 w-3 mr-1" />
                                                    {user.email}
                                                </div>
                                                {user.phone && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Phone className="h-3 w-3 mr-1" />
                                                        {user.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Badge className={getStatusColor(user.status)}>
                                                    {user.status}
                                                </Badge>
                                                {user.isLocked && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Locked
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">
                                                {formatLastLogin(user.lastLogin)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className={user.isLocked ? "text-green-600" : "text-red-600"}
                                                        >
                                                            {user.isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                {user.isLocked ? 'Unlock User' : 'Lock User'}
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to {user.isLocked ? 'unlock' : 'lock'} {user.fullName}?
                                                                {!user.isLocked && ' This will prevent them from accessing the system.'}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => toggleUserLock(user.id, user.isLocked)}
                                                                className={user.isLocked ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
                                                            >
                                                                {user.isLocked ? 'Unlock' : 'Lock'}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No team members found</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Team Member</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Full Name</label>
                                <Input
                                    value={selectedUser.fullName}
                                    onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    value={selectedUser.email}
                                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Phone</label>
                                <Input
                                    value={selectedUser.phone}
                                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Status</label>
                                <Select
                                    value={selectedUser.status}
                                    onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => updateUser(selectedUser)}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}