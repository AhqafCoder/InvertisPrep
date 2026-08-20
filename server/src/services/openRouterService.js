const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

if (!OPENROUTER_API_KEY) {
  console.warn('[openRouterService] OPENROUTER_API_KEY not set - AI features will fail');
}

async function callOpenRouter(messages, options = {}) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://invertisprep.in',
      'X-Title': 'InvertisPrep Resume Builder',
    },
    body: JSON.stringify({
      model: options.model || OPENROUTER_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
      response_format: options.json ? { type: 'json_object' } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

function extractJson(text) {
  try {
    // Try to parse directly
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    // Try to find JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not extract JSON from response');
  }
}

// ─── Prompts ───

const SYSTEM_PROMPT = `You are an expert resume writer and career coach. You help users create ATS-friendly, compelling resumes. Always output valid JSON only - no markdown, no explanations.`;

function buildSummaryPrompt({ experience, skills, targetRole }) {
  const expText = experience.map(e => `${e.role} at ${e.company}: ${e.description} | Achievements: ${e.achievements.join('; ')}`).join('\n');
  const skillsText = skills.join(', ');
  return `Generate a compelling 3-4 sentence professional summary for a resume.
  
Experience:
${expText || 'None provided'}

Skills: ${skillsText || 'None provided'}
Target Role: ${targetRole || 'Not specified'}

Return JSON: { "summary": "..." }`;
}

function buildExperienceBulletsPrompt({ company, role, description }) {
  return `Write 4-5 strong, quantified achievement bullets for a resume entry.
  
Company: ${company}
Role: ${role}
Description: ${description || 'Not provided'}

Guidelines:
- Start with strong action verbs
- Include metrics/numbers where possible
- Focus on impact, not duties
- Keep each bullet under 2 lines
- ATS-friendly keywords

Return JSON: { "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"] }`;
}

function buildProjectDescriptionPrompt({ name, techStack, goal }) {
  return `Write a compelling 2-3 sentence project description for a resume.
  
Project Name: ${name}
Tech Stack: ${techStack.join(', ') || 'Not specified'}
Goal/Outcome: ${goal || 'Not specified'}

Guidelines:
- Mention key technologies
- Highlight the problem solved or value delivered
- Keep it concise and impressive
- ATS-friendly

Return JSON: { "description": "..." }`;
}

function buildSuggestSkillsPrompt({ targetRole, currentSkills }) {
  return `Suggest 4-6 categorized skill groups for a ${targetRole} resume.
  
Current Skills: ${currentSkills.join(', ') || 'None'}

Guidelines:
- Group into logical categories (Technical, Languages, Frameworks, Tools, Soft Skills, etc.)
- Include both current skills and relevant missing skills
- 4-8 items per group
- Prioritize skills mentioned in typical ${targetRole} job descriptions
- ATS-friendly keywords

Return JSON: { "skillGroups": [{"title": "Category", "items": ["skill1", "skill2"]}, ...] }`;
}

function buildRewritePrompt({ text, instruction }) {
  const instructions = {
    polish: 'Improve clarity, flow, and professional tone. Fix grammar.',
    shorten: 'Make it more concise while keeping key points.',
    quantify: 'Add specific metrics, numbers, and measurable outcomes where possible.',
    actionVerbs: 'Rewrite to start with strong action verbs. Remove passive voice.',
  };
  
  return `Rewrite the following text based on this instruction: "${instructions[instruction] || instruction}"
  
Text: "${text}"

Return JSON: { "rewritten": "..." }`;
}

function buildATSScorePrompt({ resume, targetJD }) {
  const resumeText = `
Title: ${resume.title}
Summary: ${resume.summary}
Experience: ${resume.experience.map(e => `${e.role} at ${e.company}: ${e.description} ${e.achievements.join(' ')}`).join(' | ')}
Projects: ${resume.projects.map(p => `${p.name}: ${p.description} ${p.achievements.join(' ')}`).join(' | ')}
Skills: ${resume.skillGroups.flatMap(g => g.items).join(', ')}
Achievements: ${resume.achievements.join(', ')}
  `.trim();

  return `Analyze this resume for ATS compatibility${targetJD ? ` against the target job description` : ''}.
  
Resume:
${resumeText}

${targetJD ? `Target Job Description:\n${targetJD}` : ''}

Return JSON with:
{
  "score": 0-100,
  "missingKeywords": ["keyword1", "keyword2", ...],
  "suggestions": ["specific actionable suggestion 1", "suggestion 2", ...]
}

Score criteria: keyword match, format, completeness, quantifiable achievements, section coverage.`;
}

// ─── Public API ───

async function generateSummary(context) {
  const content = await callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildSummaryPrompt(context) },
  ], { json: true, temperature: 0.6 });
  return extractJson(content).summary;
}

async function generateExperienceBullets(context) {
  const content = await callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildExperienceBulletsPrompt(context) },
  ], { json: true, temperature: 0.7 });
  return extractJson(content).bullets;
}

async function generateProjectDescription(context) {
  const content = await callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildProjectDescriptionPrompt(context) },
  ], { json: true, temperature: 0.6 });
  return extractJson(content).description;
}

async function suggestSkills(context) {
  const content = await callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildSuggestSkillsPrompt(context) },
  ], { json: true, temperature: 0.7 });
  return extractJson(content).skillGroups;
}

async function rewriteText(text, instruction) {
  const content = await callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildRewritePrompt({ text, instruction }) },
  ], { json: true, temperature: 0.5 });
  return extractJson(content).rewritten;
}

async function getATSScore(resume, targetJD) {
  const content = await callOpenRouter([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildATSScorePrompt({ resume, targetJD }) },
  ], { json: true, temperature: 0.3, maxTokens: 1500 });
  return extractJson(content);
}

export default {
  generateSummary,
  generateExperienceBullets,
  generateProjectDescription,
  suggestSkills,
  rewriteText,
  getATSScore,
};