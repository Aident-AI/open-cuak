import { PromisePool } from '@supercharge/promise-pool';
import { CoreUserMessage } from 'ai';
import { exec } from 'child_process';
import * as fs from 'fs';
import { round } from 'lodash';
import path from 'path';
import readline from 'readline';
import { v4 as UUID } from 'uuid';
import { execScript } from '~scripts/base';
import { getHost } from '~shared/env/environment';
import { X_REMOTE_BROWSER_SESSION_ID_HEADER, X_SERVICE_ROLE_TOKEN_HEADER } from '~shared/http/headers';
import { ALogger } from '~shared/logging/ALogger';
import { AutoEval } from '~shared/web-voyager/AutoEval';
import { WebVoyagerTask } from '~shared/web-voyager/WebVoyagerTaskType';

const MAX_STEP = 30;
const MAX_CONCURRENT_TASKS = 1;

const loadTasks = async (filePath: string): Promise<WebVoyagerTask[]> => {
  const jsonlPath = path.join(__dirname, filePath);
  const tasks: WebVoyagerTask[] = [];
  const fileStream = fs.createReadStream(jsonlPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        const task = JSON.parse(line);
        tasks.push(task);
      } catch (e) {
        console.error('Error parsing line:', line);
        console.error(e);
      }
    }
  }
  return tasks;
};

type TaskResult = { answer: string; images: CoreUserMessage; verdict: boolean; elaboration: string };

const runTask = async (task: WebVoyagerTask, remoteBrowserSessionId: string): Promise<TaskResult> => {
  ALogger.info('=====================');
  ALogger.info({ context: 'Running task', task });
  ALogger.info('=====================');

  // Opening portal page
  const portalPageUrl = getHost() + '/portal?remoteBrowserSessionId=' + remoteBrowserSessionId;
  ALogger.info({ context: '>>> Portal Page is ', portalPageUrl });
  exec(`open ${portalPageUrl}`, (error) => {
    if (error) ALogger.error('Failed to open URL:', error);
  });

  // Setting up remote browser session
  ALogger.info({ context: `Setting up remote browser session for task: ${task.id}` });
  const runTaskRsp = await fetch(getHost() + '/api/web-voyager/run-task', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [X_REMOTE_BROWSER_SESSION_ID_HEADER]: remoteBrowserSessionId,
      [X_SERVICE_ROLE_TOKEN_HEADER]: process.env.SERVICE_ROLE_TOKEN ?? '',
    },
    body: JSON.stringify({ task, maxSteps: MAX_STEP }),
  });
  if (!runTaskRsp.ok) throw new Error('Failed to prepare task');
  const runTaskJson = await runTaskRsp.json();
  if (!runTaskJson.success) ALogger.info({ context: 'Failed to complete task', runTaskJson });
  else ALogger.info({ context: 'Completed task', runTaskJson });

  // Evaluate the task answer
  const { runState } = runTaskJson;
  const answer = runState?.answer; // TODO: get task answer properly
  const images = runState?.images; // TODO: get task images properly
  const { verdict, elaboration } = await AutoEval.genEvalCore(task.ques, answer, images);
  return { answer, images, verdict, elaboration };
};

execScript(async () => {
  const dataFilePath = '../../../../packages/shared/src/web-voyager/SampleTasks.jsonl';
  const tasks = await loadTasks(dataFilePath);

  const taskResults: TaskResult[] = [];
  await PromisePool.for([tasks[0]])
    .withConcurrency(MAX_CONCURRENT_TASKS)
    .process(async (task: WebVoyagerTask) => {
      const remoteBrowserSessionId = UUID();
      try {
        const taskResult = await runTask(task, remoteBrowserSessionId);
        ALogger.info({ context: 'Task evaluation verdict', task, taskResult });
        taskResults.push(taskResult);
      } catch (error) {
        ALogger.error({ context: 'Error in running task', error });
      }
    })
    .catch(async (error: Error) => ALogger.error({ context: 'Error in processing tasks', error }));

  const successCount = taskResults.filter((r) => r.verdict).length;
  const successRate = round(1.0 * (successCount / tasks.length), 3);
  ALogger.info({ context: 'All task results', successRate, taskCount: tasks.length });
});
