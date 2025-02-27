import { CoreSystemMessage, CoreUserMessage, ImagePart, generateText } from 'ai';
import * as fs from 'fs';
import path from 'path';
import { GPTVariant, LlmRouterModel } from '~shared/llm/LlmRouterModel';
import { ModelRouter } from '~shared/llm/ModelRouter';

const SYSTEM_PROMPT = `As an evaluator, you will be presented with three primary components to assist you in your role:

1. Web Task Instruction: This is a clear and specific directive provided in natural language, detailing the online activity to be carried out. These requirements may include conducting searches, verifying information, comparing prices, checking availability, or any other action relevant to the specified web service (such as Amazon, Apple, ArXiv, BBC News, Booking etc).

2. Result Screenshots: This is a visual representation of the screen showing the result or intermediate state of performing a web task. It serves as visual proof of the actions taken in response to the instruction.

3. Result Response: This is a textual response obtained after the execution of the web task. It serves as textual result in response to the instruction.

-- You DO NOT NEED to interact with web pages or perform actions such as booking flights or conducting searches on websites.
-- You SHOULD NOT make assumptions based on information not presented in the screenshot when comparing it to the instructions.
-- Your primary responsibility is to conduct a thorough assessment of the web task instruction against the outcome depicted in the screenshot and in the response, evaluating whether the actions taken align with the given instructions.
-- NOTE that the instruction may involve more than one task, for example, locating the garage and summarizing the review. Failing to complete either task, such as not providing a summary, should be considered unsuccessful.
-- NOTE that the screenshot is authentic, but the response provided by LLM is generated at the end of web browsing, and there may be discrepancies between the text and the screenshots.
-- Note the difference: 1) Result response may contradict the screenshot, then the content of the screenshot prevails, 2) The content in the Result response is not mentioned on the screenshot, choose to believe the content.

You should elaborate on how you arrived at your final evaluation and then provide a definitive verdict on whether the task has been successfully accomplished, either as 'SUCCESS' or 'NOT SUCCESS'.`;

const USER_PROMPT = `TASK: <task>
Result Response: <answer>
<num> screenshots at the end: `;

interface InteractMessage {
  content: string | { text: string }[];
}

