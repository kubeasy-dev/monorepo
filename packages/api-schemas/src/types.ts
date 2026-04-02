import { z } from "zod";

export const TypeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  logo: z.string().nullable(),
});
export type Type = z.infer<typeof TypeSchema>;

export const TypeListOutputSchema = z.array(TypeSchema);
export type TypeListOutput = z.infer<typeof TypeListOutputSchema>;

export const TypeGetInputSchema = z.object({
  slug: z.string(),
});
export type TypeGetInput = z.infer<typeof TypeGetInputSchema>;
