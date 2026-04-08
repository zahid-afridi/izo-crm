'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { SiteBoardEntry, AssignmentRow } from '@/types/assignments';
import {
    useUpdateAssignmentMutation,
    useDeleteAssignmentMutation,
} from '@/store/api/assignmentsApi';
import { AssignmentFormModal } from './AssignmentFormModal';

interface SiteAssignmentCardProps {
    entry: SiteBoardEntry;
    date: string; // YYYY-MM-DD
}

export function SiteAssignmentCard({ entry, date }: SiteAssignmentCardProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [updateAssignment] = useUpdateAssignmentMutation();
    const [deleteAssignment] = useDeleteAssignmentMutation();

    return (
        <Card>
            <CardHeader className="pb-2">
                <p className="font-bold text-base">{entry.site.name}</p>
                <p className="text-sm text-muted-foreground">{entry.site.address}</p>
            </CardHeader>

            <CardContent className="space-y-3">
                {entry.assignments.map((assignment: AssignmentRow) => (
                    <div key={assignment.id} className="border rounded-md p-3 space-y-2">
                        {/* Worker row */}
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{assignment.worker.fullName}</span>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        id={`worker-locked-${assignment.id}`}
                                        checked={assignment.workerLocked}
                                        onCheckedChange={(checked) =>
                                            updateAssignment({ id: assignment.id, workerLocked: !!checked })
                                        }
                                    />
                                    <label
                                        htmlFor={`worker-locked-${assignment.id}`}
                                        className="text-xs cursor-pointer select-none"
                                    >
                                        Locked
                                    </label>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteAssignment(assignment.id)}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>

                        {/* Car row */}
                        {assignment.carId && assignment.car && (
                            <div className="flex items-center gap-2 pl-1">
                                <span className="text-xs text-muted-foreground">
                                    {assignment.car.name} — {assignment.car.number}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        id={`car-locked-${assignment.id}`}
                                        checked={assignment.carLocked}
                                        onCheckedChange={(checked) =>
                                            updateAssignment({ id: assignment.id, carLocked: !!checked })
                                        }
                                    />
                                    <label
                                        htmlFor={`car-locked-${assignment.id}`}
                                        className="text-xs cursor-pointer select-none"
                                    >
                                        Car Locked
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                <Button variant="outline" size="sm" className="w-full" onClick={() => setModalOpen(true)}>
                    + Add Assignment
                </Button>
            </CardContent>

            <AssignmentFormModal
                siteId={entry.site.id}
                date={date}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSuccess={() => setModalOpen(false)}
            />
        </Card>
    );
}
