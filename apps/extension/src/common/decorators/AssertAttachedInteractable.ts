import { InteractableService } from '~src/common/interactable/InteractableService';

export const AssertAttachedInteractable = (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => {
  const method = descriptor.value;
  descriptor.value = function (...args: unknown[]) {
    if (!InteractableService.isAttached()) throw new Error('InteractableService is not attached');
    return method.apply(this, args);
  };
  return descriptor;
};
