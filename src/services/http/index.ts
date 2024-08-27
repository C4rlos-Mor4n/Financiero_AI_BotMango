import downloadFile from "../../utils/downloaderUtils";
import { config } from "../../config";

class ServerHttp {
  private provider: any;
  private bot: any;

  constructor(provider = undefined, bot = undefined) {
    if (!provider || !bot) {
      throw new Error("DEBES_DE_PASAR_BOT");
    }
    this.provider = provider;
    this.bot = bot;

    provider.server.post("/chatwoot", this.chatwootCtrl);
  }

  /**
   * Este el controlador del los enventos del Chatwoot
   * @param {*} req
   * @param {*} res
   */
  chatwootCtrl = async (req: any, res: any) => {
    const body = req.body;

    const attachments = body?.attachments;
    try {
      const mapperAttributes = body?.changed_attributes
        ?.map((a) => Object.keys(a))
        .flat(2);

      /**
       * Esta funcion se encarga de agregar o remover el numero a la blacklist
       * eso quiere decir que podemos hacer que el chatbot responda o no
       * para que nos sirve, para evitar que el chatbot responda mientras
       * un agente humano esta escribiendo desde chatwoot
       */
      if (
        body?.event === "conversation_updated" &&
        mapperAttributes.includes("assignee_id")
      ) {
        const phone = body?.meta?.sender?.phone_number.replace("+", "");
        const idAssigned =
          body?.changed_attributes[0]?.assignee_id?.current_value ?? null;

        if (idAssigned) {
          this.bot.dynamicBlacklist.add(phone);
        } else if (this.bot.dynamicBlacklist.checkIf(phone) && !idAssigned) {
          this.bot.dynamicBlacklist.remove(phone);
        }

        res.statusCode = 200;
        return res.end("ok");
      }

      if (
        body?.content_type === "input_csat" &&
        body?.event === "message_created" &&
        body?.conversation?.channel.includes("Channel::Api") &&
        body?.private === false &&
        body?.content?.includes("Por favor califica esta conversación") &&
        body?.conversation?.status === "resolved"
      ) {
        const phone = body.conversation?.meta?.sender?.phone_number.replace(
          "+",
          ""
        );
        const content = body?.content ?? "";

        const urlsToReplace = [
          { oldUrl: "http://0.0.0.0", newUrl: config.CHATWOOT_ENDPOINT },
          { oldUrl: "http://127.0.0.1", newUrl: config.CHATWOOT_ENDPOINT },
        ];

        let updatedContent = content;

        urlsToReplace.forEach((urlPair) => {
          updatedContent = updatedContent.replace(
            new RegExp(urlPair.oldUrl, "g"),
            urlPair.newUrl
          );
        });

        await this.provider.sendMessage(`${phone}`, updatedContent, {});

        if (this.bot.dynamicBlacklist.checkIf(phone)) {
          this.bot.dynamicBlacklist.remove(phone);
          const response = await fetch(`${config.BOT_URL}/v1/flowGracias`, {
            method: "POST",
            body: JSON.stringify({ number: phone, name: "Cliente" }),
            headers: { "Content-Type": "application/json" },
          });
          res.statusCode = 200;
          return res.end("ok");
        } else {
          const response = await fetch(`${config.BOT_URL}/v1/flowGracias`, {
            method: "POST",
            body: JSON.stringify({ number: phone, name: "Cliente" }),
            headers: { "Content-Type": "application/json" },
          });
        }

        res.statusCode = 200;
        return res.end("ok");
      }

      if (
        body?.event === "conversation_updated" &&
        body?.status === "resolved"
      ) {
        const phone = body?.meta?.sender?.phone_number.replace("+", "");

        if (this.bot.dynamicBlacklist.checkIf(phone)) {
          this.bot.dynamicBlacklist.remove(phone);

          const response = await fetch(`${config.BOT_URL}/v1/flowGracias`, {
            method: "POST",
            body: JSON.stringify({ number: phone, name: "Cliente" }),
            headers: { "Content-Type": "application/json" },
          });

          res.statusCode = 200;
          return res.end("ok");
        } else {
          const response = await fetch(`${config.BOT_URL}/v1/flowGracias`, {
            method: "POST",
            body: JSON.stringify({ number: phone, name: "Cliente" }),
            headers: { "Content-Type": "application/json" },
          });
        }

        res.statusCode = 200;
        return res.end("ok");
      }
      /**
       * La parte que se encarga de determinar si un mensaje es enviado al whatsapp del cliente
       */
      const checkIfMessage =
        body?.private == false &&
        body?.event == "message_created" &&
        body?.message_type === "outgoing" &&
        body?.conversation?.channel.includes("Channel::Api");
      if (checkIfMessage) {
        const phone = body.conversation?.meta?.sender?.phone_number.replace(
          "+",
          ""
        );
        const content = body?.content ?? "";

        const file = attachments?.length ? attachments[0] : null;
        if (file) {
          const { fileName, filePath, fileBuffer, extension } =
            await downloadFile(file.data_url);

          switch (extension) {
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "webp":
              await this.provider.sendImage(`${phone}@c.us`, filePath, content);
              break;
            case "mp4":
            case "avi":
            case "mov":
              await this.provider.sendVideo(`${phone}@c.us`, filePath, content);
              break;
            case "oga":
            case "wav":
            case "mp3":
              await this.provider.sendAudio(`${phone}@c.us`, filePath);
              break;
            case "pdf":
              await this.provider.sendFile(`${phone}@c.us`, filePath, content);
              break;
            default:
              await this.provider.sendFile(`${phone}@c.us`, filePath, content);
          }

          res.statusCode = 200;
          return res.end("ok");
        }

        /**
         * esto envia un mensaje de texto al ws
         */
        await this.provider.sendMessage(`${phone}`, content, {});
        res.statusCode = 200;
        return res.end("ok");
      }

      res.statusCode = 200;
      return res.end("ok");
    } catch (error) {
      console.log(error);
      res.statusCode = 405;
      res.end("Error");
      return;
    }
  };
}

export default ServerHttp;
