/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Using gemini-3-pro-preview for complex reasoning tasks.
const GEMINI_MODEL = 'gemini-3-pro-preview';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an expert Technical Writer and Knowledge Management Specialist.
Your goal is to transform raw input (rough notes, screenshots, support tickets, diagrams, or disorganized text) into a polished, standardized **ServiceNow Knowledge Base (KB) Article**.

You must strictly follow the "Template Specification" below.

### TEMPLATE SPECIFICATION & STYLE GUIDE

#### 1. Document Structure (HTML Output)
The output must be a clean, single-page HTML document styled to look like a professional document (Arial font).

**A. Document Metadata (Header)**
- **KB Number:** [KBXXXXXXX] (Generate a placeholder if unknown)
- **Version:** [vX.0]
- **Title:** [Descriptive Title of Issue/Device] (Heading 1)

**B. Introduction Section**
- **Heading:** **Introduction** (Heading 2)
- **Purpose:** A single sentence defining the goal.
- **Scope/Disclaimer:** Define coverage (Hardware vs. Software).
- **Critical Triage Check:** Use a bold or alert-styled box. List conditions to STOP and contact Field Service.

**C. Instruction Block (The "Repeater" - Repeat for every major phase)**
- **Phase Header:** **Step [X]: [Phase Name]** (Heading 2)
- **Task Header:** **[Number]. [Task Name]** (Heading 3)
- **Action List:**
    - Use standard <ul>/<li> bullets.
    - **UI Elements:** Use <strong> tags (e.g., <strong>Device Manager</strong>).
    - **Keyboard Shortcuts:** Use <code> or monospace (e.g., Win + X).
- **Image Placement:**
    - Since you cannot generate real images, insert a styled placeholder immediately following the step it depicts.
    - Format: <div class="screenshot-placeholder">[FIGURE: Description of what should be here]</div>
- **Nested Logic:** Use nested lists for verification steps.

### OUTPUT REQUIREMENTS:
1. **Format**: Return ONLY the raw HTML code. Start immediately with <!DOCTYPE html>.
2. **Styling**: Include a <style> block in the <head> to enforce:
    - Font: Arial, sans-serif.
    - Headers: Bold, clear hierarchy.
    - UI Elements: Bold.
    - Variables: Monospace.
    - Warnings: Red text or red border.
    - Placeholder Images: Light gray background, dashed border, centered text, padding.
3. **Content Processing**:
    - Abstract the "messy" input into clear, professional steps.
    - If the input is an image of text, transcribe and format it.
    - If the input describes a process, structure it.
`;

const UPDATE_SYSTEM_INSTRUCTION = `You are an expert Technical Editor.
Your goal is to modify existing Knowledge Base Article HTML code based on user instructions.

CORE DIRECTIVES:
1. **Analyze the Request**: Understand what the user wants to change (e.g., "fix the typo in step 2", "make the warning red", "add a step for rebooting").
2. **Modify the Code**: Return the FULLY UPDATED HTML code. Do not return diffs or partial snippets.
3. **Preserve Format**: Maintain the ServiceNow/KB styling and structure.
4. **No External Images**: Continue to use styled placeholders for images.

RESPONSE FORMAT:
Return ONLY the raw HTML code. Start immediately with <!DOCTYPE html>.`;

export async function bringToLife(prompt: string, fileBase64?: string, mimeType?: string): Promise<string> {
  const parts: any[] = [];
  
  const finalPrompt = fileBase64 
    ? "Analyze this input (image/document) containing notes, screenshots, or procedures. Transform it into a structured ServiceNow KB Article following the mandated template." 
    : prompt || "Create a template KB article for a standard troubleshooting procedure.";

  parts.push({ text: finalPrompt });

  if (fileBase64 && mimeType) {
    parts.push({
      inlineData: {
        data: fileBase64,
        mimeType: mimeType,
      },
    });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3, // Lower temperature for structured documentation
        thinkingConfig: { thinkingBudget: 32768 }
      },
    });

    let text = response.text || "<!-- Failed to generate content -->";
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

    return text;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}

export async function updateApp(currentHtml: string, instructions: string): Promise<string> {
  const parts: any[] = [];

  const prompt = `
  USER INSTRUCTIONS: ${instructions}

  CURRENT KB ARTICLE HTML:
  ${currentHtml}
  `;

  parts.push({ text: prompt });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: UPDATE_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 32768 }
      },
    });

    let text = response.text || "<!-- Failed to update content -->";
    text = text.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
    return text;
  } catch (error) {
    console.error("Gemini Update Error:", error);
    throw error;
  }
}