function encodeImage(imagePath: string): string {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

export class AutoEval {
  public static async startEvalWithDir(dirName: string) {
    const webs = [
      'Allrecipes',
      'Amazon',
      'Apple',
      'ArXiv',
      'BBC News',
      'Booking',
      'Cambridge Dictionary',
      'Coursera',
      'ESPN',
      'GitHub',
      'Google Flights',
      'Google Map',
      'Google Search',
      'Huggingface',
      'Wolfram Alpha',
    ];
    const processDir = path.join(__dirname, dirName);
    const taskRes: boolean[] = [];
    for (const web of webs) {
      const webTaskRes: boolean[] = [];
      for (let idx = 0; idx < 46; idx++) {
        const fileDir = path.join(processDir, `task${web}--${idx}`);
        if (fs.existsSync(fileDir)) {
          const response = await this.autoEvalByGpt(fileDir);
          webTaskRes.push(response);
        }
      }
      if (webTaskRes.length > 0) {
        const successCount = webTaskRes.filter((res) => res).length;
        const successRate = successCount / webTaskRes.length;
        console.log(`${web} success rate:`, successRate, `(${successCount}/${webTaskRes.length})`);
        taskRes.push(...webTaskRes);
      }
    }
    const successCount = taskRes.filter((res) => res).length;
    const successRate = successCount / taskRes.length;
    console.log('Total success rate:', successRate, `(${successCount}/${taskRes.length})`);
  }

  private static async autoEvalByGpt(processDir: string): Promise<boolean> {
    const imgNum = 3;

    console.log(`--------------------- ${processDir} ---------------------`);
    const resFiles = fs.readdirSync(processDir).sort();

    const itMessages: InteractMessage[] = JSON.parse(
      fs.readFileSync(path.join(processDir, 'interact_messages.json'), 'utf-8'),
    );

    if (itMessages.length === 1) {
      console.log('Not find answer for ' + processDir + ' only system messages');
      return false;
    }

    let taskInfo = itMessages[1].content;
    if (Array.isArray(taskInfo)) {
      taskInfo = taskInfo[0].text;
    }
    if (!taskInfo.includes('Now given a task')) {
      throw new Error('Task info format incorrect');
    }

    const pattern = /Now given a task:(.+?)Please interact with/;
    const matches = taskInfo.match(pattern);
    if (!matches) throw new Error('Could not extract task content');
    const taskContent = matches[1].trim();

    const ansInfo = itMessages[itMessages.length - 1].content;
    if (typeof ansInfo !== 'string' || !ansInfo.includes('Action: ANSWER')) {
      console.log('Not find answer for ' + processDir);
      return false;
    }

    const patternAns = /ANSWER[; ]+\[?(.[^\]]*)\]?/;
    const matchesAns = ansInfo.match(patternAns);
    if (!matchesAns) throw new Error('Could not extract answer content');
    const answerContent = matchesAns[1].trim();

    const patternPng = /screenshot(\d+)\.png/;
    const matches_files = resFiles
      .filter((f) => patternPng.test(f))
      .map((f) => {
        const match = f.match(patternPng);
        return [f, parseInt(match![1])] as [string, number];
      })
      .sort((a, b) => a[1] - b[1]);

    const endFiles = matches_files.slice(-imgNum);

    const images = { role: 'user', content: [] as ImagePart[] };
    for (const [pngFile] of endFiles) {
      const b64Img = encodeImage(path.join(processDir, pngFile));
      images.content.push({
        type: 'image',
        image: `data:image/png;base64,${b64Img}`,
      } as ImagePart);
    }

    const { verdict } = await this.genEvalCore(taskContent, answerContent, images as CoreUserMessage);
    return verdict;
  }

  public static async genEvalCore(
    taskContent: string,
    answerContent: string,
    images: CoreUserMessage,
  ): Promise<{ verdict: boolean; elaboration: string }> {
    let userPromptTmp = USER_PROMPT.replace('<task>', taskContent);
    userPromptTmp = userPromptTmp.replace('<answer>', answerContent);
    userPromptTmp = userPromptTmp.replace('<num>', images.content.length.toString());

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT } as CoreSystemMessage,
      { role: 'user', content: [{ type: 'text', text: userPromptTmp }] } as CoreUserMessage,
      images as CoreUserMessage,
      { role: 'user', content: [{ type: 'text', text: 'Your verdict:\n' }] } as CoreUserMessage,
    ];

    const model = await ModelRouter.genModel({ model: LlmRouterModel.AZURE_OAI, variant: GPTVariant.GPT_4O });
    while (true) {
      try {
        console.log('Calling gpt4o API to get the auto evaluation......');
        const response = await generateText({
          model,
          messages,
        });

        const gpt4oRes = response.text;
        console.log(gpt4oRes);

        let autoEvalRes;
        if (gpt4oRes?.includes('SUCCESS')) {
          autoEvalRes = true;
        }
        if (!gpt4oRes?.includes('SUCCESS') && !gpt4oRes?.includes('NOT SUCCESS')) {
          autoEvalRes = false;
        }
        if (!autoEvalRes) throw new Error('GPT4O response is empty');

        console.log('Auto_eval_res:', autoEvalRes);
        return { verdict: autoEvalRes, elaboration: gpt4oRes };
      } catch (e: any) {
        console.log(e);
        if (e.name === 'RateLimitError') {
          await new Promise((resolve) => setTimeout(resolve, 10000));
        } else if (e.name === 'APIError') {
          await new Promise((resolve) => setTimeout(resolve, 15000));
        } else if (e.name === 'InvalidRequestError') {
          throw e;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      }
    }
  }
}
