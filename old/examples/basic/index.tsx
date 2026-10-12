import { h, render } from "preact";
import { rx } from "mvvm";
import { useViewModel } from "mvvm/preact";

export class AppViewModel {
  // The component will automatically
  // render when this property is mutated
  @rx accessor message = "";
}

export function App({}) {
  const vm = useViewModel(AppViewModel, []);

  return (
    <div>
      <p>Message: {vm.message}</p>
      <input
        onInput={(e: any) => (vm.message = e.target.value)}
        value={vm.message}
      />
    </div>
  );
}

render(<App />, document.body);
