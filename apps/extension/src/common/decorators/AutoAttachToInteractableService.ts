import { InteractableService } from '~src/common/interactable/InteractableService';

export function AutoAttachToInteractableService(_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = async function (...args: unknown[]) {
    if (!InteractableService.isAttached()) await InteractableService.attach();
    return await method.apply(this, args);
  };
}
