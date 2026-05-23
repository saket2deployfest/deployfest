export interface SummarizeDashboardInput {
  guards: Array<{
    id: string;
    name: string;
    sector: string;
    status: 'Active' | 'Alert' | 'Standby';
    phone: string;
  }>;
  alerts: Array<{
    feed_id: string;
    feed_name: string;
    alert_level: 'critical' | 'warning' | 'normal' | 'predicted';
    current_count: number;
    timestamp: string;
    recommendations?: string;
  }>;
  grievances: Array<{
    id: string;
    type: 'Medical Attention' | 'Missing Person' | 'General Grievance';
    details: string;
    submittedAt: { seconds: number; nanoseconds: number };
    status: 'new' | 'resolved';
    submittedBy?: string;
  }>;
}

export interface SummarizeDashboardOutput {
  summary: string;
}

export async function summarizeDashboard(
  _input: SummarizeDashboardInput
): Promise<SummarizeDashboardOutput> {
  return {
    summary:
      'AI summaries require the Genkit server. Core dashboard, alerts, and grievances are fully available on this hosted build.',
  };
}
