import { addKeyword, EVENTS } from "@builderbot/bot";
import SheetManager from "../services/SheetManager";
import AiServices from "../services/AiServices";
import path from "path";
import fs from "fs";
import { mongoAdapter } from "~/services/db/MongoAdapter";

const pathPrompt = path.join(
  process.cwd(),
  "assets/Prompts",
  "prompt_Resumen.txt"
);
const prompt = fs.readFileSync(pathPrompt, "utf8");

export const ResumenGastos = addKeyword(EVENTS.ACTION).addAction(
  async (ctx, { state, endFlow, flowDynamic }) => {
    try {
      const response = await AiServices.getGenerativeModel(
        prompt +
          `\n\n### Contexto adicional ###\n` +
          `Mensaje del Usuario: ${ctx.body}\n` +
          `Nombre del usuario: ${state.get("name")}\n` +
          `Fecha Actual en el Sistema: ${new Date().toUTCString()}\n`
      );

      if (response.includes("ERROR")) {
        return endFlow(
          "Lo siento, no pude generar tu resumen. Por favor, intenta deciendo dame un resumen de mis gastos de hoy"
        );
      }
      const rangoHoy = response.match(
        /INTENCIÓN: HOY\s+RANGO: (.+? GMT) - (.+? GMT)/
      );
      const rangoSemana = response.match(
        /INTENCIÓN: SEMANA\s+RANGO: (.+? GMT) - (.+? GMT)/
      );
      const rangoMes = response.match(
        /INTENCIÓN: MES\s+RANGO: (.+? GMT) - (.+? GMT)/
      );

      if (!(await SheetManager.verificarHojaCliente(ctx.from))) {
        return endFlow(
          "Lo siento, no tienes una hoja de gastos asignada. Por favor, registra tus gastos primero"
        );
      }

      const transacciones = await SheetManager.consultarTransaccionesCliente(
        ctx.from
      );

      // Conversión de los rangos a Date
      let fechaInicioHoy: number | Date,
        fechaFinHoy: number | Date,
        fechaInicioSemana: number | Date,
        fechaFinSemana: number | Date,
        fechaInicioMes: number | Date,
        fechaFinMes: number | Date;

      if (rangoHoy) {
        fechaInicioHoy = new Date(rangoHoy[1]);
        fechaFinHoy = new Date(rangoHoy[2]);
        console.log("Rango HOY:", fechaInicioHoy, "-", fechaFinHoy);
      }

      if (rangoSemana) {
        fechaInicioSemana = new Date(rangoSemana[1]);
        fechaFinSemana = new Date(rangoSemana[2]);
        console.log("Rango SEMANA:", fechaInicioSemana, "-", fechaFinSemana);
      }

      if (rangoMes) {
        fechaInicioMes = new Date(rangoMes[1]);
        fechaFinMes = new Date(rangoMes[2]);
        console.log("Rango MES:", fechaInicioMes, "-", fechaFinMes);
      }

      if (rangoHoy) {
        const transaccionesHoy = transacciones.filter((transaccion) => {
          const fechaTransaccion = new Date(transaccion.fecha);
          return (
            fechaTransaccion >= fechaInicioHoy &&
            fechaTransaccion <= fechaFinHoy
          );
        });

        let mensaje = "*### Resumen de Gastos del Día ###*\n\n";

        if (transaccionesHoy.length > 0) {
          transaccionesHoy.forEach((transaccion, index) => {
            mensaje += `*Transacción ${index + 1}:*\n`;
            mensaje += `- Categoría: ${transaccion.categoria}\n`;
            mensaje += `- Descripción: ${transaccion.descripcion}\n`;
            mensaje += `- Monto: $${transaccion.monto}\n`;
            mensaje += `- Fecha: ${new Date(transaccion.fecha).toLocaleString(
              "es-ES",
              { timeZone: "GMT" }
            )}\n`;
            mensaje += `\n`; // Espacio entre transacciones
          });
        } else {
          mensaje += "No se registraron transacciones para el día de hoy.\n";
        }

        await SheetManager.agregarOActualizarUsuario(
          state.get("name"),
          ctx.from,
          state.get("email"),
          0,
          1,
          false
        );

        await mongoAdapter.agregarOActualizarCliente({
          nombre: state.get("name"),
          numero: ctx.from,
          email: state.get("email"),
          gastosAnotados: 0,
          resumenSolicitado: 1,
          premium: state.get("premium"),
        } as any);

        return endFlow(mensaje);
      }

      if (rangoSemana) {
        const transaccionesSemana = transacciones.filter((transaccion) => {
          const fechaTransaccion = new Date(transaccion.fecha);
          return (
            fechaTransaccion >= fechaInicioSemana &&
            fechaTransaccion <= fechaFinSemana
          );
        });

        // Inicializar el mensaje
        let mensajeSemana = "*### Resumen de Gastos de la Semana ###*\n\n";

        // Verificar si hay transacciones para la semana
        if (transaccionesSemana.length > 0) {
          transaccionesSemana.forEach((transaccion, index) => {
            mensajeSemana += `*Transacción ${index + 1}:*\n`;
            mensajeSemana += `- Categoría: ${transaccion.categoria}\n`;
            mensajeSemana += `- Descripción: ${transaccion.descripcion}\n`;
            mensajeSemana += `- Monto: $${transaccion.monto.toFixed(2)}\n`;
            mensajeSemana += `- Fecha: ${new Date(
              transaccion.fecha
            ).toLocaleString("es-ES", { timeZone: "GMT" })}\n`;
            mensajeSemana += `\n`; // Espacio entre transacciones
          });
        } else {
          mensajeSemana += "No se registraron transacciones para la semana.\n";
        }

        await SheetManager.agregarOActualizarUsuario(
          state.get("name"),
          ctx.from,
          state.get("email"),
          0,
          1,
          state.get("premium")
        );

        await mongoAdapter.agregarOActualizarCliente({
          nombre: state.get("name"),
          numero: ctx.from,
          email: state.get("email"),
          gastosAnotados: 0,
          resumenSolicitado: 1,
          premium: state.get("premium"),
        } as any);

        return endFlow(mensajeSemana);
      }

      if (rangoMes) {
        const transaccionesMes = transacciones.filter((transaccion) => {
          const fechaTransaccion = new Date(transaccion.fecha);
          return (
            fechaTransaccion >= fechaInicioMes &&
            fechaTransaccion <= fechaFinMes
          );
        });

        // Inicializar el mensaje
        let mensajeMes = "*### Resumen de Gastos del Mes ###*\n\n";

        // Verificar si hay transacciones para el mes
        if (transaccionesMes.length > 0) {
          transaccionesMes.forEach((transaccion, index) => {
            mensajeMes += `*Transacción ${index + 1}:*\n`;
            mensajeMes += `- Categoría: ${transaccion.categoria}\n`;
            mensajeMes += `- Descripción: ${transaccion.descripcion}\n`;
            mensajeMes += `- Monto: $${transaccion.monto.toFixed(2)}\n`;
            mensajeMes += `- Fecha: ${new Date(
              transaccion.fecha
            ).toLocaleString("es-ES", { timeZone: "GMT" })}\n`;
            mensajeMes += `\n`; // Espacio entre transacciones
          });
        } else {
          mensajeMes += "No se registraron transacciones para el mes.\n";
        }

        await SheetManager.agregarOActualizarUsuario(
          state.get("name"),
          ctx.from,
          state.get("email"),
          0,
          1,
          false
        );

        await mongoAdapter.agregarOActualizarCliente({
          nombre: state.get("name"),
          numero: ctx.from,
          email: state.get("email"),
          gastosAnotados: 0,
          resumenSolicitado: 1,
          premium: state.get("premium"),
        } as any);

        return endFlow(mensajeMes);
      }
    } catch (e) {
      console.error(e);
    }
  }
);
