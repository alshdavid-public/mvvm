import { rx } from "mvvm";

export class MessageService {
  @rx accessor message: string = "";
}
