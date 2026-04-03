"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Plus, Search, Users, Edit, Trash2, UserPlus, Loader, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface TeamsPageProps {
  userRole: string;
}

interface Worker {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
}

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface TeamLead {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  teamLeadId: string;
  teamLead: TeamLead;
  memberIds: string[];
  members: TeamMember[];
  memberCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function TeamsPage({ userRole }: TeamsPageProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamLeadId: '',
    memberIds: [] as string[],
    status: 'active',
  });

  const [teams, setTeams] = useState<Team[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  // Handle create dialog close - reset all form data and states
  const handleCreateDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);

    // If dialog is being closed, reset all form data
    if (!open) {
      resetForm();
    }
  };

  // Handle edit dialog close - reset all form data and states
  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);

    // If dialog is being closed, reset all form data
    if (!open) {
      resetForm();
    }
  };

  // Load teams and workers on mount
  useEffect(() => {
    loadTeams();
    loadWorkers();
  }, []);

  // Reload when filters change
  useEffect(() => {
    loadTeams();
  }, [statusFilter, searchQuery]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/teams?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Error loading teams:', err);
      toast.error(t('teams.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    setLoadingWorkers(true);
    try {
      const response = await fetch('/api/teams/workers');
      if (!response.ok) throw new Error('Failed to fetch workers');
      const data = await response.json();
      setWorkers(data.workers || []);
    } catch (err) {
      console.error('Error loading workers:', err);
      toast.error(t('workers.failedToFetch'));
    } finally {
      setLoadingWorkers(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      teamLeadId: '',
      memberIds: [],
      status: 'active',
    });
    setError('');
    setEditingTeam(null);
  };

  const toggleMemberSelection = (workerId: string) => {
    // Prevent removing team lead from members
    if (workerId === formData.teamLeadId && formData.memberIds.includes(workerId)) {
      return; // Don't allow removing team lead
    }

    setFormData((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(workerId)
        ? prev.memberIds.filter((id) => id !== workerId)
        : [...prev.memberIds, workerId],
    }));
  };

  // Automatically include team lead in members when selected
  const handleTeamLeadChange = (teamLeadId: string) => {
    setFormData((prev) => ({
      ...prev,
      teamLeadId,
      memberIds: prev.memberIds.includes(teamLeadId)
        ? prev.memberIds
        : [...prev.memberIds, teamLeadId],
    }));
  };

  const handleCreateTeam = async () => {
    setError('');

    if (!formData.name.trim()) {
      setError(t('teams.teamNameRequired'));
      return;
    }

    if (!formData.teamLeadId) {
      setError(t('teams.teamLeadRequired'));
      return;
    }

    if (formData.memberIds.length === 0) {
      setError(t('teams.atLeastOneMember'));
      return;
    }

    // Clean up memberIds - remove duplicates and ensure team lead is included
    const uniqueMemberIds = [...new Set(formData.memberIds)];
    if (!uniqueMemberIds.includes(formData.teamLeadId)) {
      uniqueMemberIds.push(formData.teamLeadId);
    }

    console.log('Creating team with cleaned data:', {
      name: formData.name,
      teamLeadId: formData.teamLeadId,
      originalMemberIds: formData.memberIds,
      cleanedMemberIds: uniqueMemberIds,
    });

    setSubmitting(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          memberIds: uniqueMemberIds, // Use cleaned memberIds
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create team');
      }

      toast.success(t('teams.createSuccess'));
      resetForm();
      setIsCreateDialogOpen(false);
      loadTeams();
    } catch (err: any) {
      setError(err.message || t('teams.failedToCreate'));
      toast.error(err.message || t('teams.failedToCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;

    setError('');

    if (!formData.name.trim()) {
      setError(t('teams.teamNameRequired'));
      return;
    }

    if (!formData.teamLeadId) {
      setError(t('teams.teamLeadRequired'));
      return;
    }

    if (formData.memberIds.length === 0) {
      setError(t('teams.atLeastOneMember'));
      return;
    }

    // Clean up memberIds - remove duplicates and ensure team lead is included
    const uniqueMemberIds = [...new Set(formData.memberIds)];
    if (!uniqueMemberIds.includes(formData.teamLeadId)) {
      uniqueMemberIds.push(formData.teamLeadId);
    }

    console.log('Updating team with cleaned data:', {
      name: formData.name,
      teamLeadId: formData.teamLeadId,
      originalMemberIds: formData.memberIds,
      cleanedMemberIds: uniqueMemberIds,
    });

    setSubmitting(true);
    try {
      const response = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          memberIds: uniqueMemberIds, // Use cleaned memberIds
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update team');
      }

      toast.success(t('teams.updateSuccess'));
      resetForm();
      setIsEditDialogOpen(false);
      loadTeams();
    } catch (err: any) {
      setError(err.message || t('teams.failedToUpdate'));
      toast.error(err.message || t('teams.failedToUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm(t('teams.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete team');

      toast.success(t('teams.deleteSuccess'));
      loadTeams();
    } catch (err: any) {
      toast.error(err.message || t('teams.failedToDelete'));
    }
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      teamLeadId: team.teamLeadId,
      memberIds: team.memberIds,
      status: team.status,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (team: Team) => {
    setViewingTeam(team);
    setIsViewDialogOpen(true);
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.teamLead.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get available workers (all workers for member selection)
  const availableWorkers = workers;

  // Get selected members details
  const selectedMembersDetails = workers.filter((w) => formData.memberIds.includes(w.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('teams.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('teams.subtitle')}</p>
        </div>
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('teams.createTeam')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('teams.createNewTeam')}</DialogTitle>
              </DialogHeader>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>{t('teams.teamName')} *</Label>
                    <Input
                      placeholder={t('teams.placeholderTeamName')}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>{t('teams.description')}</Label>
                    <Textarea
                      placeholder={t('teams.placeholderDescription')}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>{t('teams.teamMembers')} *</Label>
                    <p className="text-sm text-gray-500 mb-2">{t('teams.selectMembersFirst')}</p>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                      {loadingWorkers ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : availableWorkers.length > 0 ? (
                        availableWorkers.map((worker) => (
                          <div
                            key={worker.id}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${worker.id === formData.teamLeadId
                              ? 'border-amber-500 bg-amber-50 cursor-default'
                              : formData.memberIds.includes(worker.id)
                                ? 'border-blue-500 bg-blue-50 cursor-pointer'
                                : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                              }`}
                            onClick={() => worker.id !== formData.teamLeadId && toggleMemberSelection(worker.id)}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={formData.memberIds.includes(worker.id)}
                                disabled={worker.id === formData.teamLeadId}
                                onChange={() => worker.id !== formData.teamLeadId && toggleMemberSelection(worker.id)}
                                className="rounded"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-900">{worker.fullName}</p>
                                  {worker.id === formData.teamLeadId && (
                                    <Badge variant="outline" className="text-xs bg-amber-50">{t('teams.leader')}</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{worker.email}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">{t('teams.noWorkersAvailable')}</div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{t('teams.workersSelected', { count: formData.memberIds.length })}</p>
                  </div>

                  <div className="col-span-2">
                    <Label>{t('teams.teamLeaderChef')} *</Label>
                    <p className="text-sm text-gray-500 mb-2">{t('teams.mustBeFromMembers')}</p>
                    <Select value={formData.teamLeadId} onValueChange={handleTeamLeadChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('teams.selectLeaderPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedMembersDetails.length > 0 ? (
                          selectedMembersDetails.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.fullName} ({worker.email})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">{t('teams.selectMembersFirstHint')}</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>{t('teams.status')}</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('teams.active')}</SelectItem>
                        <SelectItem value="inactive">{t('teams.inactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleCreateDialogClose(false);
                    }}
                    disabled={submitting}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={submitting || !formData.teamLeadId || formData.memberIds.length === 0}>
                    {submitting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {submitting ? t('teams.creating') : t('teams.createTeam')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('teams.totalTeams')}</p>
          <p className="text-2xl font-semibold text-gray-900">{teams.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('teams.activeTeams')}</p>
          <p className="text-2xl font-semibold text-gray-900">{teams.filter((t) => t.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('teams.totalWorkersInTeams')}</p>
          <p className="text-2xl font-semibold text-gray-900">
            {(() => {
              const total = teams.reduce((sum, t) => sum + t.memberCount, 0);
              console.log('Teams analytics:', {
                teams: teams.map(t => ({ name: t.name, memberCount: t.memberCount, memberIds: t.memberIds })),
                totalWorkers: total
              });
              return total;
            })()}
          </p>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('teams.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('teams.allStatus')}</SelectItem>
            <SelectItem value="active">{t('teams.active')}</SelectItem>
            <SelectItem value="inactive">{t('teams.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">{t('teams.noTeamsFound')}</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? t('teams.tryDifferentSearch') : t('teams.createFirstTeam')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-medium">{team.name}</h3>
                    <p className="text-sm text-gray-500">{t('teams.membersCount', { count: team.memberCount })}</p>
                  </div>
                </div>
                <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>{team.status === 'active' ? t('teams.active') : t('teams.inactive')}</Badge>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{t('teams.teamLeader')}</span>
                </div>
                <Badge variant="outline" className="bg-amber-50">
                  {team.teamLead.fullName}
                </Badge>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">{t('teams.teamMembers')}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.slice(0, 3).map((member) => (
                    <Badge key={member.id} variant="secondary" className="text-xs">
                      {member.fullName}
                    </Badge>
                  ))}
                  {team.members.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      {t('teams.moreMembers', { count: team.members.length - 3 })}
                    </Badge>
                  )}
                </div>
              </div>

              {team.description && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                  {team.description}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t text-xs text-gray-500">
                <span>{t('teams.created')} {new Date(team.createdAt).toLocaleDateString()}</span>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openViewDialog(team)} title={t('teams.viewMembers')}>
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(team)} title={t('teams.editTeamTooltip')}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTeam(team.id)} title={t('teams.deleteTeamTooltip')}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {canEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('teams.editTeam')}</DialogTitle>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Team Name *</Label>
                  <Input
                    placeholder="e.g., Team Alpha, Group A, etc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Team description and notes"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Team Members *</Label>
                  <p className="text-sm text-gray-500 mb-2">Select members first, then choose a leader from them</p>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                    {loadingWorkers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : availableWorkers.length > 0 ? (
                      availableWorkers.map((worker) => (
                        <div
                          key={worker.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${worker.id === formData.teamLeadId
                            ? 'border-amber-500 bg-amber-50 cursor-default'
                            : formData.memberIds.includes(worker.id)
                              ? 'border-blue-500 bg-blue-50 cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                            }`}
                          onClick={() => worker.id !== formData.teamLeadId && toggleMemberSelection(worker.id)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={formData.memberIds.includes(worker.id)}
                              disabled={worker.id === formData.teamLeadId}
                              onChange={() => worker.id !== formData.teamLeadId && toggleMemberSelection(worker.id)}
                              className="rounded"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-900">{worker.fullName}</p>
                                {worker.id === formData.teamLeadId && (
                                  <Badge variant="outline" className="text-xs bg-amber-50">{t('teams.leader')}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{worker.email}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">{t('teams.noWorkersAvailable')}</div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{t('teams.workersSelected', { count: formData.memberIds.length })}</p>
                </div>

                <div className="col-span-2">
                  <Label>Team Leader (Chef) *</Label>
                  <p className="text-sm text-gray-500 mb-2">Must be selected from team members</p>
                  <Select value={formData.teamLeadId} onValueChange={handleTeamLeadChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team leader from members" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedMembersDetails.length > 0 ? (
                        selectedMembersDetails.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.fullName} ({worker.email})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">{t('teams.selectMembersFirstHint')}</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleEditDialogClose(false);
                  }}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleUpdateTeam} disabled={submitting || !formData.teamLeadId || formData.memberIds.length === 0}>
                  {submitting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {submitting ? t('teams.updating') : t('teams.updateTeam')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('teams.teamDetails')}</DialogTitle>
          </DialogHeader>
          {viewingTeam && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('teams.teamName')}</p>
                  <p className="text-gray-900 font-medium">{viewingTeam.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('teams.status')}</p>
                  <Badge className="mt-1">{viewingTeam.status === 'active' ? t('teams.active') : t('teams.inactive')}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('teams.teamLeader')}</p>
                  <p className="text-gray-900">{viewingTeam.teamLead.fullName}</p>
                  <p className="text-xs text-gray-600">{viewingTeam.teamLead.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('teams.totalMembers')}</p>
                  <p className="text-gray-900 font-medium">{viewingTeam.memberCount}</p>
                </div>
                {viewingTeam.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">{t('teams.description')}</p>
                    <p className="text-gray-900">{viewingTeam.description}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-2">{t('teams.teamMembers')}</p>
                  <div className="space-y-2">
                    {viewingTeam.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm text-gray-900">{member.fullName}</p>
                          <p className="text-xs text-gray-600">{member.email}</p>
                        </div>
                        {member.id === viewingTeam.teamLeadId && <Badge variant="outline">{t('teams.leader')}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 text-xs text-gray-500">
                  {t('teams.created')} {new Date(viewingTeam.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  {t('common.close')}
                </Button>
                {canEdit && (
                  <Button
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      openEditDialog(viewingTeam);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
