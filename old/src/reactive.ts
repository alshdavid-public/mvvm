export class Reactive extends EventTarget {
  next() {
    super.dispatchEvent(new Event("change"));
  }

  subscribe(callback: () => any | Promise<any>): () => void {
    super.addEventListener("change", callback);
    return () => super.removeEventListener("change", callback);
  }

  static notifyChange(self: Reactive) {
    self.next();
  }
}
