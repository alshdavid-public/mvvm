import { createContext } from "preact";
import { useContext } from "preact/hooks";

export const InjectContext = createContext<Provider>(
  // @ts-expect-error
  null,
);

export class Provider extends Map<any, any> {
  static Provider = InjectContext.Provider;

  provide(token: any, value: any) {
    this.set(token, value);
  }
}

export function useInjectContext(): Provider {
  return useContext(InjectContext);
}

export function useInject<C extends new (...args: any[]) => any>(
  key: C,
): InstanceType<C>;
export function useInject<T>(key: any): T;
export function useInject<T extends unknown>(key: any): T {
  const target = useContext(InjectContext).get(key);
  if (!target) {
    try {
      throw new Error(`[PROVIDER] Nothing provided for ${key}`);
    } catch (error) {
      throw new Error(`[PROVIDER] Nothing provided for |failed to parse|`);
    }
  }

  return target;
}
