// This is a server action.
'use server';

/**
 * @fileOverview A flow to generate or validate a list of student IDs for monitoring.
 *
 * - generateListOfMonitoredStudents - A function that validates or generates a list of student IDs.
 * - GenerateListOfMonitoredStudentsInput - The input type for the generateListOfMonitoredStudents function.
 * - GenerateListOfMonitoredStudentsOutput - The return type for the generateListOfMonitoredStudents function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateListOfMonitoredStudentsInputSchema = z.object({
  studentIds: z
    .string()
    .describe('A comma separated list of student IDs to validate and extract, or a request to generate one.'),
});
export type GenerateListOfMonitoredStudentsInput = z.infer<typeof GenerateListOfMonitoredStudentsInputSchema>;

const GenerateListOfMonitoredStudentsOutputSchema = z.object({
  studentIds: z.array(z.string()).describe('A list of validated student IDs.'),
});
export type GenerateListOfMonitoredStudentsOutput = z.infer<typeof GenerateListOfMonitoredStudentsOutputSchema>;

export async function generateListOfMonitoredStudents(
  input: GenerateListOfMonitoredStudentsInput
): Promise<GenerateListOfMonitoredStudentsOutput> {
  return generateListOfMonitoredStudentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateListOfMonitoredStudentsPrompt',
  input: {schema: GenerateListOfMonitoredStudentsInputSchema},
  output: {schema: GenerateListOfMonitoredStudentsOutputSchema},
  prompt: `You are a helpful assistant for tutors.

The tutor will provide a comma-separated list of student IDs.

Your job is to validate and extract these IDs. Remove any leading/trailing whitespace from each ID.

If the input is a request to generate a list, create a list of 5 valid-looking student IDs.

Input: {{{studentIds}}}

Output the validated list of student IDs.`,
});

const generateListOfMonitoredStudentsFlow = ai.defineFlow(
  {
    name: 'generateListOfMonitoredStudentsFlow',
    inputSchema: GenerateListOfMonitoredStudentsInputSchema,
    outputSchema: GenerateListOfMonitoredStudentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
