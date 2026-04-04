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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchTeams, fetchTeamWorkers, createTeam, updateTeam, deleteTeam,
  setSearchFilter, setStatusFilter, type Team,
} from '@/store/slices/teamsSlice';
import {
  selectFilteredTeams, selectTeamStats, selectTeamWorkers,
  selectTeamsIsLoading, selectTeamsIsInitialized, selectTeamsLoadingWorkers, selectTeamsFilters,
} from '@/store/selectors/teamsSelectors';

interface TeamsPageProps { userRole: string; }

const EMPTY_FORM = { name: '', description: '', teamLeadId: '', memberIds: [] as string[], status: 'active' };

export function TeamsPage({ userRole }: TeamsPageProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const filteredTeams = useAppSelector(selectFilteredTeams);
  const stats = useAppSelector(selectTeamStats);
  const workers = useAppSelector(selectTeamWorkers);
  const loading = useAppSelector(selectTeamsIsLoading);
  const isInitialized = useAppSelector(selectTeamsIsInitialized);
  const loadingWorkers = useAppSelector(selectTeamsLoadingWorkers);
  const filters = useAppSelector(selectTeamsFilters);

  const [searchQuery, setSearchQuery] = useState(filters.search);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);

  const canEdit = ['admin', 'site_manager'].includes(userRole);
  const canDelete = userRole === 'admin';

  useEffect(() => {
    if (!isInitialized) dispatch(fetchTeams());
    dispatch(fetchTeamWorkers());
  }, [dispatch, isInitialized]);

  useEffect(() => {
    const timer = setTimeout(() => dispatch(setSearchFilter(searchQuery)), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, dispatch]);

  const resetForm = () => { setFormData(EMPTY_FORM); setFormError(''); setEditingTeam(null); };

  const toggleMemberSelection = (workerId: string) => {
    if (workerId === formData.teamLeadId && formData.memberIds.includes(workerId)) return;
    setFormData((p) => ({
      ...p,
      memberIds: p.memberIds.includes(workerId)
        ? p.memberIds.filter((id) => id !== workerId)
        : [...p.memberIds, workerId],
    }));
  };

  const handleTeamLeadChange = (teamLeadId: string) => {
    setFormData((p) => ({
      ...p,
      teamLeadId,
      memberIds: p.memberIds.includes(teamLeadId) ? p.memberIds : [...p.memberIds, teamLeadId],
    }));
  };

  const buildPayload = () => {
    const uniqueMemberIds = [...new Set(formData.memberIds)];
    if (!uniqueMemberIds.includes(formData.teamLeadId)) uniqueMemberIds.push(formData.teamLeadId);
    return { ...formData, memberIds: uniqueMemberIds };
  };

  const validate = () => {
    if (!formData.name.trim()) { setFormError(t('teams.teamNameRequired')); return false; }
    if (!formData.teamLeadId) { setFormError(t('teams.teamLeadRequired')); return false; }
    if (formData.memberIds.length === 0) { setFormError(t('teams.atLeastOneMember')); return false; }
    return true;
  };

  const handleCreateTeam = async () => {
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);
    const result = await dispatch(createTeam(buildPayload()));
    setSubmitting(false);
    if (createTeam.fulfilled.match(result)) {
      toast.success(t('teams.createSuccess'));
      resetForm();
      setIsCreateDialogOpen(false);
    } else {
      const msg = (result.payload as string) || t('teams.failedToCreate');
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);
    const result = await dispatch(updateTeam({ id: editingTeam.id, data: buildPayload() }));
    setSubmitting(false);
    if (updateTeam.fulfilled.match(result)) {
      toast.success(t('teams.updateSuccess'));
      resetForm();
      setIsEditDialogOpen(false);
    } else {
      const msg = (result.payload as string) || t('teams.failedToUpdate');
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm(t('teams.deleteConfirm'))) return;
    const result = await dispatch(deleteTeam(id));
    if (deleteTeam.fulfilled.match(result)) {
      toast.success(t('teams.deleteSuccess'));
    } else {
      toast.error(t('teams.failedToDelete'));
    }
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setFormData({ name: team.name, description: team.description || '', teamLeadId: team.teamLeadId, memberIds: team.memberIds, status: team.status });
    setIsEditDialogOpen(true);
  };

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
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />{t('teams.createTeam')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('teams.createNewTeam')}</DialogTitle></DialogHeader>
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <TeamForm
                formData={formData}
                workers={workers}
                loadingWorkers={loadingWorkers}
                selectedMembersDetails={selectedMembersDetails}
                onChange={(f) => setFormData((p) => ({ ...p, ...f }))}
                onToggleMember={toggleMemberSelection}
                onTeamLeadChange={handleTeamLeadChange}
                t={t}
              />
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }} disabled={submitting}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateTeam} disabled={submitting || !formData.teamLeadId || formData.memberIds.length === 0}>
                  {submitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                  {submitting ? t('teams.creating') : t('teams.createTeam')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('teams.totalTeams')}</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('teams.activeTeams')}</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500 mb-1">{t('teams.totalWorkersInTeams')}</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.totalWorkers}</p>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder={t('teams.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filters.status} onValueChange={(v) => dispatch(setStatusFilter(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
                <Badge variant={team.status === 'active' ? 'default' : 'secondary'}>
                  {team.status === 'active' ? t('teams.active') : t('teams.inactive')}
                </Badge>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{t('teams.teamLeader')}</span>
                </div>
                <Badge variant="outline" className="bg-amber-50">{team.teamLead.fullName}</Badge>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">{t('teams.teamMembers')}</p>
                <div className="flex flex-wrap gap-2">
                  {team.members.slice(0, 3).map((member) => (
                    <Badge key={member.id} variant="secondary" className="text-xs">{member.fullName}</Badge>
                  ))}
                  {team.members.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      {t('teams.moreMembers', { count: team.members.length - 3 })}
                    </Badge>
                  )}
                </div>
              </div>

              {team.description && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600">{team.description}</div>
              )}

              <div className="flex items-center justify-between pt-4 border-t text-xs text-gray-500">
                <span>{t('teams.created')} {new Date(team.createdAt).toLocaleDateString()}</span>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setViewingTeam(team); setIsViewDialogOpen(true); }} title={t('teams.viewMembers')}>
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
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t('teams.editTeam')}</DialogTitle></DialogHeader>
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <TeamForm
              formData={formData}
              workers={workers}
              loadingWorkers={loadingWorkers}
              selectedMembersDetails={selectedMembersDetails}
              onChange={(f) => setFormData((p) => ({ ...p, ...f }))}
              onToggleMember={toggleMemberSelection}
              onTeamLeadChange={handleTeamLeadChange}
              t={t}
            />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdateTeam} disabled={submitting || !formData.teamLeadId || formData.memberIds.length === 0}>
                {submitting && <Loader className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? t('teams.updating') : t('teams.updateTeam')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{viewingTeam?.name}</DialogTitle></DialogHeader>
          {viewingTeam && (
            <div className="space-y-4 mt-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">{t('teams.teamLeader')}</p>
                <Badge variant="outline" className="bg-amber-50">{viewingTeam.teamLead.fullName}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t('teams.teamMembers')} ({viewingTeam.memberCount})
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {viewingTeam.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm text-gray-900">{member.fullName}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                      {member.id === viewingTeam.teamLeadId && (
                        <Badge variant="outline" className="text-xs bg-amber-50">{t('teams.leader')}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {viewingTeam.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">{t('teams.description')}</p>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded">{viewingTeam.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TeamFormProps {
  formData: { name: string; description: string; teamLeadId: string; memberIds: string[]; status: string };
  workers: { id: string; fullName: string; email: string; role: string }[];
  loadingWorkers: boolean;
  selectedMembersDetails: { id: string; fullName: string; email: string }[];
  onChange: (fields: Partial<TeamFormProps['formData']>) => void;
  onToggleMember: (id: string) => void;
  onTeamLeadChange: (id: string) => void;
  t: (key: string, opts?: any) => string;
}

function TeamForm({ formData, workers, loadingWorkers, selectedMembersDetails, onChange, onToggleMember, onTeamLeadChange, t }: TeamFormProps) {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>{t('teams.teamName')} *</Label>
          <Input placeholder={t('teams.placeholderTeamName')} value={formData.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>{t('teams.description')}</Label>
          <Textarea placeholder={t('teams.placeholderDescription')} value={formData.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} />
        </div>
        <div className="col-span-2">
          <Label>{t('teams.teamMembers')} *</Label>
          <p className="text-sm text-gray-500 mb-2">{t('teams.selectMembersFirst')}</p>
          <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
            {loadingWorkers ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : workers.length > 0 ? (
              workers.map((worker) => (
                <div
                  key={worker.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${worker.id === formData.teamLeadId
                      ? 'border-amber-500 bg-amber-50 cursor-default'
                      : formData.memberIds.includes(worker.id)
                        ? 'border-blue-500 bg-blue-50 cursor-pointer'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  onClick={() => worker.id !== formData.teamLeadId && onToggleMember(worker.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.memberIds.includes(worker.id)}
                      disabled={worker.id === formData.teamLeadId}
                      onChange={() => worker.id !== formData.teamLeadId && onToggleMember(worker.id)}
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
          <Select value={formData.teamLeadId} onValueChange={onTeamLeadChange}>
            <SelectTrigger><SelectValue placeholder={t('teams.selectLeaderPlaceholder')} /></SelectTrigger>
            <SelectContent>
              {selectedMembersDetails.length > 0 ? (
                selectedMembersDetails.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.fullName} ({w.email})</SelectItem>
                ))
              ) : (
                <div className="p-2 text-sm text-gray-500">{t('teams.selectMembersFirstHint')}</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>{t('teams.status')}</Label>
          <Select value={formData.status} onValueChange={(v) => onChange({ status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t('teams.active')}</SelectItem>
              <SelectItem value="inactive">{t('teams.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
