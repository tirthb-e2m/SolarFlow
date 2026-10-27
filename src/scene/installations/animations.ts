import type { InstallationAnimation, InstallationAnimationFactory, InstallationId } from "@/scene/installations/types";

const factories = new Map<InstallationId, InstallationAnimationFactory>();

/** Replace the idle driver for one installation. Call at module scope, before the canvas mounts. */
export function registerInstallationAnimation(id: InstallationId, factory: InstallationAnimationFactory) {
  factories.set(id, factory);
}

export function createInstallationAnimation(id: InstallationId): InstallationAnimation {
  const factory = factories.get(id);
  if (factory) return factory();
  return {
    id,
    update() {},
    dispose() {},
  };
}
