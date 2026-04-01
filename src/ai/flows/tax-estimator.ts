
// tax-estimator.ts
'use server';

/**
 * @fileOverview Estimates taxes owed for different countries.
 *
 * - estimateTaxes - A function that estimates taxes owed.
 * - EstimateTaxesInput - The input type for the estimateTaxes function.
 * - EstimateTaxesOutput - The return type for the estimateTaxes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const countries = [
  'USA',
  'UK',
  'Canada',
  'Netherlands',
  'Germany',
  'France',
  'Australia',
  'India',
  'UAE',
  'Ireland',
  'Japan',
  'Singapore',
  'Brazil',
  'Mexico',
  'South Africa',
  'Italy',
  'Spain',
  'Sweden',
  'Poland',
  'Belgium',
  'Austria',
  'Portugal',
  'New Zealand',
  'Switzerland',
  'Norway',
  'Philippines',
  'Denmark',
  'Malaysia',
  'Romania',
  'Czech Republic',
  'Indonesia',
] as const;

const EstimateTaxesInputSchema = z.object({
  netProfit: z.number().describe('The net profit of the solopreneur.'),
  country: z.enum(countries).describe('The country for which to estimate taxes.'),
  filingStatus: z.string().describe('The filing status of the solopreneur.'),
});

export type EstimateTaxesInput = z.infer<typeof EstimateTaxesInputSchema>;

const EstimateTaxesOutputSchema = z.object({
  estimatedTaxOwed: z.number().describe('The estimated tax owed in USD.'),
  taxRate: z.number().describe('The tax rate as a percentage.'),
  suggestedQuarterlyPaymentAmount: z
    .number()
    .describe('The suggested quarterly payment amount in USD.'),
  localizedTaxRemindersAndDisclaimers: z.string().describe('Localized tax reminders and disclaimers.'),
});

export type EstimateTaxesOutput = z.infer<typeof EstimateTaxesOutputSchema>;

export async function estimateTaxes(input: EstimateTaxesInput): Promise<EstimateTaxesOutput> {
  return estimateTaxesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateTaxesPrompt',
  input: {schema: EstimateTaxesInputSchema},
  output: {schema: EstimateTaxesOutputSchema},
  prompt: `You are an expert tax advisor for solopreneurs.

You will estimate the tax owed, tax rate, suggested quarterly payments, and provide localized tax reminders and disclaimers.

Net Profit: {{netProfit}}
Country: {{country}}
Filing Status: {{filingStatus}}`,
});

const estimateTaxesFlow = ai.defineFlow(
  {
    name: 'estimateTaxesFlow',
    inputSchema: EstimateTaxesInputSchema,
    outputSchema: EstimateTaxesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
