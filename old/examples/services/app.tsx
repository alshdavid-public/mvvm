import { h } from "preact";
import { useInject, useViewModel } from "mvvm/preact";
import { MessageService } from "./service";

export class AppViewModel {
  // The component will automatically
  // render when this property is mutated
  messageService: MessageService;

  constructor(messageService: MessageService) {
    this.messageService = messageService;
  }
}

export function App({}) {
  const messageService = useInject(MessageService);
  const vm = useViewModel(AppViewModel, [messageService]);

  return (
    <div>
      <p>Message: {vm.messageService.message}</p>
      <input
        onInput={(e: any) => (vm.messageService.message = e.target.value)}
        value={vm.messageService.message}
      />
    </div>
  );
}
