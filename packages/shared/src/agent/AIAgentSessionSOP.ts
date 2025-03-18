export interface AIAgentSessionSOPStep {
  description: string;
  expectedStartState?: string;
  expectedEndState?: string;
  index: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface AIAgentSessionSOP {
  id: string;
  steps: AIAgentSessionSOPStep[];
  currentStepIndex: number;
}
