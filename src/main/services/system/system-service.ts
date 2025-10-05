import { Service, Route } from '@/shared/decorators';
import { mastra } from '@/main/mastra';
import { getIpcRouterLogger } from '@/shared/logging/helpers';

const ipcLogger = getIpcRouterLogger();

@Service
export class SystemService {
  @Route('POST', '/api/chat')
  async chatRoute(request: Request): Promise<Response> {
    const logger = ipcLogger.getChild('chatRoute');
    const { messages } = await request.json();
    logger.debug('messages {messages}', { messages });
    logger.debug('Request has signal {hasSignal}', { hasSignal: !!request.signal });

    const myAgent = mastra.getAgent('weatherAgent');

    const stream = await myAgent.stream(messages, {
      abortSignal: request.signal
    });

    return stream.aisdk.v5.toUIMessageStreamResponse();
  }
}

export const systemService = new SystemService();
