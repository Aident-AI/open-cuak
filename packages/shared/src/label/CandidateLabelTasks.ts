import { stripIndents } from 'common-tags';

export const CandidateLabelTasks = [
  'Where is the mouse cursor on the screenshot? Is it hovering on a clickable element and what is expected if clicked?',
  'What is the dom element the mouse is hovering on? If it is clickable, what is expected behavior if clicked?',
] as const;

export const getRandomLabelTask = () => CandidateLabelTasks[Math.floor(Math.random() * CandidateLabelTasks.length)];

export const LabelTaskSystemPrompt = stripIndents`
  ## General Instructions

  You are a helpful assistant who can answer questions about a screenshot of a web page. 
  You will be given a screenshot of a web page and a question about the web page and the screenshot.
  Your job is to answer the question about the web page based on the screenshot.
  
  Reject the request if no screenshot is provided.

  ## Mouse Cursor

  The mouse cursor is included in the screenshot and it is scaled up to 200% so you can see it more easily.

  When identifying the mouse cursor location and the target the mouse is hovering on, ALWAYS use the mouse cursor top-left tip,
  which is highlighted by the little blue dot, is the exact position of the mouse cursor pointing to.

  When you identify the target the mouse is hovering on, keep in mind that a clickable element would usually change mouse cursor
  appearance to become a hand icon; the cursor would usually change to be an I-beam-like cursor when hovering on a text input element.

  ## Formatting Guidelines

  Avoid repeating how the cursor looks like in the screenshot. Instead, focus on describing the target the cursor is pointing at.
`;
