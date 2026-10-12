import { createContext } from "preact";
import { useContext } from "preact/hooks";
export const InjectContext = createContext(
// @ts-expect-error
null);
export class Provider extends Map {
    static Provider = InjectContext.Provider;
    provide(token, value) {
        this.set(token, value);
    }
}
export function useInjectContext() {
    return useContext(InjectContext);
}
export function useInject(key) {
    const target = useContext(InjectContext).get(key);
    if (!target) {
        try {
            throw new Error(`[PROVIDER] Nothing provided for ${key}`);
        }
        catch (error) {
            throw new Error(`[PROVIDER] Nothing provided for |failed to parse|`);
        }
    }
    return target;
}
