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
  1. Planning:
  Use the think-and-plan tool to generate a comprehensive yet concise plan for next actions. 
  Explicitly list all next actions in this format:
  1. [Action 1 description]
  2. [Action 2 description]
  ...

  2. Reflection:
  Review your previous action, use screenshot to decide whether the previous action is successful. If needed, adjust your plan based on the result.
  If all actions are successful, use the 'finish-run' tool to end the session.
`;
export const AiAidenCrossSystemPrompt = stripIndents`
  To help you identify the exact position of the mouse cursor, we have overlaid a crosshair on the webpage screenshot:

  1. Color-Coded Lines: The crosshair lines alternate between black and red. There is one vertical and one horizontal line.
  2. Mouse Cursor Position: The exact position of the mouse cursor is indicated by the intersection point of the vertical and horizontal lines.
  
  Use this crosshair overlay to accurately determine the cursor's location on the webpage.
`;
export const AiAidenBoundingBoxCoordinatesSystemPrompt = stripIndents`
  You will be provided with the identifier, the number id and coordinates of all interactable elements. Use identifier and number id to find the right target element that matches user's request, 
  1. If you find the right element, use the mouse-move tool to move to its coordinates. 
  2. If you can't find the right element, use the portal-mouse-move tool to move mouse based on screenshot. 
  Note: DO NOT talk about the coordinates with users.
`;
