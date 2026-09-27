export type Author = 'user' | 'ai';

export type Point = { x: number; y: number };

export type Stroke = {
  id: string;
  author: Author;
  points: Point[];
  /** When true, AI stroke has settled to full ink. User strokes are always committed. */
  settled: boolean;
};

export type PanelCaption = {
  committedText: string;
  aiSuggestionText: string;
  /** AI suggestion has settled to normal weight/color */
  suggestionSettled: boolean;
};

export type StyleContext = {
  dominantColors: string[];
  captionTone: string;
  vocabulary: string[];
};

export type ComicPanel = {
  id: string;
  strokes: Stroke[];
  caption: PanelCaption;
};

export type AIContribution = {
  strokes: Omit<Stroke, 'id' | 'settled'>[];
  captionSuggestion: string;
};
