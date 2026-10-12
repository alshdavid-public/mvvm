import { Reactive } from "./reactive.ts";
import { getOrInit, ON_CHANGE } from "./symbol.ts";

export function subscribe(
  target: any,
  callback: () => any | Promise<any>,
): () => void {
  const [subject, stash] = getOrInit(target);
  const subscriptions = [subject.subscribe(callback)];

  for (const value of Object.values(stash) || []) {
    if (value instanceof Reactive) {
      subscriptions.push(value.subscribe(callback));
      continue;
    }

    if (typeof value === "object" && ON_CHANGE in value) {
      subscriptions.push(subscribe(value, callback));
    }
  }

  return () => subscriptions.forEach((cb) => cb());
}
