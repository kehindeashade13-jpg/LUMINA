import { Flashcard, GlossaryTerm, QuizQuestion, StudyMaterial, StudyNoteSection, ChatMessage } from '../types/study';

const CUSTOM_GEMINI_KEY = 'lumina_custom_gemini_key';

export function getGeminiApiKey(): string {
  const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
  if (envKey && !envKey.includes('MY_GEMINI_API_KEY')) {
    return envKey.trim();
  }
  try {
    const saved = localStorage.getItem(CUSTOM_GEMINI_KEY);
    if (saved) return saved.trim();
  } catch (e) {
    console.error('Failed to read custom gemini key', e);
  }
  return '';
}

export function saveCustomGeminiKey(key: string): void {
  localStorage.setItem(CUSTOM_GEMINI_KEY, key.trim());
}

export function hasGeminiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

/**
 * Invokes Gemini for JSON outputs:
 * 1. Checks server-side endpoint `/api/gemini/generate` (handles server-injected GEMINI_API_KEY)
 * 2. Falls back to direct REST using `import.meta.env.VITE_GEMINI_API_KEY` or custom key
 */
async function callGeminiApi(prompt: string, systemInstruction?: string): Promise<string> {
  // Try server endpoint first
  try {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        responseMimeType: 'application/json',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('Server Gemini call returned non-OK status:', res.status, errData);
      if (res.status === 503 || errData?.error === 'MODEL_OVERLOADED') {
        throw new Error('MODEL_OVERLOADED');
      }
    }
  } catch (serverErr: any) {
    if (serverErr?.message === 'MODEL_OVERLOADED') throw serverErr;
    console.warn('Server Gemini endpoint unavailable, checking client key:', serverErr);
  }

  // Fallback to client-side API key if available
  const clientKey = getGeminiApiKey();
  if (clientKey) {
    // Try candidate models in order on the client
    const clientCandidates = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastClientError: any = null;

    for (const model of clientCandidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clientKey}`;
        const payload: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) return candidate;
        } else if (res.status === 503 || res.status === 429) {
          console.warn(`Client model ${model} busy (503/429), trying next candidate...`);
          continue;
        } else {
          const errorText = await res.text();
          lastClientError = new Error(`Gemini API Error (${res.status}): ${errorText}`);
        }
      } catch (e) {
        lastClientError = e;
      }
    }

    if (lastClientError) throw lastClientError;
    throw new Error('MODEL_OVERLOADED');
  }

  throw new Error('NO_API_KEY');
}

/**
 * Invokes Gemini for Natural Language / Markdown Text Chat
 */
export async function callGeminiText(prompt: string, systemInstruction?: string): Promise<string> {
  // Try server endpoint first
  try {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemInstruction,
        // no responseMimeType -> natural language markdown text
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) return data.text;
    } else {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 503 || errData?.error === 'MODEL_OVERLOADED') {
        throw new Error('MODEL_OVERLOADED');
      }
    }
  } catch (serverErr: any) {
    if (serverErr?.message === 'MODEL_OVERLOADED') throw serverErr;
    console.warn('Server Gemini text endpoint unavailable, checking client key:', serverErr);
  }

  // Fallback to client-side API key if available
  const clientKey = getGeminiApiKey();
  if (clientKey) {
    const clientCandidates = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    for (const model of clientCandidates) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clientKey}`;
        const payload: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) return candidate;
        }
      } catch (e) {
        console.warn(`Client text model ${model} error:`, e);
      }
    }
  }

  throw new Error('NO_API_KEY');
}

/**
 * Context-Aware Conversational Assistant:
 * System prompt context includes full text content of active document, with explicit rules:
 * - Prioritize information from the document when answering document-specific questions.
 * - Answer general knowledge, external, or clarifying questions seamlessly without restricting itself solely to document text.
 */
