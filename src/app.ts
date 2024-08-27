import { ChatwootClass } from "./services/chatwoot/chatwoot.class";
import { MemoryDB as Database } from "@builderbot/bot";
import { handlerMessage } from "./services/chatwoot";
import downloadFile from "./utils/downloaderUtils";
import { createBot } from "@builderbot/bot";
import ServerHttp from "./services/http";
import { provider } from "./provider";
import templates from "./templates";
import { config } from "./config";
import Queue from "queue-promise";
import fs from "fs";

const chatwoot = new ChatwootClass({
  account: config.CHATWOOT_ACCOUNT_ID,
  token: config.CHATWOOT_TOKEN,
  endpoint: config.CHATWOOT_ENDPOINT,
});

const queue = new Queue({
  concurrent: 1,
  interval: 500,
});

const main = async () => {
  const bot = await createBot(
    {
      flow: templates,
      provider,
      database: new Database(),
    },
    {
      queue: {
        timeout: 20000, //👌
        concurrencyLimit: 50, //👌
      },
    }
  );
  const { handleCtx, httpServer } = await bot;

  new ServerHttp(provider, bot);

  provider.server.get(
    "/v1/health",
    (
      req: any,
      res: {
        writeHead: (arg0: number, arg1: { "Content-Type": string }) => void;
        end: (arg0: string) => void;
      }
    ) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    }
  );

  provider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") {
        bot.blacklist.remove(number);
        await bot.dispatch("GRACIA_FLOW", { from: number, name: "Cliente" });
        return res.end("trigger");
      }
      if (intent === "add") {
        bot.blacklist.add(number);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );

  provider.on("message", (payload) => {
    queue.enqueue(async () => {
      try {
        const attachment = [];

        if (payload?.body.includes("_event_") && payload?.url) {
          const { filePath } = await downloadFile(payload.url, config.jwtToken);
          attachment.push(filePath);
          setTimeout(async () => {
            fs.unlinkSync(filePath);
          }, 1000 * 60 * 5);
        }

        await handlerMessage(
          {
            phone: payload.from,
            name: payload.pushName,
            message: payload?.body.includes("_event_")
              ? "Archivo adjunto"
              : payload.body,
            attachment,
            mode: "incoming",
          },
          chatwoot
        );
      } catch (err) {
        console.log("ERROR", err);
      }
    });
  });

  bot.on("send_message", (payload) => {
    queue.enqueue(async () => {
      const attachment = [];

      if (payload.options?.media) {
        if (
          payload.options.media.includes("http") ||
          payload.options.media.includes("https")
        ) {
          const { filePath } = await downloadFile(payload.options.media);
          attachment.push(filePath);
          setTimeout(async () => {
            fs.unlinkSync(filePath);
          }, 1000 * 60 * 5);
        }

        attachment.push(payload.options.media);
        setTimeout(async () => {
          fs.unlinkSync(payload.options.media);
        }, 1000 * 60 * 5);
      }

      await handlerMessage(
        {
          phone: payload.from,
          name: payload.from,
          message: payload.answer,
          mode: "outgoing",
          attachment: attachment,
        },
        chatwoot
      );
    });
  });

  httpServer(+config.PORT);
};

main();
