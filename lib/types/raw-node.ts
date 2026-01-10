import { z } from 'zod';

export enum NodeType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  CODE = 'CODE',
  TABLE = 'TABLE',
  SECTION_HEADER = 'SECTION_HEADER',
  PDF = 'PDF'
}

export const NodeTypeSchema = z.nativeEnum(NodeType);

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  page: z.number().optional(),
});

export const SourceMetadataSchema = z.object({
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().optional(),
  pageIndex: z.number().optional(),
  boundingBox: BoundingBoxSchema.optional(),
  processedAt: z.string().datetime().optional(),
  syntax: z.string().optional(), // e.g., 'markdown', 'log', 'javascript'
  outline: z.array(z.object({
    level: z.number(),
    text: z.string()
  })).optional(),
});

export const RawNodeSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  content: z.string(), // Base64 for binary, UTF-8 for text
  type: NodeTypeSchema,
  metadata: SourceMetadataSchema.default({
    filename: 'unknown',
    mimeType: 'text/plain'
  }),
});

export type RawNode = z.infer<typeof RawNodeSchema>;
export type SourceMetadata = z.infer<typeof SourceMetadataSchema>;
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
