export interface IssueCheck {
  detected: boolean;
  details: string; // Brief explanation if detected
}

export interface PlantHealthIssues {
  diseases: IssueCheck;
  pests: IssueCheck;
  underwatering: IssueCheck;
  overwatering: IssueCheck;
  soil: IssueCheck;
  sunlight: IssueCheck;
  nutrientDeficiency: IssueCheck;
  generalStress: IssueCheck;
}

export interface TreatmentStep {
  title: string;
  instruction: string;
}

export interface ExternalResource {
  title: string;
  description: string;
  url: string;
}

export interface PlantAnalysisResult {
  plantName: string;
  confidence: number; // 0-100
  alternatives: string[];
  issues: PlantHealthIssues;
  diagnosis: string;
  treatmentPlan: TreatmentStep[];
  preventionTips: string[];
  expertResources: ExternalResource[]; // List of recommended blogs/articles
  isPlant: boolean; // Flag to check if the image is actually a plant
}

export interface PlantFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  results: PlantAnalysisResult[]; 
  folderId?: string; // ID of the folder this item belongs to
}

export interface ChatSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachment?: string; // base64 string of the uploaded image
  sources?: ChatSource[];
  timestamp: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  joinedAt: number;
}

export type ARIssueType = 'disease' | 'nutrient' | 'dryness' | 'pest' | 'healthy' | 'unknown';

export interface ARDetection {
  label: string;
  type: ARIssueType;
  confidence: number;
  box_2d: number[]; // [ymin, xmin, ymax, xmax] 0-1000
}

export interface ARDetailedReport {
  disease_name: string;
  confidence_score: number;
  affected_area_description: string;
  symptoms_observed: string[];
  possible_causes: string[];
  severity_level: 'Low' | 'Medium' | 'High';
  immediate_actions: string[];
  long_term_prevention: string[];
  care_score: number; // 1-10
  time_to_recovery: string;
}