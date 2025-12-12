import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { PlantAnalysisResult, ChatMessage, ChatSource, ARDetection, ARDetailedReport } from "../types";

// Define the response schema strictly to match our interface
const issueCheckSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    detected: { type: Type.BOOLEAN, description: "Whether this specific issue is present." },
    details: { type: Type.STRING, description: "A brief, friendly explanation of what was observed regarding this issue." },
  },
  required: ["detected", "details"],
};

const singlePlantSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isPlant: { type: Type.BOOLEAN, description: "Set to false if this specific object is not a plant." },
    plantName: { type: Type.STRING, description: "The common name of the plant." },
    confidence: { type: Type.NUMBER, description: "Confidence level of identification from 0 to 100." },
    alternatives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of other possible plant names if identification is not 100% certain."
    },
    issues: {
      type: Type.OBJECT,
      properties: {
        diseases: issueCheckSchema,
        pests: issueCheckSchema,
        underwatering: issueCheckSchema,
        overwatering: issueCheckSchema,
        soil: issueCheckSchema,
        sunlight: issueCheckSchema,
        nutrientDeficiency: issueCheckSchema,
        generalStress: issueCheckSchema,
      },
      required: ["diseases", "pests", "underwatering", "overwatering", "soil", "sunlight", "nutrientDeficiency", "generalStress"],
    },
    diagnosis: { type: Type.STRING, description: "A friendly, easy-to-understand summary of what is happening to THIS specific plant and why." },
    treatmentPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Short title of the step (e.g., 'Prune affected leaves')." },
          instruction: { type: Type.STRING, description: "Clear, practical instruction on how to perform the step." },
        },
        required: ["title", "instruction"],
      },
      description: "A step-by-step guide to fixing the issues, prioritizing organic and safe methods."
    },
    preventionTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Simple care habits to prevent future issues."
    },
    expertResources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of a recommended blog post or article from a reputable source." },
          description: { type: Type.STRING, description: "Brief reason why this article is helpful." },
          url: { type: Type.STRING, description: "The URL to the article. If unknown, leave empty." },
        },
        required: ["title", "description", "url"],
      },
      description: "List of 2-3 specific, high-quality articles or blogs relevant to this plant's care or current issues."
    }
  },
  required: ["isPlant", "plantName", "confidence", "issues", "diagnosis", "treatmentPlan", "preventionTips", "expertResources"],
};

// Root schema to handle multiple plants
const multiAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    plants: {
      type: Type.ARRAY,
      items: singlePlantSchema,
      description: "A list of all distinct plants identified in the image."
    }
  },
  required: ["plants"]
};

// AR Detection Schema
const arDetectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    detections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: "Short label of the issue (e.g., 'Brown Spot', 'Aphids')." },
          type: { 
            type: Type.STRING, 
            enum: ['disease', 'nutrient', 'dryness', 'pest', 'healthy', 'unknown'],
            description: "The category of the detected issue."
          },
          confidence: { type: Type.NUMBER, description: "Confidence score 0-100." },
          box_2d: {
             type: Type.ARRAY,
             items: { type: Type.NUMBER },
             description: "Bounding box coordinates [ymin, xmin, ymax, xmax] on a scale of 0 to 1000."
          }
        },
        required: ["label", "type", "confidence", "box_2d"]
      }
    }
  },
  required: ["detections"]
};

// Detailed Report Schema
const detailedReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    disease_name: { type: Type.STRING, description: "The most likely disease(s) detected. If none, say 'No major disease detected'." },
    confidence_score: { type: Type.NUMBER, description: "Percentage of certainty 0-100." },
    affected_area_description: { type: Type.STRING, description: "Describe which parts of the leaf/plant are affected." },
    symptoms_observed: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List all visible symptoms." },
    possible_causes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Environmental and biological causes." },
    severity_level: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
    immediate_actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "What the user should do right now." },
    long_term_prevention: { type: Type.ARRAY, items: { type: Type.STRING }, description: "What to do to avoid this disease." },
    care_score: { type: Type.NUMBER, description: "Rate the overall plant health from 1 to 10." },
    time_to_recovery: { type: Type.STRING, description: "Approximate recovery days/weeks." }
  },
  required: ["disease_name", "confidence_score", "affected_area_description", "symptoms_observed", "possible_causes", "severity_level", "immediate_actions", "long_term_prevention", "care_score", "time_to_recovery"]
};

