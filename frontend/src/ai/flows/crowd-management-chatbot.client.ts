export type CrowdManagementChatbotInput = {
  history: Array<{ id: string; role: 'user' | 'bot'; text: string }>;
  query: string;
};

export type CrowdManagementChatbotOutput = {
  category: 'MEDICAL_EMERGENCY' | 'MISSING_PERSON' | 'MAP_DIRECTIONS' | 'DEFAULT';
  response: string;
  action: 'NAVIGATE_TO_EMERGENCY_FORM' | 'NAVIGATE_TO_MISSING_PERSON_FORM' | 'SHOW_USER_MAP' | null;
};

const keywordMatchers: Array<{
  category: CrowdManagementChatbotOutput['category'];
  keywords: string[];
  response: string;
  action: CrowdManagementChatbotOutput['action'];
}> = [
  {
    category: 'MEDICAL_EMERGENCY',
    keywords: ['medical', 'emergency', 'injured', 'hurt', 'sick', 'ambulance', 'doctor'],
    response:
      '🚨 MEDICAL EMERGENCY: Call emergency services immediately. Opening the medical form.',
    action: 'NAVIGATE_TO_EMERGENCY_FORM',
  },
  {
    category: 'MISSING_PERSON',
    keywords: ['missing', 'lost', 'find', 'cannot find', "can't find"],
    response: '👥 Opening the missing person report form.',
    action: 'NAVIGATE_TO_MISSING_PERSON_FORM',
  },
  {
    category: 'MAP_DIRECTIONS',
    keywords: ['map', 'where', 'direction', 'location', 'navigate'],
    response: '🗺️ Opening the event map for you.',
    action: 'SHOW_USER_MAP',
  },
];

export async function crowdManagementChatbot(
  input: CrowdManagementChatbotInput
): Promise<CrowdManagementChatbotOutput> {
  const query = input.query.toLowerCase();

  for (const matcher of keywordMatchers) {
    if (matcher.keywords.some((word) => query.includes(word))) {
      return {
        category: matcher.category,
        response: matcher.response,
        action: matcher.action,
      };
    }
  }

  return {
    category: 'DEFAULT',
    response:
      'I help with:\n🚨 Medical emergencies\n👥 Missing persons\n🗺️ Map & directions\nWhat do you need?',
    action: null,
  };
}
