import { h, render } from "preact";
import { useAsync, useViewModel } from "mvvm/preact";
import { map, Observable } from "rxjs";
import { interval } from "rxjs/internal/observable/interval";

export class AppViewModel {
  counter: Observable<number>;
  counterpp: Observable<number>;

  constructor() {
    this.counter = interval(1000);
    this.counterpp = this.counter.pipe(map((i) => i + 1));
  }
}

export function App({}) {
  const vm = useViewModel(AppViewModel, []);

  return (
    <div>
      <p>Counter: {useAsync(vm.counter, -1)}</p>
      <p>Counter pp: {useAsync(vm.counterpp, 0)}</p>
    </div>
  );
}

render(<App />, document.body);
