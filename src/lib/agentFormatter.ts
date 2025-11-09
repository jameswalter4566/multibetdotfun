export const formatAutomationAssistantResponse = ({
  prompt,
  assistantPlan,
}: {
  prompt: string;
  assistantPlan?: string;
}) => {
  const normalizedPrompt = prompt.trim();
  const sanitizedPlan = assistantPlan?.trim();

  return [
    "Thought for a moment",
    "",
    "Great! I can assemble this using our current stack (OpenAI + Google Sheets only).",
    "",
    "Proposed system:",
    "- Product: Hub X Automation (single flow)",
    "- Available apps: OpenAI (ChatGPT), Google Sheets",
    "",
    "Your request snapshot:",
    `> ${normalizedPrompt}`,
    "",
    sanitizedPlan ? `Assistant draft:\n${sanitizedPlan}` : null,
    sanitizedPlan ? "" : null,
    "Before I wire the canvas I need a bit more detail:",
    "1. What should trigger OpenAI? (new row, schedule, manual run?)",
    "2. Which sheet/tab + columns should we read or update?",
    "3. What should the model produce (summary, classification, enrichment, etc.)?",
    "",
    "Next step: reply with those specifics and I'll stage the flow.",
  ]
    .filter((segment) => segment !== null)
    .join("\n");
};
