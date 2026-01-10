import { RawNodeSchema, RawNode, NodeType } from '../types/raw-node';

export class TextFileProcessor {
  /**
   * Processes a text-based file (Markdown, Log, TXT) into a structured RawNode.
   */
  static async processFile(file: File): Promise<RawNode> {
    const text = await file.text();
    const name = file.name.toLowerCase();
    
    // Sanitize: Basic control character removal (preserve newlines/tabs)
    // eslint-disable-next-line no-control-regex
    const sanitizedContent = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    const metadata: Record<string, any> = {
      filename: file.name,
      mimeType: file.type || 'text/plain',
      size: file.size,
      processedAt: new Date().toISOString()
    };

    let nodeType = NodeType.TEXT;

    // Logic: Markdown parsing
    if (name.endsWith('.md') || name.endsWith('.markdown') || file.type === 'text/markdown') {
      metadata.syntax = 'markdown';
      metadata.outline = this.extractMarkdownHeaders(text);
      // Could potentially identify SECTION_HEADER nodes here if splitting, but keeping as single TEXT node for now.
    } 
    // Logic: Log parsing
    else if (name.endsWith('.log')) {
      metadata.syntax = 'log';
      nodeType = NodeType.CODE; // Treat logs as code blocks often
    } 
    // Logic: Code parsing
    else if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.json')) {
      metadata.syntax = name.split('.').pop();
      nodeType = NodeType.CODE;
    }
    else {
        metadata.syntax = 'plaintext';
    }

    const rawNode = {
      id: crypto.randomUUID(),
      content: sanitizedContent,
      type: nodeType,
      metadata: metadata
    };

    // Validate against schema
    return RawNodeSchema.parse(rawNode);
  }

  /**
   * Extracts headers from Markdown text to build a semantic outline.
   */
  private static extractMarkdownHeaders(text: string) {
    const headers: { level: number; text: string }[] = [];
    const lines = text.split('\n');
    const headerRegex = /^(#{1,6})\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(headerRegex);
      if (match) {
        headers.push({
          level: match[1].length,
          text: match[2].trim()
        });
      }
    }
    return headers;
  }
}