export const analyzePlantImage = async (base64Image: string): Promise<PlantAnalysisResult[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Helper to remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, detection is robust
              data: base64Data,
            },
          },
          {
            text: "Analyze this image for plants. If there are multiple plants (e.g., a garden bed, shelf, or group), separate them and analyze EACH ONE individually. Return a list of analyses. Be a gentle, helpful plant expert.",
          },
        ],
      },
      config: {
        systemInstruction: "You are floroNova, a gentle and knowledgeable plant expert. Your goal is to reassure the user and provide clear, actionable advice. Identify every distinct plant in the image. If there are multiple plants, provide a separate health diagnosis and treatment plan for each one. Avoid jargon. Use a warm and supportive tone.",
        responseMimeType: "application/json",
        responseSchema: multiAnalysisSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from the analysis service.");
    }

    const result = JSON.parse(text);
    return result.plants as PlantAnalysisResult[];

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the plant(s). Please try again.");
  }
};

export const scanPlantAR = async (base64Image: string): Promise<ARDetection[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using Flash for speed/AR requirements
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: "Detect plant health issues in this image. Identify brown spots, yellowing, pests, fungal patches, or curling. Return bounding boxes [ymin, xmin, ymax, xmax] (0-1000) for each issue.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: arDetectionSchema,
        systemInstruction: "You are an AR plant scanner. Detect visible plant health issues. Categories: 'disease' (fungus, rot, spots), 'nutrient' (yellowing patterns), 'dryness' (wilting, crispy edges), 'pest' (insects, webbing). Use 'healthy' if a part looks exceptionally good but distinctive. Be precise with bounding boxes.",
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const result = JSON.parse(text);
    return result.detections || [];
  } catch (error) {
    console.error("AR Scan Error:", error);
    return [];
  }
};

export const generateDetailedARReport = async (base64Image: string): Promise<ARDetailedReport> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: "Provide a comprehensive plant disease report based on visual analysis.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: detailedReportSchema,
        systemInstruction: "You are an expert plant-disease detection assistant. Analyze the plant in detail. If no disease is found, state 'No major disease detected' but still provide health analysis. Do not ask questions. Direct analysis only.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No report generated");
    
    return JSON.parse(text) as ARDetailedReport;
  } catch (error) {
    console.error("Detailed Report Error:", error);
    throw error;
  }
};

export const createChatSession = (): Chat => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: "You are floroNova's intelligent assistant. Help users with gardening questions, plant identification tips, and care advice. You have access to Google Search to find real-time information. Always provide helpful, friendly, and scientifically accurate information. If you use external sources, they will be automatically cited, so just focus on the answer.",
      tools: [{ googleSearch: {} }],
    },
  });
};

export const sendChatMessage = async (chat: Chat, message: string, image?: string): Promise<Omit<ChatMessage, 'id' | 'timestamp' | 'role'>> => {
  try {
    let content: any = message;
    
    if (image) {
      // If image is present, construct a multipart message
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      content = [
        { text: message || "Analyze this image." },
        { 
          inlineData: { 
            mimeType: "image/jpeg", 
            data: base64Data 
          } 
        }
      ];
    }

    const response = await chat.sendMessage({ message: content });
    const text = response.text || "I'm sorry, I couldn't generate a response.";
    
    const sources: ChatSource[] = [];
    // Extract grounding chunks
    const candidates = response.candidates;
    if (candidates && candidates[0] && candidates[0].groundingMetadata && candidates[0].groundingMetadata.groundingChunks) {
       candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
         if (chunk.web) {
           sources.push({
             title: chunk.web.title,
             uri: chunk.web.uri
           });
         }
       });
    }

    return { text, sources };
  } catch (error) {
    console.error("Chat Error:", error);
    throw new Error("Failed to send message.");
  }
};