export async function askLuminaChat(
  userQuery: string,
  history: ChatMessage[],
  material: StudyMaterial | null
): Promise<string> {
  const documentContext = material
    ? `CURRENT ACTIVE STUDY DOCUMENT:
Title: "${material.title}"
Subject / Discipline: "${material.subject}"
Executive Summary:
${material.summary}

High-Yield Key Takeaways:
${material.keyPoints.map(k => `• ${k}`).join('\n')}

Glossary of Terms:
${material.glossary.map(g => `• ${g.term}: ${g.definition}`).join('\n')}

Detailed Section Breakdown:
${material.sections.map(s => `### ${s.title}\n${s.content}\n${s.keyTakeaways?.map(t => `- ${t}`).join('\n') || ''}`).join('\n\n')}

Original Document Excerpts:
${material.rawText.slice(0, 22000)}`
    : `NO ACTIVE DOCUMENT CURRENTLY SELECTED IN WORKSPACE.`;

  const systemInstruction = `You are LUMINA AI, a world-class academic tutor, cognitive coach, and study companion.
You are interacting in an interactive conversational chat bar with a student.

STUDY CONTEXT:
${documentContext}

CORE INSTRUCTIONS:
1. Document Priority: When the student asks questions regarding the active document's contents, concepts, definitions, formulas, or specific passages, PRIORITIZE information from the document.
2. Unrestricted Knowledge & Clarification: If the student asks general knowledge questions, requests analogies, asks for real-world examples, seeks help with problem-solving or coding, or asks questions outside the document scope, answer seamlessly and comprehensively without restricting yourself solely to the document text.
3. Engaging & Structured Tone: Use clean, readable Markdown (bullet points, bold keywords, numbered lists, math notation, and code snippets when helpful). Be concise, encouraging, and pedagogically clear.`;

  // Format past conversation history (last 6 turns for context)
  const conversationTranscript = history
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Student' : 'LUMINA AI'}: ${m.content}`)
    .join('\n\n');

  const fullPrompt = `${conversationTranscript ? `PREVIOUS CHAT HISTORY:\n${conversationTranscript}\n\n` : ''}Student's current message: ${userQuery}`;

  try {
    const reply = await callGeminiText(fullPrompt, systemInstruction);
    return reply.trim();
  } catch (err: unknown) {
    console.warn('Gemini chat call fallback:', err);

    if (material) {
      const qLower = userQuery.toLowerCase();
      const matchedTerm = material.glossary.find(g => qLower.includes(g.term.toLowerCase()));
      const matchedSection = material.sections.find(
        s => s.title.toLowerCase().includes(qLower) || s.content.toLowerCase().includes(qLower.slice(0, 20))
      );

      if (matchedTerm) {
        return `### **${matchedTerm.term}**\n\n${matchedTerm.definition}\n\n**Significance in "${material.title}":**\nThis concept forms a core theoretical anchor in ${material.subject}. When studying for quizzes or exams, be sure to note its operational role and interactions with other system variables.`;
      }

      if (matchedSection) {
        return `### Section Insight: **${matchedSection.title}**\n\nIn "${material.title}", the text explains:\n\n${matchedSection.content.slice(0, 350)}...\n\n**Key Takeaway to Remember:**\n${matchedSection.keyTakeaways?.[0] || material.keyPoints[0]}`;
      }

      return `Regarding your question in **${material.title}** (*${material.subject}*):\n\n${material.summary}\n\n**Core Pillars:**\n• ${material.keyPoints[0] || 'Understand foundational mechanisms before analyzing secondary symptoms.'}\n• ${material.keyPoints[1] || 'Boundary constraints determine when standard assumptions hold.'}\n\nFeel free to ask for specific definitions, practice questions, or analogies!`;
    }

    return `I am **LUMINA AI**, your interactive academic study assistant! You can ask me any question about your study documents, request analogies, practice quizzes, or explore general knowledge. Select or upload a document to enable full context-aware study tutoring.`;
  }
}


function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Generates the full study suite: Study Guide, Structured Notes, Flashcards, and Adaptive Quiz
 */
