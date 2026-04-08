// Shared TypeScript interfaces for Assignment & Worker Management

export interface PoolWorker {
  id: string;
  fullName: string;
  phone?: string;
}

export interface PoolCar {
  id: string;
  name: string;
  number: string; // plate
  model: string;
  color: string;
}

export interface PoolData {
  workers: PoolWorker[];
  cars: PoolCar[];
  dayOffWorkerIds: string[];
}

export interface AssignmentRow {
  id: string;
  siteId: string;
  workerId: string;
  carId?: string;
  assignedDate: string;
  workerLocked: boolean;
  carLocked: boolean;
  status: string;
  notes?: string;
  worker: { id: string; fullName: string };
  car?: { id: string; name: string; number: string };
  site: { id: string; name: string; address: string };
}

export interface SiteBoardEntry {
  site: { id: string; name: string; address: string };
  assignments: AssignmentRow[];
}

export interface DailyProgramState {
  id?: string;
  date: string;
  isFinalized: boolean;
  finalizedAt?: string;
  allowWorkersToSeeFullProgram: boolean;
  workersOnDayOff: string[];
}

export interface WorkerPayrollRow {
  workerId: string;
  fullName: string;
  workDays: number;
  dailySalary: number | null;
  totalEarnings: number | null;
  paidAmount: number;
  dueAmount: number | null;
  missingSalaryWarning: boolean;
}

// Input types

export interface CreateAssignmentInput {
  siteId: string;
  workerIds: string[];
  carId?: string;
  assignedDate: string;
  workerLocked: boolean;
  carLocked: boolean;
  notes?: string;
}

export interface UpdateAssignmentInput {
  id: string;
  workerLocked?: boolean;
  carLocked?: boolean;
  carId?: string;
  notes?: string;
}

export interface DayOffInput {
  date: string;
  workerIds: string[];
}

export interface RemoveDayOffInput {
  date: string;
  workerId: string;
}

export interface FinalizeInput {
  date: string;
  allowWorkersToSeeFullProgram: boolean;
}

// Report param types

export interface SiteReportParams {
  siteId: string;
  mode: 'dateRange' | 'monthly' | 'total';
  dateFrom?: string;
  dateTo?: string;
  month?: string;
}

export interface WorkerReportParams {
  workerId: string;
  mode: 'daily' | 'monthly';
  date?: string;
  month?: string;
}

export interface WorkSummaryParams {
  workerId: string;
  month?: string;
}

// Report result types

export interface SiteReportResult {
  site: { id: string; name: string };
  rows: Array<{ date: string; workers: string[]; workerCount: number }>;
  summary: { totalWorkerDays: number };
}

export interface WorkerReportResult {
  worker: { id: string; fullName: string };
  workDays?: number;
  dayOffDays?: number;
  rows?: Array<{ date: string; status: string; siteName?: string }>;
}

export interface PayrollReport {
  month: string;
  workers: WorkerPayrollRow[];
}

// Worker profile endpoint types

export interface WorkerAssignmentsData {
  upcoming: AssignmentRow[];
  today: AssignmentRow | null;
  history: AssignmentRow[];
}

export interface WorkSummaryData {
  workDays: number;
  extraHours: number;
}
