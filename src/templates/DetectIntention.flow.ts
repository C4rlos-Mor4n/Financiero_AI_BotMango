import { createFlowRouting } from "@builderbot-plugins/langchain";
import AiServices from "../services/AiServices";
import { RegistroGasto } from "./RegistroGasto";
import { ResumenGastos } from "./ResumenGastos";
import { EVENTS } from "@builderbot/bot";
import path from "path";
import fs from "fs";
import SheetManager from "~/services/SheetManager";

const pathPrompt = path.join(process.cwd(), "assets/Prompts", "prompt_faq.txt");
const prompt = fs.readFileSync(pathPrompt, "utf8");

const Prompt_DETECTED = path.join(
  process.cwd(),
  "assets/Prompts",
  "prompt_Detection.txt"
);

const promptDetected = fs.readFileSync(Prompt_DETECTED, "utf8");

export const DetectIntention = createFlowRouting
  .setKeyword(EVENTS.ACTION)
  .setIntentions({
    intentions: ["GASTOS", "RESUMEN", "NO_DETECTADO", ""],
    description: promptDetected,
  })
  .setAIModel({ modelName: "gemini" })
  .create({
    afterEnd(flow) {
      return flow.addAction(async (ctx, { state, endFlow, gotoFlow }) => {
        try {
          console.log("Intención detectada: ", await state.get("intention"));

          const currentState = state.getMyState();
          const history: any[] = currentState?.history ?? [];

          if ((await state.get("intention")) === "NO_DETECTADO") {
            const transacciones =
              await SheetManager.consultarUltimasTransacciones(ctx.from, 3);

            history.push({
              role: "user",
              parts: [
                {
                  text: `${prompt}\nNombre del usuario: ${state.get(
                    "name"
                  )}\nTRANSACCIONES="${transacciones}"`,
                },
              ],
            });

            history.push({
              role: "user",
              parts: [
                {
                  text: ctx.body, // Mensaje original del usuario
                },
              ],
            });

            const Chat = await AiServices.startChatSession(history);
            const response = await AiServices.sendMessage(Chat, ctx.body);

            history.push({
              role: "model",
              parts: [
                {
                  text: response,
                },
              ],
            });

            await state.update({
              history,
            });

            return endFlow(response);
          }

          if ((await state.get("intention")) === "GASTOS") {
            return gotoFlow(RegistroGasto);
          }

          if ((await state.get("intention")) === "RESUMEN") {
            return gotoFlow(ResumenGastos);
          }
        } catch (error) {
          console.error("Error en DetectIntention: ", error);
        }
      });
    },
  });
