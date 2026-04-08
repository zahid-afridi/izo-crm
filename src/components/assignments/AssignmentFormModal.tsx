'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { AssignmentRow, PoolWorker, PoolCar } from '@/types/assignments';
import {
    useCreateAssignmentMutation,
    useUpdateAssignmentMutation,
    useGetPoolQuery,
} from '@/store/api/assignmentsApi';

interface AssignmentFormModalProps {
    siteId: string;
    date: string; // YYYY-MM-DD
    existingAssignment?: AssignmentRow;
    onSuccess: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AssignmentFormModal({
    siteId,
    date,
    existingAssignment,
    onSuccess,
    open,
    onOpenChange,
}: AssignmentFormModalProps) {
    const { data: poolData, isLoading: poolLoading } = useGetPoolQuery(date, { skip: !open });

    const [createAssignment, { isLoading: creating }] = useCreateAssignmentMutation();
    const [updateAssignment, { isLoading: updating }] = useUpdateAssignmentMutation();

    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [workerLocked, setWorkerLocked] = useState(false);
    const [selectedCarId, setSelectedCarId] = useState<string | undefined>(undefined);
    const [carLocked, setCarLocked] = useState(false);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Populate form when editing
    useEffect(() => {
        if (existingAssignment) {
            setSelectedWorkerIds([existingAssignment.workerId]);
            setWorkerLocked(existingAssignment.workerLocked);
            setSelectedCarId(existingAssignment.carId);
            setCarLocked(existingAssignment.carLocked);
            setNotes(existingAssignment.notes ?? '');
        } else {
            setSelectedWorkerIds([]);
            setWorkerLocked(false);
            setSelectedCarId(undefined);
            setCarLocked(false);
            setNotes('');
        }
        setError(null);
    }, [existingAssignment, open]);

    const availableWorkers: PoolWorker[] = poolData
        ? poolData.workers.filter((w) => !poolData.dayOffWorkerIds.includes(w.id))
        : [];
    const availableCars: PoolCar[] = poolData?.cars ?? [];

    const isSubmitting = creating || updating;

    function toggleWorker(workerId: string) {
        setSelectedWorkerIds((prev) =>
            prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        try {
            if (existingAssignment) {
                await updateAssignment({
                    id: existingAssignment.id,
                    workerLocked,
                    carLocked,
                    carId: selectedCarId,
                    notes,
                }).unwrap();
            } else {
                if (selectedWorkerIds.length === 0) {
                    setError('Please select at least one worker.');
                    return;
                }
                await createAssignment({
                    siteId,
                    workerIds: selectedWorkerIds,
                    carId: selectedCarId,
                    assignedDate: date,
                    workerLocked,
                    carLocked,
                    notes,
                }).unwrap();
            }
            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            const message =
                err && typeof err === 'object' && 'data' in err
                    ? (err as { data?: { error?: string } }).data?.error
                    : undefined;
            setError(message ?? 'Something went wrong. Please try again.');
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {existingAssignment ? 'Edit Assignment' : 'New Assignment'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Workers */}
                    {!existingAssignment && (
                        <div className="space-y-2">
                            <Label>Workers</Label>
                            {poolLoading ? (
                                <p className="text-sm text-muted-foreground">Loading workers...</p>
                            ) : availableWorkers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No available workers for this date.</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                                    {availableWorkers.map((worker) => (
                                        <div key={worker.id} className="flex items-center gap-2 py-1">
                                            <Checkbox
                                                id={`worker-${worker.id}`}
                                                checked={selectedWorkerIds.includes(worker.id)}
                                                onCheckedChange={() => toggleWorker(worker.id)}
                                            />
                                            <label
                                                htmlFor={`worker-${worker.id}`}
                                                className="text-sm cursor-pointer select-none"
                                            >
                                                {worker.fullName}
                                                {worker.phone && (
                                                    <span className="text-muted-foreground ml-1 text-xs">({worker.phone})</span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2 pt-1">
                                <Checkbox
                                    id="worker-locked"
                                    checked={workerLocked}
                                    onCheckedChange={(v) => setWorkerLocked(!!v)}
                                />
                                <label htmlFor="worker-locked" className="text-sm cursor-pointer select-none">
                                    Lock workers
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Worker locked toggle (edit mode) */}
                    {existingAssignment && (
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="worker-locked-edit"
                                checked={workerLocked}
                                onCheckedChange={(v) => setWorkerLocked(!!v)}
                            />
                            <label htmlFor="worker-locked-edit" className="text-sm cursor-pointer select-none">
                                Lock worker
                            </label>
                        </div>
                    )}

                    {/* Car */}
                    <div className="space-y-2">
                        <Label>Car</Label>
                        {poolLoading ? (
                            <p className="text-sm text-muted-foreground">Loading cars...</p>
                        ) : (
                            <Select
                                value={selectedCarId ?? 'none'}
                                onValueChange={(v) => setSelectedCarId(v === 'none' ? undefined : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="No car assigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No car</SelectItem>
                                    {availableCars.map((car) => (
                                        <SelectItem key={car.id} value={car.id}>
                                            {car.name} — {car.number}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="car-locked"
                                checked={carLocked}
                                onCheckedChange={(v) => setCarLocked(!!v)}
                            />
                            <label htmlFor="car-locked" className="text-sm cursor-pointer select-none">
                                Lock car
                            </label>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes..."
                            rows={3}
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : existingAssignment ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
