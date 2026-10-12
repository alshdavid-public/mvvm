import { getOrInit } from "./symbol.ts";

/**
 * @description This decorator dispatches a notification when a property is replaced
 */
export function rx<T, V>(
  _target: ClassAccessorDecoratorTarget<T, V>,
  context: ClassAccessorDecoratorContext<T, V>,
) {
  const propertyKey = context.name as string;

  return {
    get(this: T): V {
      return getOrInit(this)[1][propertyKey];
    },
    set(this: T, value: V) {
      const [subject, stash] = getOrInit(this);
      if (stash[propertyKey] === value) {
        return;
      }

      stash[propertyKey] = value;
      subject.next();
    },
    init(this: T, initialValue: V): V {
      const [, stash] = getOrInit(this);
      stash[propertyKey] = initialValue;
      return initialValue;
    },
  };
}
