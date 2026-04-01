
'use server';

/**
 * @fileOverview An insights engine that helps users understand their financial data.
 *
 * - getInsights - A function that generates insights based on user questions.
 * - GetInsightsInput - The input type for the getInsights function.
 * - GetInsightsOutput - The return type for the getInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetInsightsInputSchema = z.object({
  question: z
    .string()
    .describe('The question about spending habits and trends.'),
  financialData: z.string().describe('The financial data to analyze.'),
});
export type GetInsightsInput = z.infer<typeof GetInsightsInputSchema>;

const GetInsightsOutputSchema = z.object({
  summary: z.string().describe('A human-like summary answering the question.'),
});
export type GetInsightsOutput = z.infer<typeof GetInsightsOutputSchema>;

export async function getInsights(input: GetInsightsInput): Promise<GetInsightsOutput> {
  return getInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getInsightsPrompt',
  input: {schema: GetInsightsInputSchema},
  output: {schema: GetInsightsOutputSchema},
  prompt: `You are a financial advisor. Analyze the financial data and answer the question in a human-like summary.

Financial Data: {{{financialData}}}

Question: {{{question}}}`,
});

const getInsightsFlow = ai.defineFlow(
  {
    name: 'getInsightsFlow',
    inputSchema: GetInsightsInputSchema,
    outputSchema: GetInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
