
'use server';
/**
 * @fileOverview An AI agent that analyzes financial health.
 *
 * - analyzeFinancialHealth - A function that provides a health score and tips.
 * - FinancialHealthInput - The input type for the analyzeFinancialHealth function.
 * - FinancialHealthOutput - The return type for the analyzeFinancialHealth function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialHealthInputSchema = z.object({
  overallProfitMargin: z.number().describe('The overall profit margin as a percentage (e.g., 25 for 25%).'),
  totalIncome: z.number().describe('Total income over the analyzed period.'),
  totalExpenses: z.number().describe('Total expenses over the analyzed period.'),
  incomeTrend: z.string().describe("A brief description of the income trend (e.g., 'stable', 'increasing', 'decreasing')."),
  expenseTrend: z.string().describe("A brief description of the expense trend (e.g., 'stable', 'increasing', 'decreasing')."),
  transactionCount: z.number().describe("Total number of transactions analyzed."),
});
export type FinancialHealthInput = z.infer<typeof FinancialHealthInputSchema>;

const FinancialHealthOutputSchema = z.object({
  assessment: z.string().describe('A brief, qualitative assessment of the financial health (1-2 sentences).'),
  suggestedScore: z.number().min(0).max(100).describe('A suggested financial health score from 0 to 100, where 100 is excellent. This is an illustrative score.'),
  actionableTip: z.string().describe('One concise, actionable tip for improvement or sustainment.'),
});
export type FinancialHealthOutput = z.infer<typeof FinancialHealthOutputSchema>;

export async function analyzeFinancialHealth(input: FinancialHealthInput): Promise<FinancialHealthOutput> {
  return financialHealthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialHealthPrompt',
  input: {schema: FinancialHealthInputSchema},
  output: {schema: FinancialHealthOutputSchema},
  prompt: `You are an expert financial advisor for solopreneurs and small businesses.
Analyze the following financial summary and provide a concise health assessment, an illustrative score out of 100 (interpret the health based on the data), and one actionable tip.

Key Financial Metrics:
- Overall Profit Margin: {{overallProfitMargin}}%
- Total Income: {{totalIncome}}
- Total Expenses: {{totalExpenses}}
- Income Trend: {{incomeTrend}}
- Expense Trend: {{expenseTrend}}
- Number of Transactions: {{transactionCount}}

Consider factors like profitability, expense management, and income stability.
If profit margin is very low or negative, the score should reflect this concern.
If expenses are growing faster than income, highlight this.
Provide a constructive and encouraging tone.
The actionable tip should be specific and directly related to the provided data.
The assessment should be brief (1-2 sentences). The score is illustrative.
`,
});

const financialHealthFlow = ai.defineFlow(
  {
    name: 'financialHealthFlow',
    inputSchema: FinancialHealthInputSchema,
    outputSchema: FinancialHealthOutputSchema,
  },
  async (input) => {
    // Basic trend derivation (can be made more sophisticated)
    const derivedInput = { ...input };
    if (input.transactionCount < 10) { // Not enough data for strong trend analysis
        derivedInput.incomeTrend = derivedInput.incomeTrend || 'insufficient data';
        derivedInput.expenseTrend = derivedInput.expenseTrend || 'insufficient data';
    } else {
        derivedInput.incomeTrend = derivedInput.incomeTrend || 'stable'; // Default if not provided
        derivedInput.expenseTrend = derivedInput.expenseTrend || 'stable'; // Default if not provided
    }

    const {output} = await prompt(derivedInput);
    return output!;
  }
);
