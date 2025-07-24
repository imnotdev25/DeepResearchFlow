import { getUserApiKey } from './auth';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generatePaperChat(
  userId: number,
  paper: any,
  messages: OpenAIMessage[]
): Promise<string> {
  const userConfig = await getUserApiKey(userId);
  
  if (!userConfig) {
    throw new Error('OpenAI API key not configured. Please add your API key in settings.');
  }

  const systemPrompt = `You are an AI research assistant helping to analyze and discuss academic papers. 

Current paper being discussed:
Title: ${paper.title}
Authors: ${paper.authors?.map((a: any) => a.name).join(', ') || 'Unknown'}
Year: ${paper.year || 'Unknown'}
Abstract: ${paper.abstract || 'No abstract available'}
Venue: ${paper.venue || 'Unknown'}
Citation Count: ${paper.citationCount || 0}

Instructions:
- Provide helpful, accurate responses about this paper
- Draw insights from the paper's content when available
- Suggest related research directions or questions
- Help the user understand complex concepts
- Be concise but thorough in your explanations
- If you don't have specific information about the paper, say so clearly`;

  const response = await fetch(`${userConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}

export async function testApiKey(apiKey: string, baseUrl: string = "https://api.openai.com/v1"): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}