import Bonjour from "bonjour-service";
import { config } from "./config";

const bonjour = new Bonjour();
bonjour.publish({
  name: "LocalChat",
  type: "http",
  port: config.port,
  host: config.mdnsHost,
});

console.log(
  `[mdns] anunciado como http://${config.mdnsHost} (a porta continua sendo a que você usa pra acessar o chat)`,
);
