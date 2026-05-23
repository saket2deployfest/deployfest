import { Guard } from '@/lib/data';
import type { Grievance } from '@/app/(app)/grievances/page';

export type GuardAction = {
  type: 'REASSIGN_GUARD';
  guardId: string;
  guardName: string;
  fromSector: string;
  toSector: string;
  reason: string;
};

export type AmbulanceAction = {
  type: 'DEPLOY_AMBULANCE';
  grievanceId: string;
  grievanceDetails: string;
  location: string;
  userEmail: string;
  ambulanceId: string;
  ambulanceNumber: string;
  reason: string;
};

export type MedicalStaffAction = {
  type: 'ASSIGN_MEDICAL_STAFF';
  grievanceId: string;
  grievanceDetails: string;
  location: string;
  userEmail: string;
  medicalStaffId: string;
  medicalStaffName: string;
  reason: string;
};

export type AgentAction = GuardAction | AmbulanceAction | MedicalStaffAction;

export type AgentResponsePlan = {
  analysis: string;
  actions: AgentAction[];
};

export async function generateAutonomousCommandPlan(inputs: {
  guards: Guard[];
  alerts: any[];
  grievances: Grievance[];
  ambulances: any[];
  medicalStaff: any[];
}): Promise<AgentResponsePlan> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  if (!apiKey) {
    console.warn("No NEXT_PUBLIC_FIREBASE_API_KEY found. Falling back to offline fallback plan.");
    return generateOfflineFallbackPlan(inputs);
  }

  const systemPrompt = `You are the Drishti Autonomous Venue Safety Agent (powered by Vertex AI). 
Your task is to analyze the current safety metrics of the venue and create an optimal coordination plan. 
You will be provided with:
1. CCTV alerts (current crowd densities in active sectors).
2. Guards roster (their current sectors and status).
3. Active grievances (medical/security requests filed by users).
4. Ambulances roster (which are available/unavailable).
5. Medical staff roster (which are available/on-duty).

Your reasoning goals:
- **Crowd Control**: If any sector has an alert level of 'critical' or 'warning' (or density >= 45%), identify guards stationed in 'normal' density sectors (or sectors with lowest occupancy) and propose moving them to the congested sector. Propose at most 2 guard reassignments to avoid leaving other sectors entirely unstaffed.
- **Medical Emergency Triage**:
  - Triage each 'Medical Attention' grievance.
  - HIGH CRITICALITY: If details suggest highly urgent conditions (e.g. chest pain, cardiac, unconscious, severe bleeding, seizures/fits, head trauma, breathing failure, etc.), recommend deploying an available ambulance.
  - LOW/MEDIUM CRITICALITY: If details suggest first-aid or non-critical conditions (e.g. minor cuts, dizziness, exhaustion, headache, mild nausea), recommend sending an available medical staff member.
  - General grievances or missing persons do NOT need medical assignment; they are handled by other sectors.

You must return a JSON object conforming exactly to this format:
{
  "analysis": "A high-level synthesis of current crowd state and active grievances (2-3 sentences max).",
  "actions": [
    {
      "type": "REASSIGN_GUARD",
      "guardId": "string (the guard's database doc ID)",
      "guardName": "string",
      "fromSector": "string",
      "toSector": "string (name of the target congested sector)",
      "reason": "Clear explanation of why this guard is being moved"
    },
    {
      "type": "DEPLOY_AMBULANCE",
      "grievanceId": "string (the grievance doc ID)",
      "grievanceDetails": "string",
      "location": "string",
      "userEmail": "string",
      "ambulanceId": "string (the ambulance doc ID)",
      "ambulanceNumber": "string",
      "reason": "Explanation of high-criticality triage and choice of available ambulance"
    },
    {
      "type": "ASSIGN_MEDICAL_STAFF",
      "grievanceId": "string (the grievance doc ID)",
      "grievanceDetails": "string",
      "location": "string",
      "userEmail": "string",
      "medicalStaffId": "string (the medical staff doc ID)",
      "medicalStaffName": "string",
      "reason": "Explanation of low-criticality triage and choice of available medical staff"
    }
  ]
}

DO NOT include markdown block formatting (\`\`\`json ...) around the returned JSON. Just return the clean JSON string.`;

  const inputMessage = `
--- CCTV CROWD ALERTS ---
${JSON.stringify(inputs.alerts, null, 2)}

--- ACTIVE GUARDS ---
${JSON.stringify(inputs.guards.map(g => ({ id: g.id, name: g.name, sector: g.sector, status: g.status })), null, 2)}

--- ACTIVE GRIEVANCES ---
${JSON.stringify(inputs.grievances.map(g => ({ id: g.id, type: g.type, details: g.details, location: g.location, email: g.email || g.submittedBy })), null, 2)}

--- AMBULANCES ---
${JSON.stringify(inputs.ambulances.map(a => ({ id: a.id, number: a.ambulanceNumber, zone: a.zone, isAvailable: a.isAvailable })), null, 2)}

--- MEDICAL STAFF ---
${JSON.stringify(inputs.medicalStaff.map(s => ({ id: s.id, name: s.name, status: s.status, specialization: s.specialization })), null, 2)}
`;

  try {
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      {
        role: 'user',
        parts: [{ text: inputMessage }]
      }
    ];

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
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("Empty response from Vertex AI Gemini API");
    }

    responseText = responseText.trim();
    // Strip markdown JSON delimiters if generated
    if (responseText.startsWith('```json')) {
      responseText = responseText.substring(7);
    }
    if (responseText.endsWith('```')) {
      responseText = responseText.substring(0, responseText.length - 3);
    }

    const parsedResult = JSON.parse(responseText.trim());
    return {
      analysis: parsedResult.analysis || "Crowd flow is within safe limits and grievances are resolved.",
      actions: parsedResult.actions || []
    };
  } catch (error) {
    console.error("Error invoking Drishti Agent via Gemini:", error);
    return generateOfflineFallbackPlan(inputs);
  }
}

