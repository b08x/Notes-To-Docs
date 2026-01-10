import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

export class DocxGenerator {
  static async generate(html: string): Promise<Blob> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const docxChildren: Paragraph[] = [];

    // Helper to extract text from a node, handling basic inline formatting
    const extractTextRuns = (node: Node, isBold = false, isItalic = false): TextRun[] => {
      const runs: TextRun[] = [];
      
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          if (child.textContent && child.textContent.trim().length > 0) {
            runs.push(new TextRun({
              text: child.textContent,
              bold: isBold,
              italics: isItalic,
              font: "Arial",
              size: 22, // 11pt
            }));
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toLowerCase();
          
          if (tagName === 'b' || tagName === 'strong') {
            runs.push(...extractTextRuns(el, true, isItalic));
          } else if (tagName === 'i' || tagName === 'em') {
            runs.push(...extractTextRuns(el, isBold, true));
          } else {
             runs.push(...extractTextRuns(el, isBold, isItalic));
          }
        }
      });
      return runs;
    };

    // Iterate over top-level elements
    const elements = Array.from(doc.body.children);
    
    for (const el of elements) {
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'h1') {
        docxChildren.push(new Paragraph({
          text: el.textContent || "",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200, before: 200 },
          style: "Heading1"
        }));
      } else if (tagName === 'h2') {
         docxChildren.push(new Paragraph({
          text: el.textContent || "",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150, before: 300 },
          style: "Heading2"
        }));
      } else if (tagName === 'h3') {
         docxChildren.push(new Paragraph({
          text: el.textContent || "",
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 120, before: 200 },
        }));
      } else if (tagName === 'p') {
        docxChildren.push(new Paragraph({
          children: extractTextRuns(el),
          spacing: { after: 120 },
        }));
      } else if (tagName === 'ul') {
        Array.from(el.children).forEach(li => {
           docxChildren.push(new Paragraph({
            children: extractTextRuns(li),
            bullet: { level: 0 },
            spacing: { after: 50 },
          }));
        });
      } else if (tagName === 'ol') {
         Array.from(el.children).forEach(li => {
           docxChildren.push(new Paragraph({
            children: extractTextRuns(li),
            bullet: { level: 0 }, // Simplified numbering
            spacing: { after: 50 },
          }));
        });
      } else if (tagName === 'div') {
         // Handle screenshot placeholders specially
         if (el.className.includes('screenshot-placeholder')) {
             docxChildren.push(new Paragraph({
                 children: [
                     new TextRun({
                         text: `[${el.textContent || "FIGURE"}]`,
                         color: "FF0000",
                         font: "Courier New",
                         size: 20
                     })
                 ],
                 spacing: { after: 120, before: 120 },
                 alignment: AlignmentType.CENTER,
                 border: {
                     top: { style: "single", space: 5, color: "CCCCCC" },
                     bottom: { style: "single", space: 5, color: "CCCCCC" },
                     left: { style: "single", space: 5, color: "CCCCCC" },
                     right: { style: "single", space: 5, color: "CCCCCC" },
                 }
             }));
         } else {
             docxChildren.push(new Paragraph({
                children: extractTextRuns(el),
                spacing: { after: 120 },
            }));
         }
      }
    }

    const docx = new Document({
      styles: {
        paragraphStyles: [
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 48, // 24pt
              bold: true,
              font: "Arial",
              color: "000000"
            },
            paragraph: {
              spacing: { after: 240 },
            },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: {
              size: 32, // 16pt
              bold: true,
              font: "Arial",
              color: "000000"
            },
            paragraph: {
              spacing: { before: 240, after: 120 },
            },
          },
          {
            id: "Normal",
            name: "Normal",
            quickFormat: true,
            run: {
               size: 22, // 11pt
               font: "Arial"
            }
          }
        ]
      },
      sections: [{
        children: docxChildren,
      }],
    });

    return await Packer.toBlob(docx);
  }
}