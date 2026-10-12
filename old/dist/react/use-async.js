import { useEffect, useState } from "react";
export function useAsync(x, defaultValue) {
    const [v, setV] = useState(defaultValue);
    useEffect(() => {
        const s = x.subscribe(setV);
        return () => s.unsubscribe();
    }, [x]);
    return v;
}
