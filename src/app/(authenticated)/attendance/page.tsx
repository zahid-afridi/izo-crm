"use client";

import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { AttendancePage } from "@/components/pages/AttendancePage";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/selectors/authSelectors";
export default function AttendanceRoute() {
    const user = useAppSelector(selectAuthUser);
    return (
        <AuthenticatedLayout>
            <AttendancePage userRole={user?.role || ''} currentUserId={user?.id} />
        </AuthenticatedLayout>
    );
}