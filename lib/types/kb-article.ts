import { z } from 'zod';

// --- Atomic Elements ---

export const ActionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  type: z.enum(['STEP', 'NOTE', 'WARNING', 'COMMAND', 'CODE_BLOCK']),
  screenshot_ref_id: z.string().optional(), // Reference to a RawNode ID
});

export const CheckSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  expected_result: z.string(),
  actions_if_failed: z.array(ActionSchema).optional(),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  actions: z.array(ActionSchema),
  validation_checks: z.array(CheckSchema).optional(),
});

export const PhaseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  tasks: z.array(TaskSchema),
});

export const InstructionBlockSchema = z.object({
  phases: z.array(PhaseSchema),
});

// --- Main Article Schema ---

export const KBMetadataSchema = z.object({
  kb_number: z.string().optional(),
  version: z.string().default('1.0'),
  author: z.string().optional(),
  state: z.enum(['Draft', 'Review', 'Published']).default('Draft'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const ServiceNowKBSchema = z.object({
  id: z.string().uuid().optional(),
  metadata: KBMetadataSchema.default({}),
  
  // Core Content
  short_description: z.string().min(1, "Title is required"),
  sys_class_name: z.string().default('kb_knowledge'),
  
  // Sections
  introduction: z.string().optional(),
  environment_details: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  
  // Structured Instructions (The core technical content)
  instruction_blocks: InstructionBlockSchema.optional(),
  
  // Legacy/Simple support (HTML blob)
  resolution_steps: z.string().optional(), 
});

export type KBArticle = z.infer<typeof ServiceNowKBSchema>;
export type InstructionBlock = z.infer<typeof InstructionBlockSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Action = z.infer<typeof ActionSchema>;
