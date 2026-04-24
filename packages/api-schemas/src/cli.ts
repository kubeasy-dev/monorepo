import { z } from "zod";

// ---- CLI metadata ----
export const CliMetadataSchema = z.object({
  cliVersion: z.string(),
  os: z.string(),
  arch: z.string(),
});
export type CliMetadata = z.infer<typeof CliMetadataSchema>;
