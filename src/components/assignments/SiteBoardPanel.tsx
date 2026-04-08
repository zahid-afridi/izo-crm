'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useGetBoardQuery } from '@/store/api/assignmentsApi';
import type { SiteBoardEntry } from '@/types/assignments';
import { SiteAssignmentCard } from './SiteAssignmentCard';
import { AssignmentFormModal } from './AssignmentFormModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SiteBoardPanelProps {
    date: string; // YYYY-MM-DD
}

export function SiteBoardPanel({ date }: SiteBoardPanelProps) {
    const { data, isLoading } = useGetBoardQuery(date);
    const [modalSite, setModalSite] = useState<{ id: string; name: string } | null>(null);

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading...</p>;
    }

    const entries: SiteBoardEntry[] = data?.entries ?? [];
    const allSites = data?.allSites ?? [];

    // Build a set of site IDs that already have assignment cards
    const assignedSiteIds = new Set(entries.map((e) => e.site.id));

    // Sites with no assignments for this date
    const emptySites = allSites.filter((s) => !assignedSiteIds.has(s.id));

    if (entries.length === 0 && emptySites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <p className="text-sm">No sites found.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Sites with assignments */}
                {entries.map((entry: SiteBoardEntry) => (
                    <SiteAssignmentCard key={entry.site.id} entry={entry} date={date} />
                ))}

                {/* Sites with no assignments — show empty card with Add button */}
                {emptySites.map((site) => (
                    <Card key={site.id} className="border-dashed">
                        <CardHeader className="pb-2">
                            <p className="font-bold text-base">{site.name}</p>
                            <p className="text-sm text-muted-foreground">{site.address}</p>
                        </CardHeader>
                        <CardContent>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-1"
                                onClick={() => setModalSite(site)}
                            >
                                <Plus className="h-4 w-4" />
                                Add Assignment
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal for empty-site cards */}
            {modalSite && (
                <AssignmentFormModal
                    siteId={modalSite.id}
                    date={date}
                    open={!!modalSite}
                    onOpenChange={(open) => { if (!open) setModalSite(null); }}
                    onSuccess={() => setModalSite(null)}
                />
            )}
        </>
    );
}
