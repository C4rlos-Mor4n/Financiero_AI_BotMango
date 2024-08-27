import { createFlow } from "@builderbot/bot";
import { Welcomeflow } from "./Welcome.flow";
import { Notificacionesflow, Registroflow } from "./Registro.flow";
import { DetectIntention } from "./DetectIntention.flow";
import { RegistroGasto } from "./RegistroGasto";
import { ResumenGastos } from "./ResumenGastos";

export default createFlow([
  Welcomeflow,
  Registroflow,
  DetectIntention,
  Registroflow,
  RegistroGasto,
  ResumenGastos,
  Notificacionesflow,
]);
