import { addKeyword, EVENTS } from "@builderbot/bot";
import AiServices from "../services/AiServices";
import path from "path";
import fs from "fs";
import SheetManager from "../services/SheetManager";
import { mongoAdapter } from "~/services/db/MongoAdapter";

const pathPrompt = path.join(
  process.cwd(),
  "assets/Prompts",
  "prompt_Registro.txt"
);
const prompt = fs.readFileSync(pathPrompt, "utf8");

export const RegistroGasto = addKeyword(EVENTS.ACTION).addAction(
  async (ctx, { state, endFlow }) => {
    const response = await AiServices.getGenerativeModel(
      prompt +
        `Mensaje del Usuario:  ${ctx.body}, Nombre del usuario: ${state.get(
          "name"
        )}`
    );

    if (response.includes("ERROR")) {
      return endFlow(
        "Lo siento, no pude registrar tu gasto. Por favor, intenta de nuevo."
      );
    }

    const categorias = response.match(/CATEGORIA: (.*?)\n/g);
    const precios = response.match(/PRECIO: (.*?)\n/g);
    const descripcion = response.match(/DESCRIPCION: (.*?)\n/g);

    const gastos = categorias.map(
      (categoria: string, index: string | number) => {
        return {
          categoria: categoria.replace("CATEGORIA: ", "").replace("\n", ""),
          precio: precios[index].replace("PRECIO: ", "").replace("\n", ""),
          descripcion: descripcion[index]
            .replace("DESCRIPCION: ", "")
            .replace("\n", ""),
        };
      }
    );

    if (!(await SheetManager.verificarHojaCliente(ctx.from))) {
      await SheetManager.crearHojaCliente(ctx.from);
    }

    await SheetManager.agregarOActualizarUsuario(
      state.get("name"),
      ctx.from,
      state.get("email"),
      1,
      0,
      state.get("premium")
    );

    await mongoAdapter.agregarOActualizarCliente({
      nombre: state.get("name"),
      numero: ctx.from,
      email: state.get("email"),
      gastosAnotados: 1,
      resumenSolicitado: 0,
      premium: state.get("premium"),
    } as any);

    for (const gasto of gastos) {
      await SheetManager.agregarTransaccionCliente(
        ctx.from,
        state.get("name"),
        gasto.categoria,
        gasto.descripcion,
        gasto.precio,
        new Date().toISOString()
      );

      await mongoAdapter.agregarGasto(ctx.from, {
        nombre: state.get("name"),
        categoria: gasto.categoria,
        descripcion: gasto.descripcion,
        monto: gasto.precio,
        fecha: new Date().toISOString(),
      } as any);
    }

    const responseFinal = await AiServices.getGenerativeModel(
      "Eres un asistente virtual, que solo se encarga de dar las gracias por la información proporcionada, y que ya se ha registrado el gasto."
    );

    return endFlow(responseFinal);
  }
);