function generateOfflineFallbackPlan(inputs: {
  guards: Guard[];
  alerts: any[];
  grievances: Grievance[];
  ambulances: any[];
  medicalStaff: any[];
}): AgentResponsePlan {
  const actions: AgentAction[] = [];
  let analysis = "Drishti Autonomous Command Agent running in local triage mode.";

  // 1. Triage critical sectors
  const congestedSectors = inputs.alerts.filter(a => a.alert_level === 'critical' || a.alert_level === 'warning');
  if (congestedSectors.length > 0) {
    const targetSector = congestedSectors[0];
    const targetSectorName = targetSector.feed_name || targetSector.area;
    // Find a guard in a normal sector or on standby
    const standbyGuard = inputs.guards.find(g => g.status === 'Standby') || 
                          inputs.guards.find(g => g.sector !== 'Main Gate' && g.sector !== targetSectorName);
    
    if (standbyGuard) {
      actions.push({
        type: 'REASSIGN_GUARD',
        guardId: standbyGuard.id,
        guardName: standbyGuard.name,
        fromSector: standbyGuard.sector || 'Standby Pool',
        toSector: targetSectorName,
        reason: `Reassigning ${standbyGuard.name} to ${targetSectorName} to assist with high crowd density (${targetSector.density_percentage || 0}% occupancy).`
      });
    }
  }

  // 2. Triage grievances
  const newMedicalGrievances = inputs.grievances.filter(g => g.type === 'Medical Attention' && g.status === 'new');
  newMedicalGrievances.forEach(grievance => {
    const details = (grievance.details || '').toLowerCase();
    const isCritical = details.includes('chest') || details.includes('pain') || details.includes('breath') || details.includes('unconscious') || details.includes('blood') || details.includes('severe');
    
    if (isCritical) {
      const freeAmbulance = inputs.ambulances.find(a => a.isAvailable);
      if (freeAmbulance) {
        actions.push({
          type: 'DEPLOY_AMBULANCE',
          grievanceId: grievance.id,
          grievanceDetails: grievance.details,
          location: grievance.location || 'Main Gate',
          userEmail: grievance.email || grievance.submittedBy || 'user@test.com',
          ambulanceId: freeAmbulance.id,
          ambulanceNumber: freeAmbulance.ambulanceNumber,
          reason: `High criticality medical report matching "critical" keywords. Free ambulance ${freeAmbulance.ambulanceNumber} deployed immediately.`
        });
      }
    } else {
      const freeStaff = inputs.medicalStaff.find(s => s.status === 'available');
      if (freeStaff) {
        actions.push({
          type: 'ASSIGN_MEDICAL_STAFF',
          grievanceId: grievance.id,
          grievanceDetails: grievance.details,
          location: grievance.location || 'Food Court',
          userEmail: grievance.email || grievance.submittedBy || 'user@test.com',
          medicalStaffId: freeStaff.id,
          medicalStaffName: freeStaff.name,
          reason: `Standard triage: First-aid support. Medical staff ${freeStaff.name} dispatched to user location.`
        });
      }
    }
  });

  if (actions.length > 0) {
    analysis += ` Detected ${congestedSectors.length} busy sectors and ${newMedicalGrievances.length} medical grievances. Optimal plan formulated.`;
  } else {
    analysis += " All venue sectors are stable, and no medical attention grievances are currently open.";
  }

  return {
    analysis,
    actions
  };
}
