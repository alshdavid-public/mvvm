import { type Observable } from "rxjs";
import { useEffect, useState } from "react";

export function useAsync<T>(x: Observable<T>, defaultValue: T): T {
  const [v, setV] = useState<T>(defaultValue);

  useEffect(() => {
    const s = x.subscribe(setV);
    return () => s.unsubscribe();
  }, [x]);

  return v;
}
