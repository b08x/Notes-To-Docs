import { Creation } from '../components/CreationHistory';

const STORAGE_KEY = 'gemini_app_history';

export const db = {
  getHistory: (): Creation[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
    return [];
  },

  saveHistory: (history: Creation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("Local storage full or error saving history", e);
    }
  },

  loadExamples: async (): Promise<Creation[]> => {
    try {
        const exampleUrls = [
            'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/vibecode-blog.json',
            'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/cassette.json',
            'https://storage.googleapis.com/sideprojects-asronline/bringanythingtolife/chess.json'
        ];

        const examples = await Promise.all(exampleUrls.map(async (url) => {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            return {
                ...data,
                timestamp: new Date(data.timestamp || Date.now()),
                id: data.id || crypto.randomUUID()
            };
        }));
        
        return examples.filter((e): e is Creation => e !== null);
     } catch (e) {
         console.error("Failed to load examples", e);
         return [];
     }
  }
};