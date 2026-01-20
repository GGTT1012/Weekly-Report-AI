
export type DayKey = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export type TaskStatus = 'completed' | 'in-progress' | 'pending';

export interface Task {
  id: string;
  content: string;
  status: TaskStatus;
  category?: string; // e.g. 'Development', 'Meeting', 'Planning'
}

export type WeekData = Record<DayKey, Task[]>;

export type ReportStatus = 'idle' | 'loading' | 'success' | 'error';

// New types for the Structured Report
export interface StructuredReportData {
  weeklySummary: string[];
  nextWeekAttention: string[];
  dailyLogs: {
    day: string;
    date: string; // generated relative date or placeholder
    content: string;
  }[];
  problemsAndSolutions: {
    problem: string;
    solution: string;
    resolved: string;
  }[];
  nextWeekPlan: {
    day: string;
    content: string;
  }[];
  finalSummary: string;
}
