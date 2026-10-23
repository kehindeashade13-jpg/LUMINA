import { askLuminaChat } from './gemini';
import { StudyMaterial, ChatMessage } from '../types/study';

export { askLuminaChat };

/**
 * Universal Academic Tutor service handler
 * Supports document-grounded context, universal vocabulary breakdown,
 * multi-tiered concept explanations, and active-recall challenges.
 */
export async function askUniversalTutor(
  query: string,
  history: ChatMessage[],
  material: StudyMaterial | null
): Promise<string> {
  return askLuminaChat(query, history, material);
}

export default {
  askLuminaChat,
  askUniversalTutor,
};
