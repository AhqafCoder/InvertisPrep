import { Router } from 'express';
import aiService from '../services/openRouterService.js';

const router = Router();

// Validation helper
function validateBody(req, res, requiredFields) {
  for (const field of requiredFields) {
    if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
      return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
    }
  }
  return null;
}

// POST /api/ai/resume/summary
router.post('/summary', async (req, res) => {
  const err = validateBody(req, res, ['experience', 'skills']);
  if (err) return;

  try {
    const { experience, skills, targetRole } = req.body;
    const summary = await aiService.generateSummary({ experience, skills, targetRole });
    res.json({ success: true, data: { summary } });
  } catch (error) {
    console.error('[aiResume] Summary generation failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});

// POST /api/ai/resume/experience-bullets
router.post('/experience-bullets', async (req, res) => {
  const err = validateBody(req, res, ['company', 'role']);
  if (err) return;

  try {
    const { company, role, description } = req.body;
    const bullets = await aiService.generateExperienceBullets({ company, role, description });
    res.json({ success: true, data: { bullets } });
  } catch (error) {
    console.error('[aiResume] Experience bullets generation failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate experience bullets' });
  }
});

// POST /api/ai/resume/project-description
router.post('/project-description', async (req, res) => {
  const err = validateBody(req, res, ['name']);
  if (err) return;

  try {
    const { name, techStack, goal } = req.body;
    const description = await aiService.generateProjectDescription({ name, techStack: techStack || [], goal });
    res.json({ success: true, data: { description } });
  } catch (error) {
    console.error('[aiResume] Project description generation failed:', error);
    res.status(500).json({ success: false, message: 'Failed to generate project description' });
  }
});

// POST /api/ai/resume/suggest-skills
router.post('/suggest-skills', async (req, res) => {
  const err = validateBody(req, res, ['targetRole']);
  if (err) return;

  try {
    const { targetRole, currentSkills } = req.body;
    const skillGroups = await aiService.suggestSkills({ targetRole, currentSkills: currentSkills || [] });
    res.json({ success: true, data: { skillGroups } });
  } catch (error) {
    console.error('[aiResume] Skills suggestion failed:', error);
    res.status(500).json({ success: false, message: 'Failed to suggest skills' });
  }
});

// POST /api/ai/resume/rewrite
router.post('/rewrite', async (req, res) => {
  const err = validateBody(req, res, ['text', 'instruction']);
  if (err) return;

  try {
    const { text, instruction } = req.body;
    const rewritten = await aiService.rewriteText(text, instruction);
    res.json({ success: true, data: { rewritten } });
  } catch (error) {
    console.error('[aiResume] Rewrite failed:', error);
    res.status(500).json({ success: false, message: 'Failed to rewrite text' });
  }
});

// POST /api/ai/resume/ats-score
router.post('/ats-score', async (req, res) => {
  const err = validateBody(req, res, ['resume']);
  if (err) return;

  try {
    const { resume, targetJD } = req.body;
    const result = await aiService.getATSScore(resume, targetJD);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[aiResume] ATS score failed:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate ATS score' });
  }
});

export default router;