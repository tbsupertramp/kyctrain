
export interface CustomerProfile {
  fullName: string; // Added full name for identity verification
  city: string;
  age: number;
  profession: string;
  incomeSource: string;
  monthlyIncome: string;
  email: string;
  hiddenContradiction: string;
  scenarioType: string;
  difficulty: 'kolay' | 'orta' | 'zor';
}

export interface EvaluationResult {
  role: 'customer' | 'trainer';
  text: string;
  isCorrect: boolean;
  points: number;
  analysis?: {
    logicScore: number;
    amlScore: number;
    communicationScore: number;
    feedbackDetails: string;
    missedDetails: string[];
  };
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'customer' | 'trainer';
  content: string;
  timestamp: Date;
  evaluation?: EvaluationResult;
}

export interface GameState {
  score: number;
  level: number;
  currentProfile: CustomerProfile | null;
  history: Message[];
  status: 'idle' | 'analyzing' | 'roleplay' | 'feedback' | 'error';
  correctAnswers: number;
  totalAttempts: number;
}