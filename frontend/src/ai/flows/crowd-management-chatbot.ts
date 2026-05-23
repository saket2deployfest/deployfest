'use server';
/**
 * @fileOverview A conversational chatbot for crowd management that can guide users through reporting a missing person.
 *
 * - crowdManagementChatbot - A function that handles the chatbot logic.
 * - CrowdManagementChatbotInput - The input type for the chatbot function.
 * - CrowdManagementChatbotOutput - The return type for the chatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractedGrievanceInfoSchema = z.object({
  location: z.string().optional(),
  name: z.string().optional(),
  details: z.string().optional(),
  missingPhoto: z.boolean().optional(),
  poi: z.enum(['Washroom', 'Cloak Room', 'Smoking Zone', 'Hydration Area', 'Lost and Found']).nullable().optional(),
});

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'bot']),
  text: z.string(),
});

const CrowdManagementChatbotInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe('The conversation history.'),
  query: z.string().describe('The latest user query to the chatbot.'),
});
export type CrowdManagementChatbotInput = z.infer<typeof CrowdManagementChatbotInputSchema>;

const CrowdManagementChatbotOutputSchema = z.object({
  category: z.enum(['MEDICAL_EMERGENCY', 'MISSING_PERSON', 'MAP_DIRECTIONS', 'DEFAULT']).describe('The category of the user query.'),
  response: z.string().describe('The chatbot response to the user.'),
  action: z.enum(['NAVIGATE_TO_EMERGENCY_FORM', 'NAVIGATE_TO_MISSING_PERSON_FORM', 'SHOW_USER_MAP']).nullable().describe('The navigation or prefill action to be taken by the frontend.'),
  extractedInfo: ExtractedGrievanceInfoSchema.optional(),
});
export type CrowdManagementChatbotOutput = z.infer<typeof CrowdManagementChatbotOutputSchema>;

export async function crowdManagementChatbot(input: CrowdManagementChatbotInput): Promise<CrowdManagementChatbotOutput> {
  return crowdManagementChatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'crowdManagementChatbotPrompt',
  input: {schema: CrowdManagementChatbotInputSchema},
  output: {schema: CrowdManagementChatbotOutputSchema},
  prompt: `You are Drishti Assistant, a highly advanced agentic crowd safety and venue management chatbot. 
Your goal is to triage user queries, extract structured details, and execute frontend actions (like filing reports or highlighting map POIs).

We have three primary categories:
1. MEDICAL_EMERGENCY: The user reports injuries, sickness, pain, unconsciousness, or any urgent health issue.
   - Response: Keep it urgent, direct, and reassuring. Always instruct them to stay calm.
   - Action: Set action to "NAVIGATE_TO_EMERGENCY_FORM".
   - ExtractedInfo: Extract the location if mentioned, and details of the injury/sickness.
2. MISSING_PERSON: The user reports a missing friend, relative, or child.
   - Special Rule: A valid missing person report MUST have a photo.
   - If the user hasn't provided a photo or full details in the conversation yet, ask them to upload a photo.
   - Set extractedInfo.missingPhoto = true to prompt the frontend to display an inline photo uploader.
   - Action: Set action to "NAVIGATE_TO_MISSING_PERSON_FORM" (only if they choose to use the tab form, but we will handle it inline inside the chat!).
   - ExtractedInfo: Extract "name" of the person, "details" (like "wearing a black hoodie"), and "location" (last seen).
3. MAP_DIRECTIONS: The user asks for directions, venue map, exits, washrooms, water, lost & found, etc.
   - Action: Set action to "SHOW_USER_MAP".
   - ExtractedInfo: Map the target landmarks to one of these exact Points of Interest (POI) names:
     - "water refill station", "drinking water", "hydration" -> "Hydration Area"
     - "washroom", "toilet", "restroom", "loo" -> "Washroom"
     - "cloak room", "bag storage", "luggage" -> "Cloak Room"
     - "smoking area", "smoking zone" -> "Smoking Zone"
     - "lost and found", "lost key", "lost phone" -> "Lost and Found"
     Set extractedInfo.poi to this POI name.
4. DEFAULT: General queries or greetings. No special action.

Current Conversation State:
- History: The user's conversation history is provided in the input. Use it for context.
- User's Latest Message: {{{query}}}

Analyze the user's message based on the history and current data, and respond with the appropriate JSON object conforming strictly to the output schema.
`,
});

const crowdManagementChatbotFlow = ai.defineFlow(
  {
    name: 'crowdManagementChatbotFlow',
    inputSchema: CrowdManagementChatbotInputSchema,
    outputSchema: CrowdManagementChatbotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
