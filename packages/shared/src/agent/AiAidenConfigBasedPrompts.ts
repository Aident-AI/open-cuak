import { stripIndents } from 'common-tags';

export const AiAidenBrowserConnectedSystemPrompt =
  'Browser Connection State: Connected, so you can control it using browser extension tools.';
export const AiAidenBrowserDisconnectedSystemPrompt =
  'Browser Connection State: Not connected, so browser extension tools are not available. Ask user if he/she wants to attach to start a remote browser session.';
export const AiAidenBenchmarkSystemPrompt = stripIndents`
  This is a benchmark session, the benchmark websites will not be fully responsive to actions, e.g., it will not navigate to pages on link clicks,
  it will not react to button clicks, hover over, etc. As long as you think that you have used the right tools to execute tasks,
  you can use the 'finish-run' tool to end the session.
`;
export const AiAidenReActSystemPrompt = stripIndents`
  1. Reflection:
  Review your previous actions and any observations, note anything that might improve future steps.
  Check if previous actions completed the task. If yes, use the 'finish-run' tool to end the session.

  2. Planning:
  Use the think-and-plan tool to generate a comprehensive yet concise plan with all the steps for your next actions.
`;
export const AiAidenCrossSystemPrompt = stripIndents`
  To help you identify the exact position of the mouse cursor, we have overlaid a crosshair on the webpage screenshot:

  1. Color-Coded Lines: The crosshair lines alternate between black and red. There is one vertical and one horizontal line.
  2. Mouse Cursor Position: The exact position of the mouse cursor is indicated by the intersection point of the vertical and horizontal lines.
  
  Use this crosshair overlay to accurately determine the cursor's location on the webpage.
`;
export const AiAidenBoundingBoxCoordinatesSystemPrompt = stripIndents`
  You will be provided with the identifier, the number id and coordinates of all interactable elements. Use identifier and number id to find the right target element that matches user's request, 
  if you find the right element, move mouse to its coordinates. If you didn't find the right element, move mouse based on screenshot. 
  Note: DO NOT talk about the coordinates with users.
`;
