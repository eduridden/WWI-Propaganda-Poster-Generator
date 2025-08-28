export interface PosterIdea {
  id: number;
  title: string;
  description: string;
  prompt: string;
}

export interface UploadedImage {
  base64: string; 
  dataUrl: string; 
  mimeType: string;
}