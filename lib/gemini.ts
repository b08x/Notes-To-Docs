/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
'use server';

import { generateText } from "ai";
import { AIRegistry } from "./ai/registry";
import { UserSettings } from "./types/settings";

const SYSTEM_INSTRUCTION = `
<system_instructions>
  <role>
    You are an Expert Knowledge Manager and Senior Technical Writer for an Enterprise IT organization.
    Your goal is to transform raw technical inputs (logs, messy notes, screenshots, diagrams, PDFs) into authoritative, strictly structured ServiceNow Knowledge Base (KB) Articles.
  </role>

  <directives>
    1. **Analyze Input Nodes**: Scan all provided context (text, images, PDF content) to understand the technical scenario.
    2. **Identify Root Cause**: Determine the underlying issue and the resolution logic.
    3. **Map Solution Steps**: Structure the solution into clear, linear, reproducible phases.
    4. **Generate Structured Output**: Produce the final HTML artifact following the strict template.
  </directives>

  <style_guide>
    - Tone: Professional, authoritative, direct (Active Voice).
    - Formatting: ServiceNow HTML standards (Arial font).
    - Visuals: Use styled <div> placeholders for missing images: <div class="screenshot-placeholder">[FIGURE: Description]</div>.
    - Warnings: Highlight critical risks in red or bold.
  </style_guide>

  <template_specification>
    The output must be a single HTML file containing:
    - **Header**: KB Number, Version, Title (H1).
    - **Introduction**: (H2) Purpose, Scope.
    - **Triage/Prerequisites**: (Alert Box) Conditions to stop/escalate.
    - **Resolution**: (Repeater) Phase X (H2) -> Step Y (H3) -> Action items (ul/li).
  </template_specification>
</system_instructions>
`;

const UPDATE_SYSTEM_INSTRUCTION = `You are an expert Technical Editor.
Your goal is to modify existing Knowledge Base Article HTML code based on user instructions.

CORE DIRECTIVES:
1. **Analyze the Request**: Understand what the user wants to change.
2. **Modify the Code**: Return the FULLY UPDATED HTML code.
3. **Preserve Format**: Maintain the ServiceNow/KB styling and structure.
4. **No External Images**: Continue to use styled placeholders for images.

RESPONSE FORMAT:
Return ONLY the raw HTML code. Start immediately with <!DOCTYPE html>.`;

interface FileInput {
  name: string;
  type: string;
  base64: string;
}

export async function generateKB(
  prompt: string, 
  files: FileInput[] = [], 
  extractedTextContext: string = "",
  settings: UserSettings
): Promise<string> {
  
  try {
    const model = AIRegistry.getModel(settings);
    
    // Construct User Content for Vercel AI SDK
    const content: any[] = [
      { type: 'text', text: `<context_data>
    <user_request>${prompt || "Generate a standard troubleshooting article."}</user_request>
    ${extractedTextContext ? `<extracted_text_content>${extractedTextContext}</extracted_text_content>` : ''}
    <file_manifest>
      ${files.map(f => `<file name="${f.name}" type="${f.type}" />`).join('\n')}
    </file_manifest>
  </context_data>` }
    ];

    // Add Images
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        content.push({
          type: 'image',
          image: file.base64, // Vercel AI SDK supports base64 strings directly in some adapters, or we can use data URIs
          mimeType: file.type
        });
      }
      // Note: PDF files are handled via extractedTextContext for now in this unified flow,
      // as not all providers support PDF inputs natively yet via unified SDK.
    }

    const { text } = await generateText({
      model: model,
      system: SYSTEM_INSTRUCTION,
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.2,
      maxTokens: 4000, 
    });

    let cleanedText = text || "<!-- Failed to generate content -->";
    cleanedText = cleanedText.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');

    return cleanedText;

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function updateApp(currentHtml: string, instructions: string, settings: UserSettings): Promise<string> {
  try {
    const model = AIRegistry.getModel(settings);

    const prompt = `
    USER INSTRUCTIONS: ${instructions}
  
    CURRENT KB ARTICLE HTML:
    ${currentHtml}
    `;

    const { text } = await generateText({
        model: model,
        system: UPDATE_SYSTEM_INSTRUCTION,
        messages: [{ role: 'user', content: prompt }],
    });

    let cleanedText = text || "<!-- Failed to update content -->";
    cleanedText = cleanedText.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
    return cleanedText;

  } catch (error) {
    console.error("AI Update Error:", error);
    throw error;
  }
}