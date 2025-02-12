import type { IActionConfigExecContext } from '~shared/messaging/action-configs/Base.ActionConfig';

export function ActionConfigAutoAttachesToInteractable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _target: any,
  _propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  descriptor.value = async function (...args: any[]) {
    const context: IActionConfigExecContext = args[1];
    if (!context.getInteractableService().isAttached()) await context.getInteractableService().attach();

    if (!context.getInteractableService().isInteractableReady())
      await context.getInteractableService().waitUntilInteractableReady();

    return await originalMethod.apply(this, args);
  };
}
