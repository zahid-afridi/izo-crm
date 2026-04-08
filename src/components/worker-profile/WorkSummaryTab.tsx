'use client';

import { useState } from 'react';
import { useGetWorkSummaryQuery } from '@/store/api/workerProfileApi';
import type { WorkSummaryData } from '@/types/assignments';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface WorkSummaryTabProps {
    workerId: string;
}

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getLast12Months(): { value: string; label: string }[] {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
        months.push({ value, label });
    }
    return months;
}

function StatCard({ value, label }: { value: string; label: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-6 gap-1">
            <span className="text-4xl font-bold">{value}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
    );
}

export function WorkSummaryTab({ workerId }: WorkSummaryTabProps) {
    const [month, setMonth] = useState<string>(getCurrentMonth);
    const months = getLast12Months();

    const { data, isLoading, isError } = useGetWorkSummaryQuery({ workerId, month });

    return (
        <div className="space-y-6 p-4">
            <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                    {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                            {m.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {isLoading && (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            )}

            {isError && (
                <div className="py-8 text-center text-sm text-destructive">Failed to load summary.</div>
            )}

            {data && !isLoading && (
                <div className="grid grid-cols-2 gap-4">
                    <StatCard value={String(data.workDays)} label="Work Days" />
                    <StatCard value={data.extraHours.toFixed(1)} label="Extra Hours" />
                </div>
            )}
        </div>
    );
}

export default WorkSummaryTab;
