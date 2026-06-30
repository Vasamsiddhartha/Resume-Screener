// Score-tier guidance shown with an evaluation result (mirrors the localATS
// engine's next-steps text). Derived purely from the overall ATS score.

export interface ScoreGuidance {
  heading: string
  description: string
  items: string[]
}

export function getScoreGuidance(score: number): ScoreGuidance {
  if (score >= 90) return {
    heading: 'Next Steps',
    description: 'This resume is exceptionally well-aligned with the job description — strong experience and an excellent skills match.',
    items: ['Prepare specific examples of accomplishments', 'Research the company culture and values', 'Practice interview scenarios for this role'],
  }
  if (score >= 80) return {
    heading: 'Quick Improvements',
    description: 'A great match — the resume shows strong alignment with the role’s core requirements.',
    items: ['Match key skills and requirements mentioned in the job posting', 'Fine-tune experience descriptions', 'Quantify achievements where possible'],
  }
  if (score >= 70) return {
    heading: 'Focus Areas',
    description: 'A solid foundation — on the right track but could be more specifically tailored to this position.',
    items: ['Emphasize relevant skills mentioned in the job posting', 'Add more specific examples from experience', 'Use industry-specific keywords and terminology'],
  }
  if (score >= 50) return {
    heading: 'Action Required',
    description: 'Some alignment with the job, but needs significant improvement to stand out.',
    items: ['Highlight skills and experiences directly mentioned in the job description', 'Restructure the resume to emphasize relevant qualifications', 'Consider adding missing key competencies'],
  }
  return {
    heading: 'Focus Areas',
    description: 'This resume requires significant customization for this position. Focus on aligning the content with the job requirements.',
    items: ['Review the job description and identify key requirements', 'Rewrite the resume to emphasize relevant skills and experience', 'Use keywords and terminology from the job posting', 'Consider gaining additional qualifications if needed'],
  }
}
