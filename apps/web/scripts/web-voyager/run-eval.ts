import { execScript } from '~scripts/base';
import { AutoEval } from '~shared/web-voyager/AutoEval';

execScript(async (): Promise<void> => {
  await AutoEval.startEvalWithDir('example-run');
});
