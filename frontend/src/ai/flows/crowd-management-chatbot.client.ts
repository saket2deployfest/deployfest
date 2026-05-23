export type ChatMessage = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};

export type CrowdManagementChatbotInput = {
  history: ChatMessage[];
  query: string;
};

export type ExtractedGrievanceInfo = {
  location?: string;
  name?: string;
  details?: string;
  missingPhoto?: boolean;
  poi?: 'Washroom' | 'Cloak Room' | 'Smoking Zone' | 'Hydration Area' | 'Lost and Found' | null;
};

export type CrowdManagementChatbotOutput = {
  category: 'MEDICAL_EMERGENCY' | 'MISSING_PERSON' | 'MAP_DIRECTIONS' | 'DEFAULT';
  response: string;
  action: 'NAVIGATE_TO_EMERGENCY_FORM' | 'NAVIGATE_TO_MISSING_PERSON_FORM' | 'SHOW_USER_MAP' | null;
  extractedInfo?: ExtractedGrievanceInfo;
};

export async function crowdManagementChatbot(
  input: CrowdManagementChatbotInput
): Promise<CrowdManagementChatbotOutput> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  if (!apiKey) {
    console.warn("No NEXT_PUBLIC_FIREBASE_API_KEY found, falling back to local simulation.");
    return fallbackLocalChatbot(input.query);
  }

  const systemPrompt = `You are Drishti Assistant, a highly advanced agentic crowd safety and venue management chatbot. 
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

Return a JSON object conforming strictly to this format:
{
  "category": "MEDICAL_EMERGENCY" | "MISSING_PERSON" | "MAP_DIRECTIONS" | "DEFAULT",
  "response": "User-facing message text",
  "action": "NAVIGATE_TO_EMERGENCY_FORM" | "NAVIGATE_TO_MISSING_PERSON_FORM" | "SHOW_USER_MAP" | null,
  "extractedInfo": {
    "location": "string (optional)",
    "name": "string (optional)",
    "details": "string (optional)",
    "missingPhoto": true/false (optional),
    "poi": "Washroom" | "Cloak Room" | "Smoking Zone" | "Hydration Area" | "Lost and Found" | null (optional)
  }
}`;

  // Format the history and new query for the Gemini API
  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    }
  ];

  // Add conversation history
  for (const msg of input.history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  // Add current query
  contents.push({
    role: 'user',
    parts: [{ text: input.query }]
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsedResult = JSON.parse(responseText.trim());
    return {
      category: parsedResult.category || 'DEFAULT',
      response: parsedResult.response || 'I am here to help you.',
      action: parsedResult.action === 'NONE' ? null : parsedResult.action,
      extractedInfo: parsedResult.extractedInfo,
    };
  } catch (error) {
    console.error("Error invoking Gemini agent client-side:", error);
    return fallbackLocalChatbot(input.query);
  }
}

function fallbackLocalChatbot(query: string): CrowdManagementChatbotOutput {
  const q = query.toLowerCase();
  if (q.includes('hurt') || q.includes('medical') || q.includes('injured') || q.includes('emergency')) {
    return {
      category: 'MEDICAL_EMERGENCY',
      response: '🚨 MEDICAL EMERGENCY detected! Opening emergency reporting and alerting medical dispatch.',
      action: 'NAVIGATE_TO_EMERGENCY_FORM',
      extractedInfo: {
        location: 'Main Gate',
        details: query
      }
    };
  }

  if (q.includes('missing') || q.includes('lost') || q.includes('find')) {
    return {
      category: 'MISSING_PERSON',
      response: '👥 MISSING PERSON reported. Please provide their name, description, and upload a photo so we can alert security.',
      action: 'NAVIGATE_TO_MISSING_PERSON_FORM',
      extractedInfo: {
        missingPhoto: true,
        details: query
      }
    };
  }

  if (q.includes('map') || q.includes('water') || q.includes('refill') || q.includes('toilet') || q.includes('washroom')) {
    let poi: ExtractedGrievanceInfo['poi'] = 'Hydration Area';
    if (q.includes('toilet') || q.includes('washroom')) poi = 'Washroom';
    return {
      category: 'MAP_DIRECTIONS',
      response: `🗺️ Opening the venue map and highlighting the nearest ${poi || 'Hydration Area'}.`,
      action: 'SHOW_USER_MAP',
      extractedInfo: {
        poi
      }
    };
  }

  return {
    category: 'DEFAULT',
    response: 'I help with:\n🚨 Medical emergencies\n👥 Missing persons\n🗺️ Map & directions\nWhat do you need?',
    action: null
  };
}
