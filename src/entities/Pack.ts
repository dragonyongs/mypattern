// src/entities/Pack.ts
export interface VocaItem {
  id: string;
  word: string;
  definition: string;
  exampleEn?: string;
  exampleKo?: string;
  pronunciation?: string;
  audioUrl?: string;
  imageUrl?: string;
}

export interface Pack {
  id: string;
  title: string;
  description: string;
  level: "basic" | "intermediate" | "advanced";
  type: "vocabulary" | "sentences" | "grammar";
  totalItems: number;
  estimatedDays: number;
  coverImage?: string;
  tags: string[];
  items: VocaItem[];
  version: string;
  createdAt: string;
  updatedAt: string;
}
