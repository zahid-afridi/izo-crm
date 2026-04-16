'use client';

import { Card } from '../ui/card';
import { CalendarClock } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

interface WorkerDashboardProps {
  userRole: string;
}

export function WorkerDashboard({ userRole }: WorkerDashboardProps) {
  const user = useAppSelector(selectAuthUser);
  void userRole;

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-brand-gradient text-white border-0 shadow-lg">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-6 h-6" />
          <div>
            <h2 className="text-xl">Welcome, {user?.fullName || 'Worker'}</h2>
            <p className="text-white/90 text-sm">
              Assignment module has been removed. Please use Attendance and Chat modules.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
