'use server';

/**
 * @fileOverview Summarizes the changes in a student's performance since the last report.
 *
 * - summarizeStudentChanges - A function that summarizes the changes in a student's performance.
 * - SummarizeStudentChangesInput - The input type for the summarizeStudentChanges function.
 * - SummarizeStudentChangesOutput - The return type for the summarizeStudentChanges function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeStudentChangesInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  studentId: z.string().describe('The ID of the student.'),
  changes: z.array(z.string()).describe('A list of changes in the student\'s performance since the last report.'),
});
export type SummarizeStudentChangesInput = z.infer<typeof SummarizeStudentChangesInputSchema>;

const SummarizeStudentChangesOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the changes in the student\'s performance.'),
});
export type SummarizeStudentChangesOutput = z.infer<typeof SummarizeStudentChangesOutputSchema>;

export async function summarizeStudentChanges(input: SummarizeStudentChangesInput): Promise<SummarizeStudentChangesOutput> {
  return summarizeStudentChangesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeStudentChangesPrompt',
  input: {schema: SummarizeStudentChangesInputSchema},
  output: {schema: SummarizeStudentChangesOutputSchema},
  prompt: `You are a tutor summarizing changes in a student's performance. Provide a concise summary of the following changes for student {{studentName}} (ID: {{studentId}}):\n\nChanges:\n{{#each changes}}- {{this}}\n{{/each}}\n\nSummary: `,
});

const summarizeStudentChangesFlow = ai.defineFlow(
  {
    name: 'summarizeStudentChangesFlow',
    inputSchema: SummarizeStudentChangesInputSchema,
    outputSchema: SummarizeStudentChangesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