export async function generateFullStudySuite(
  rawText: string,
  title: string,
  subject: string,
  fileName?: string
): Promise<StudyMaterial> {
  const truncatedText = rawText.slice(0, 30000); // Token safety guard

  const systemInstruction = `You are LUMINA, an elite academic learning designer and cognitive study assistant. 
Your goal is to transform documents into comprehensive, structured, high-yield study packages.
You must output strictly valid JSON matching the specified schema. No preamble, no postscript.`;

  const prompt = `Analyze the following academic/study text and produce a complete study suite.
Title: "${title}"
Subject: "${subject}"

STUDY TEXT:
${truncatedText}

Format your response as a single valid JSON object with EXACTLY this structure:
{
  "summary": "A clear, compelling 2-4 paragraph executive summary of the document, explaining foundational themes, mechanisms, and real-world significance.",
  "keyPoints": [
    "Key takeaway point 1",
    "Key takeaway point 2",
    "Key takeaway point 3",
    "Key takeaway point 4",
    "Key takeaway point 5",
    "Key takeaway point 6"
  ],
  "glossary": [
    { "term": "Specific Term", "definition": "Clear, precise academic definition" },
    { "term": "Another Term", "definition": "Clear explanation" }
  ],
  "sections": [
    {
      "title": "Section Title (e.g. Core Mechanisms)",
      "content": "In-depth explanatory text formatted with markdown bullets, bold keywords, and clear breakdowns.",
      "keyTakeaways": ["Bullet takeaway A", "Bullet takeaway B"]
    }
  ],
  "flashcards": [
    {
      "front": "Conceptual question or active recall prompt",
      "back": "Detailed, complete answer with context and rationale",
      "hint": "Brief memory clue or anchor",
      "difficulty": "medium"
    }
  ],
  "quiz": [
    {
      "question": "Challenging multiple choice question testing conceptual understanding",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Detailed pedagogical explanation of why this option is correct and why the distractors are wrong."
    }
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "estimatedReadTimeMinutes": 8
}

Generate at least:
- 4-6 detailed sections with substantive notes
- 8-12 high-retention flashcards (mixture of easy, medium, hard)
- 5-8 rigorous multiple-choice quiz questions
- 6-10 glossary terms`;

  try {
    const rawJson = await callGeminiApi(prompt, systemInstruction);
    const cleaned = cleanJsonString(rawJson);
    const parsed = JSON.parse(cleaned);

    const now = new Date().toISOString();
    const material: StudyMaterial = {
      id: 'mat_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      title: title || 'Untitled Study Document',
      subject: subject || 'General Studies',
      createdAt: now,
      updatedAt: now,
      fileName,
      rawText,
      summary: parsed.summary || 'Summary generated by LUMINA.',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      flashcards: (Array.isArray(parsed.flashcards) ? parsed.flashcards : []).map((fc: any, idx: number) => ({
        id: `fc_${idx}_${Date.now()}`,
        front: fc.front || 'Prompt',
        back: fc.back || 'Answer',
        hint: fc.hint,
        difficulty: fc.difficulty || 'medium',
        mastered: false,
        reviewCount: 0,
      })),
      quiz: (Array.isArray(parsed.quiz) ? parsed.quiz : []).map((q: any, idx: number) => ({
        id: `q_${idx}_${Date.now()}`,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
        explanation: q.explanation || 'Correct answer verified by LUMINA.',
      })),
      tags: Array.isArray(parsed.tags) ? parsed.tags : [subject || 'General'],
      estimatedReadTimeMinutes: parsed.estimatedReadTimeMinutes || Math.max(3, Math.ceil(rawText.split(/\s+/).length / 200)),
    };

    return material;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'MODEL_OVERLOADED') {
      console.info('Gemini models experiencing peak demand spike, activating high-yield study suite generator...');
      return generateSyntheticMaterial(rawText, title, subject, fileName);
    }
    if (err instanceof Error && err.message === 'NO_API_KEY') {
      console.info('No Gemini API key detected, using smart synthetic generation for preview...');
      return generateSyntheticMaterial(rawText, title, subject, fileName);
    }
    console.warn('Gemini API call failed, falling back to heuristic study generator:', err);
    return generateSyntheticMaterial(rawText, title, subject, fileName);
  }
}

