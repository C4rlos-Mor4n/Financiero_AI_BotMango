import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || 3008,
  jwtToken: process.env.jwtToken,
  numberId: process.env.numberId,
  verifyToken: process.env.verifyToken,
  version: "v19.0",
  spreadsheetId: process.env.spreadsheetId,
  privateKey: process.env.privateKey,
  clientEmail: process.env.clientEmail,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  CHATWOOT_ENDPOINT: process.env.CHATWOOT_ENDPOINT,
  INBOX_NAME: process.env.INBOX_NAME,
  CHATWOOT_ACCOUNT_ID: process.env.CHATWOOT_ACCOUNT_ID,
  CHATWOOT_TOKEN: process.env.CHATWOOT_TOKEN,
  BOT_URL: process.env.BOT_URL,
  MongoDB_URI: process.env.MongoDB_URI,
};
