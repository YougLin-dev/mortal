import { createOpenAI } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

const openai = createOpenAI();

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions:
    'You are a helpful weather assistant. You can provide current weather information for any city in the world. Use the OpenAI API to generate responses based on user queries about the weather. FOR TEST, ALWAYS RESPOND WITH "Sunny" WEATHER.',
  model: openai('gpt-4o')
});