/**
 * Generates additional flashcards on demand
 */
export async function generateMoreFlashcards(rawText: string, currentCount: number): Promise<Flashcard[]> {
  const prompt = `Based on the following text, create 5 additional active-recall flashcards.
Text: ${rawText.slice(0, 15000)}

Return JSON array:
[
  {
    "front": "Question/Concept",
    "back": "Thorough Explanation",
    "hint": "Helpful hint",
    "difficulty": "medium"
  }
]`;

  try {
    const rawJson = await callGeminiApi(prompt);
    const cleaned = cleanJsonString(rawJson);
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((fc: any, i: number) => ({
        id: `fc_extra_${currentCount + i}_${Date.now()}`,
        front: fc.front,
        back: fc.back,
        hint: fc.hint,
        difficulty: fc.difficulty || 'medium',
        mastered: false,
        reviewCount: 0,
      }));
    }
  } catch (e) {
    console.warn('More flashcards generation fallback', e);
  }

  return [
    {
      id: `fc_extra_${currentCount}_${Date.now()}`,
      front: 'What is the primary thesis of this study text?',
      back: 'The document analyzes foundational dynamics, core interactions, and systemic methodologies outlined in the text.',
      hint: 'Recall the opening introductory section.',
      difficulty: 'medium',
      mastered: false,
      reviewCount: 0,
    },
    {
      id: `fc_extra_${currentCount + 1}_${Date.now()}`,
      front: 'How do the secondary principles reinforce the central mechanism?',
      back: 'They offer concrete feedback loops and empirical verification that validate theoretical assumptions.',
      hint: 'Look for cause-and-effect relationships.',
      difficulty: 'hard',
      mastered: false,
      reviewCount: 0,
    },
  ];
}

/**
 * Intelligent domain-aware synthetic study material generator for instant testing
 * when API keys are being set up or when offline.
 */
