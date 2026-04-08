'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PoolWorker, PoolCar, PoolData } from '@/types/assignments';
import {
    useMarkDayOffMutation,
    useRemoveDayOffMutation,
    useBulkDayOffMutation,
} from '@/store/api/assignmentsApi';

interface PoolPanelProps {
    date: string;
    poolData: PoolData;
    isLoading?: boolean;
}

function WorkerPoolCard({
    worker,
    date,
}: {
    worker: PoolWorker;
    date: string;
}) {
    const [markDayOff, { isLoading }] = useMarkDayOffMutation();

    return (
        <Card className="mb-2">
            <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                    <p className="font-medium text-sm">{worker.fullName}</p>
                    {worker.phone && (
                        <p className="text-xs text-muted-foreground">{worker.phone}</p>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => markDayOff({ date, workerIds: [worker.id] })}
                >
                    Day Off
                </Button>
            </CardContent>
        </Card>
    );
}

function CarPoolCard({ car }: { car: PoolCar }) {
    return (
        <Card className="mb-2">
            <CardContent className="py-3 px-4">
                <p className="font-medium text-sm">{car.name}</p>
                <p className="text-xs text-muted-foreground">
                    {car.number} &middot; {car.model} &middot; {car.color}
                </p>
            </CardContent>
        </Card>
    );
}

function DayOffWorkerCard({
    worker,
    date,
}: {
    worker: PoolWorker;
    date: string;
}) {
    const [removeDayOff, { isLoading }] = useRemoveDayOffMutation();

    return (
        <Card className="mb-2 opacity-50">
            <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                    <p className="font-medium text-sm text-muted-foreground line-through">
                        {worker.fullName}
                    </p>
                    {worker.phone && (
                        <p className="text-xs text-muted-foreground">{worker.phone}</p>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => removeDayOff({ date, workerId: worker.id })}
                >
                    Remove Day Off
                </Button>
            </CardContent>
        </Card>
    );
}

function BulkDayOffButton({ date }: { date: string }) {
    const [bulkDayOff, { isLoading }] = useBulkDayOffMutation();

    return (
        <Button
            variant="destructive"
            size="sm"
            disabled={isLoading}
            onClick={() => bulkDayOff({ date })}
        >
            {isLoading ? 'Processing...' : 'Mark All Day Off'}
        </Button>
    );
}

export function WorkerPoolList({
    date,
    workers,
    dayOffWorkerIds,
}: {
    date: string;
    workers: PoolWorker[];
    dayOffWorkerIds: string[];
}) {
    const dayOffSet = new Set(dayOffWorkerIds);
    const activeWorkers = workers.filter((w) => !dayOffSet.has(w.id));
    const dayOffWorkers = workers.filter((w) => dayOffSet.has(w.id));

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Workers ({activeWorkers.length})</h3>
                {workers.length > 0 && <BulkDayOffButton date={date} />}
            </div>

            {activeWorkers.length === 0 && dayOffWorkers.length === 0 && (
                <p className="text-xs text-muted-foreground">No workers in pool.</p>
            )}

            {activeWorkers.map((worker) => (
                <WorkerPoolCard key={worker.id} worker={worker} date={date} />
            ))}

            {dayOffWorkers.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        On Day Off
                    </h4>
                    {dayOffWorkers.map((worker) => (
                        <DayOffWorkerCard key={worker.id} worker={worker} date={date} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function CarPoolList({ cars }: { cars: PoolCar[] }) {
    return (
        <div>
            <h3 className="font-semibold text-sm mb-3">Cars ({cars.length})</h3>
            {cars.length === 0 && (
                <p className="text-xs text-muted-foreground">No cars in pool.</p>
            )}
            {cars.map((car) => (
                <CarPoolCard key={car.id} car={car} />
            ))}
        </div>
    );
}

export function PoolPanel({ date, poolData, isLoading }: PoolPanelProps) {
    if (isLoading) {
        return (
            <div className="p-4 text-sm text-muted-foreground">Loading pool...</div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <WorkerPoolList
                date={date}
                workers={poolData.workers}
                dayOffWorkerIds={poolData.dayOffWorkerIds}
            />
            <CarPoolList cars={poolData.cars} />
        </div>
    );
}
