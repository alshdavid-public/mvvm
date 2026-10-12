import { h, render } from "preact";
import { Provider } from "mvvm/preact";
import { App } from "../basic";
import { MessageService } from "./service";

const provider = new Provider();

const messageService = new MessageService();
provider.set(MessageService, messageService);

render(
  <Provider.Provider value={provider}>
    <App />
  </Provider.Provider>,
  document.body,
);