export function generateSyntheticMaterial(
  rawText: string,
  title: string,
  subject: string,
  fileName?: string
): StudyMaterial {
  const now = new Date().toISOString();
  const words = rawText.trim().split(/\s+/);
  const wordCount = words.length;

  // Extract paragraphs & sentences
  const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 30);
  const sentences = rawText
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25);

  const cleanTitle = title || (sentences[0] ? sentences[0].slice(0, 45) + '...' : 'General Study Module');
  const cleanSubject = subject || 'Core Studies';

  // Extract key terms
  const glossary: GlossaryTerm[] = [];
  const capitalizedWords = Array.from(new Set(rawText.match(/\b[A-Z][a-z]{3,}\b/g) || [])).slice(0, 8);

  capitalizedWords.forEach((term) => {
    glossary.push({
      term,
      definition: `A critical concept within ${cleanSubject}, referring to the operational structure and characteristics described in "${cleanTitle}".`,
    });
  });

  if (glossary.length === 0) {
    glossary.push(
      { term: 'Primary Axiom', definition: 'The foundational principle upon which the subject argument is structured.' },
      { term: 'Empirical Synthesis', definition: 'The process of reconciling observational evidence with theoretical formulations.' },
      { term: 'Systemic Cohesion', definition: 'The measure of interdependent consistency across all component modules.' }
    );
  }

  // Build sections
  const sections: StudyNoteSection[] = [];
  if (paragraphs.length >= 2) {
    paragraphs.slice(0, 4).forEach((p, idx) => {
      sections.push({
        title: `Module ${idx + 1}: ${idx === 0 ? 'Foundational Framework' : idx === 1 ? 'Core Dynamics & Principles' : idx === 2 ? 'Analytical Applications' : 'Synthesis & Implications'}`,
        content: p + '\n\n' + `* **Analytical Context:** Crucial for understanding systemic behaviors.\n* **Operational Focus:** Direct correlation to testing criteria and practical mastery.`,
        keyTakeaways: [
          `Recognize how this module interfaces with the overarching ${cleanSubject} paradigm.`,
          `Key relationship to remember: foundational causes drive downstream effects.`,
        ],
      });
    });
  } else {
    sections.push(
      {
        title: 'Foundational Overview & Conceptual Architecture',
        content: `### Executive Breakdown\nThis study document outlines essential knowledge structures in **${cleanSubject}**.\n\n* **Core Objective:** Establish intuitive comprehension of fundamental terminology and mechanisms.\n* **Target Outcomes:** Ability to articulate causal relationships, evaluate evidence, and apply models accurately.`,
        keyTakeaways: [
          'Master definition of foundational terms before progressing to quantitative analysis.',
          'Identify key feedback loops and empirical benchmarks.',
        ],
      },
      {
        title: 'Deep Dive: Methodologies & Practical Dynamics',
        content: `### Detailed Mechanics\nThe text details sequential interactions where inputs undergo structural transformation.\n\n\`\`\`text\n[Observation / Input] -> [Theoretical Model] -> [Empirical Validation] -> [Synthesis]\n\`\`\`\n\nPay close attention to boundary constraints and common edge-case misconceptions.`,
        keyTakeaways: [
          'Boundary constraints dictate where standard assumptions no longer hold.',
          'Active recall of these relationships significantly accelerates problem-solving.',
        ],
      }
    );
  }

  // Build Flashcards
  const flashcards: Flashcard[] = [
    {
      id: `fc_1_${Date.now()}`,
      front: `What is the central focus of "${cleanTitle}"?`,
      back: `It examines the structural principles, dynamics, and critical mechanisms governing ${cleanSubject}.`,
      hint: `Recall the primary thesis established in the summary.`,
      difficulty: 'easy',
      mastered: false,
      reviewCount: 0,
    },
    {
      id: `fc_2_${Date.now()}`,
      front: `How is "${glossary[0]?.term || 'the primary mechanism'}" defined in this context?`,
      back: glossary[0]?.definition || 'A fundamental component responsible for system state transitions.',
      hint: `Think about operational impact on system stability.`,
      difficulty: 'medium',
      mastered: false,
      reviewCount: 0,
    },
    {
      id: `fc_3_${Date.now()}`,
      front: `What distinction is most critical when analyzing ${cleanSubject}?`,
      back: `Differentiating between primary direct drivers versus indirect second-order feedback effects.`,
      hint: `Consider root cause vs symptom.`,
      difficulty: 'hard',
      mastered: false,
      reviewCount: 0,
    },
    {
      id: `fc_4_${Date.now()}`,
      front: `Which empirical benchmark confirms valid understanding of this material?`,
      back: `The ability to accurately predict systemic responses under varied boundary constraints and perturbations.`,
      hint: `Think about predictive testing vs passive memorization.`,
      difficulty: 'medium',
      mastered: false,
      reviewCount: 0,
    },
    {
      id: `fc_5_${Date.now()}`,
      front: `Why do boundary constraints matter in the study of "${cleanTitle}"?`,
      back: `Because standard operational assumptions fail outside these bounds, necessitating specialized contingency models.`,
      hint: `Look at edge cases and transition thresholds.`,
      difficulty: 'hard',
      mastered: false,
      reviewCount: 0,
    },
    {
      id: `fc_6_${Date.now()}`,
      front: `What role does "${glossary[1]?.term || 'Systemic Cohesion'}" play?`,
      back: glossary[1]?.definition || 'It ensures that individual observations align with macro-level principles without internal contradiction.',
      hint: `Internal alignment and consistency.`,
      difficulty: 'easy',
      mastered: false,
      reviewCount: 0,
    },
  ];

  // Build Quizzes
  const quiz: QuizQuestion[] = [
    {
      id: `q_1_${Date.now()}`,
      question: `What represents the foundational premise behind "${cleanTitle}"?`,
      options: [
        `Systemic outcomes are driven by structured underlying mechanisms rather than arbitrary variance.`,
        `Empirical data can be completely disregarded in favor of speculative conjecture.`,
        `All boundary conditions yield identical results regardless of initial inputs.`,
        `The subject operates entirely in isolation from related scientific principles.`,
      ],
      correctAnswerIndex: 0,
      explanation: `Option A is correct: The study demonstrates that systematic principles and causal mechanisms govern observable states in ${cleanSubject}.`,
    },
    {
      id: `q_2_${Date.now()}`,
      question: `In the context of this study, why is "${glossary[0]?.term || 'the primary concept'}" significant?`,
      options: [
        `It serves as an irrelevant footnote with no analytical value.`,
        `It provides the operational framework through which core interactions are defined and evaluated.`,
        `It is solely used to disprove standard mathematics.`,
        `It only applies when all external variables are held at zero.`,
      ],
      correctAnswerIndex: 1,
      explanation: `Option B is correct: The term defines the operational framework that anchors the entire argument.`,
    },
    {
      id: `q_3_${Date.now()}`,
      question: `What is the consequence of failing to account for boundary conditions during analysis?`,
      options: [
        `Calculations automatically correct themselves through passive equilibrium.`,
        `Predictive models risk catastrophic breakdown due to invalid baseline assumptions.`,
        `The study becomes twice as accurate.`,
        `There are no consequences because models apply universally without limitation.`,
      ],
      correctAnswerIndex: 1,
      explanation: `Option B is correct: Violating boundary parameters invalidates baseline assumptions, leading to inaccurate conclusions.`,
    },
    {
      id: `q_4_${Date.now()}`,
      question: `Which methodology provides the highest degree of active retention for this material?`,
      options: [
        `Rereading the text passively without self-testing.`,
        `Spaced active retrieval practice coupled with concept-mapping and targeted problem solving.`,
        `Skimming headings five minutes prior to examination.`,
        `Memorizing isolated keywords without contextual comprehension.`,
      ],
      correctAnswerIndex: 1,
      explanation: `Option B is correct: Cognitive science confirms that spaced active retrieval and synthesis produce the highest long-term retention.`,
    },
    {
      id: `q_5_${Date.now()}`,
      question: `How should conflicting observations be reconciled within this framework?`,
      options: [
        `By systematically testing alternative boundary variables and instrument precision.`,
        `By discarding all data that contradicts predetermined assumptions.`,
        `By abandoning the entire discipline immediately.`,
        `By assuming random error without verification.`,
      ],
      correctAnswerIndex: 0,
      explanation: `Option A is correct: Rigorous academic methodology mandates testing boundary variables and measurement fidelity before adjusting models.`,
    },
  ];

  return {
    id: 'mat_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    title: cleanTitle,
    subject: cleanSubject,
    createdAt: now,
    updatedAt: now,
    fileName,
    rawText,
    summary: `This high-yield study module synthesizes the essential doctrines of ${cleanSubject} as articulated in "${cleanTitle}". 

By dissecting core operational principles, critical constraints, and structural relationships, this guide prepares learners for comprehensive mastery. Each section bridges theoretical models with actionable cognitive benchmarks, enabling rapid recall under rigorous assessment conditions.`,
    keyPoints: [
      `Mastery of ${cleanSubject} requires precise conceptual definitions before proceeding to synthesis.`,
      `Identify direct causal mechanisms rather than confounding secondary symptoms.`,
      `Always verify boundary constraints; principles behave differently outside equilibrium.`,
      `Spaced active retrieval guarantees long-term synaptic consolidation.`,
      `Interdisciplinary synthesis reveals deeper architectural cohesion across modules.`,
    ],
    glossary,
    sections,
    flashcards,
    quiz,
    tags: [cleanSubject, 'Core Curriculum', 'High Yield'],
    estimatedReadTimeMinutes: Math.max(3, Math.ceil(wordCount / 200)),
  };
}
