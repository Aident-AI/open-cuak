import { BaseExtensionApiRouteWrapper } from '~src/app/api/BaseExtensionApiRoute';
import { InterpreterExecuteApi } from '~src/app/api/extension/interpreter/execute/InterpreterExecuteApi';

export const maxDuration = 60;

export const POST = BaseExtensionApiRouteWrapper(() => new InterpreterExecuteApi(), { assertUserLoggedIn: true });
