'use client';

import { useState } from 'react';
import { useGetMyAssignmentsQuery } from '@/store/api/workerProfileApi';
import type { AssignmentRow } from '@/types/assignments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, MapPin, Car, Calendar } from 'lucide-react';

interface MyAssignmentsTabProps {
    workerId: string;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function AssignmentDetails({ assignment }: { assignment: AssignmentRow }) {
    return (
        <div className="space-y-1 text-sm">
            <div className="flex items-center gap-1 font-medium text-base">
                {assignment.site.name}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {assignment.site.address}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(assignment.assignedDate)}
            </div>
            {assignment.car && (
                <div className="flex items-center gap-1 text-muted-foreground">
                    <Car className="h-3 w-3" />
                    {assignment.car.name} — {assignment.car.number}
                </div>
            )}
        </div>
    );
}

function TodayAssignmentCard({ assignment }: { assignment: AssignmentRow }) {
    return (
        <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Today</CardTitle>
            </CardHeader>
            <CardContent>
                <AssignmentDetails assignment={assignment} />
            </CardContent>
        </Card>
    );
}

function UpcomingAssignmentList({ assignments }: { assignments: AssignmentRow[] }) {
    if (assignments.length === 0) return null;

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming
            </h3>
            {assignments.map((a) => (
                <Card key={a.id}>
                    <CardContent className="pt-4">
                        <AssignmentDetails assignment={a} />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function PastAssignmentList({ assignments }: { assignments: AssignmentRow[] }) {
    const [open, setOpen] = useState(false);

    if (assignments.length === 0) return null;

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-4 py-2 text-sm font-semibold hover:bg-muted/50 transition-colors">
                <span className="text-muted-foreground uppercase tracking-wide">
                    Past Assignments ({assignments.length})
                </span>
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
                {assignments.map((a) => (
                    <Card key={a.id} className="opacity-75">
                        <CardContent className="pt-4">
                            <div className="space-y-1 text-sm">
                                <div className="font-medium">{a.site.name}</div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(a.assignedDate)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

export function MyAssignmentsTab({ workerId }: MyAssignmentsTabProps) {
    const { data, isLoading, isError } = useGetMyAssignmentsQuery(workerId);

    if (isLoading) {
        return <div className="py-8 text-center text-sm text-muted-foreground">Loading assignments...</div>;
    }

    if (isError || !data) {
        return <div className="py-8 text-center text-sm text-destructive">Failed to load assignments.</div>;
    }

    const hasAnything = data.today || data.upcoming.length > 0 || data.history.length > 0;

    if (!hasAnything) {
        return <div className="py-8 text-center text-sm text-muted-foreground">No assignments found.</div>;
    }

    return (
        <div className="space-y-4 p-4">
            {data.today && <TodayAssignmentCard assignment={data.today} />}
            <UpcomingAssignmentList assignments={data.upcoming} />
            <PastAssignmentList assignments={data.history} />
        </div>
    );
}

export default MyAssignmentsTab;
