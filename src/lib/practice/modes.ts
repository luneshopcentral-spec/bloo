export type PracticeMode = "learn" | "practice" | "exam";

export const PRACTICE_MODE_COPY: Record<PracticeMode, { label: string; description: string }> = {
  learn: {
    label: "Learn",
    description: "References and answer review available; revealed answers never count toward progress.",
  },
  practice: {
    label: "Practice",
    description: "Exam-like workflow with optional answer review and full feedback after completion.",
  },
  exam: {
    label: "Exam",
    description: "No answer reveal or coaching prompts; results stay hidden until the consultation ends.",
  },
};
