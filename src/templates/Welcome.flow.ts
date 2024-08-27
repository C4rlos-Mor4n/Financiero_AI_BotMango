import { EVENTS, addKeyword } from "@builderbot/bot";
import SheetManager from "../services/SheetManager";
import { Notificacionesflow, Registroflow } from "./Registro.flow";
import { DetectIntention } from "./DetectIntention.flow";
import { mongoAdapter } from "../services/db/MongoAdapter";

export const Welcomeflow = addKeyword([
  EVENTS.WELCOME,
  EVENTS.VOICE_NOTE,
  EVENTS.MEDIA,
]).addAction(async (ctx, { state, gotoFlow }) => {
  try {
    const Cliente = await SheetManager.consultarDatosCliente(ctx.from);
    if (!Cliente) {
      return gotoFlow(Registroflow);
    } else {
      const BdCliente = await mongoAdapter.buscarClientePorNumero(ctx.from);
      await state.update({
        name: Cliente.nombre,
        from: ctx.from,
        email: Cliente.email,
        gastosAnotados: Cliente.gastosAnotados,
        resumenSolicitado: Cliente.resumenSolicitado,
        premium: Cliente.premium,
        notificaciones: Cliente.notificaciones,
      });

      if (!BdCliente) {
        return gotoFlow(Notificacionesflow);
      }
      return gotoFlow(DetectIntention);
    }
  } catch (error) {
    console.error(error);
  }
});
