export class Reactive extends EventTarget {
    next() {
        super.dispatchEvent(new Event("change"));
    }
    subscribe(callback) {
        super.addEventListener("change", callback);
        return () => super.removeEventListener("change", callback);
    }
    static notifyChange(self) {
        self.next();
    }
}
