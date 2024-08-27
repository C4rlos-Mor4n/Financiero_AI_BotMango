import { google } from "googleapis";
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
import { config } from "../config";

class SheetManager {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(spreadsheetId: string, privateKey: string, clientEmail: string) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = spreadsheetId;
  }

  async agregarOActualizarUsuario(
    nombre: string,
    numero: string,
    email: string,
    gastosAnotados: number = 0,
    resumenSolicitado: number = 0,
    premium: boolean = false,
    notificaciones: boolean = false // Nuevo campo Notificaciones, por defecto en true
  ) {
    const sheetName = "Users";

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:G`, // Actualizar el rango para incluir la columna de Notificaciones
      });

      const rows = response.data.values || [];
      let filaEncontrada = -1;

      rows.forEach((row, index) => {
        if (row[1] === numero) {
          filaEncontrada = index;
        }
      });

      if (filaEncontrada === -1) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:G`,
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [
                nombre,
                numero,
                email,
                gastosAnotados,
                resumenSolicitado,
                premium,
                notificaciones, // Insertar Notificaciones
              ],
            ],
          },
        });
      } else {
        const fila = filaEncontrada + 1;
        const gastosActuales = parseInt(rows[filaEncontrada][3] || "0", 10);
        const resumenActual = parseInt(rows[filaEncontrada][4] || "0", 10);

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!D${fila}:G${fila}`, // Actualizar rango para incluir Notificaciones
          valueInputOption: "RAW",
          requestBody: {
            values: [
              [
                gastosActuales + gastosAnotados,
                resumenActual + resumenSolicitado,
                premium,
                notificaciones, // Actualizar Notificaciones
              ],
            ],
          },
        });
      }
    } catch (error) {
      console.error("Error al agregar o actualizar usuario:", error);
    }
  }

  //traer todos los usuarios
  async consultarUsuarios() {
    const sheetName = "Users";

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:G`, // Actualizar el rango para incluir la columna de Notificaciones
      });

      const rows = response.data.values || [];
      return rows.map((row) => ({
        nombre: row[0],
        numero: row[1],
        email: row[2],
        gastosAnotados: parseInt(row[3] || "0", 10),
        resumenSolicitado: parseInt(row[4] || "0", 10),
        premium: row[5],
        notificaciones: row[6],
      }));
    } catch (error) {
      console.error("Error al consultar usuarios:", error);
      return [];
    }
  }

  //consultar gasos anotados en base al nombre de la hoja traer todos los gastos del usuario
  async consultarGastosAnotados(numero: string) {
    const sheetName = `${numero}`;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!D1`,
      });

      const rows = response.data.values || [];
      return parseInt(rows[0][0] || "0", 10);
    } catch (error) {
      console.error("Error al consultar gastos anotados del cliente:", error);
      return 0;
    }
  }

  async crearHojaCliente(numero: string) {
    const nuevaHoja = `${numero}`;

    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: nuevaHoja,
                },
              },
            },
          ],
        },
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${nuevaHoja}!A1:E1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["Nombre", "Categoria", "Descripcion", "Monto", "Fecha"]],
        },
      });
    } catch (error) {
      console.error("Error al crear hoja del cliente:", error);
    }
  }

  async verificarHojaCliente(numero: string) {
    const sheetName = `${numero}`;

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      return sheets.some((sheet) => sheet.properties?.title === sheetName);
    } catch (error) {
      console.error("Error al verificar la hoja del cliente:", error);
      return false;
    }
  }

  async consultarUltimasTransacciones(numero: string, limit: number) {
    const sheetName = `${numero}`;
    let TRANSACCIONES = "";

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:E`,
      });

      const rows = response.data.values || [];
      const ultimasTransacciones = rows
        .reverse()
        .slice(0, limit)
        .map((row) => {
          return `• ${row[4]}: ${row[2]} - ${row[3]} ${row[1]}`;
        });

      TRANSACCIONES = ultimasTransacciones.length
        ? `Aquí están tus últimas transacciones, [nombre]:\n${ultimasTransacciones.join(
            "\n"
          )}`
        : "No se encontraron transacciones recientes, [nombre].";

      return TRANSACCIONES;
    } catch (error) {
      console.error("Error al consultar transacciones del cliente:", error);
      TRANSACCIONES =
        "Hubo un problema al obtener tus transacciones, [nombre]. Por favor, intenta de nuevo más tarde.";
      return TRANSACCIONES;
    }
  }

  async consultarTransaccionesCliente(numero: string) {
    const sheetName = `${numero}`;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:E`,
      });

      const rows = response.data.values || [];
      return rows.map((row) => ({
        nombre: row[0],
        categoria: row[1],
        descripcion: row[2],
        monto: row[3],
        fecha: row[4],
      }));
    } catch (error) {
      console.error("Error al consultar transacciones del cliente:", error);
      return [];
    }
  }

  async agregarTransaccionCliente(
    numero: string,
    nombre: string,
    categoria: string,
    descripcion: string,
    monto: number,
    fecha: string
  ) {
    const sheetName = `${numero}`;

    try {
      const hojaExiste = await this.verificarHojaCliente(numero);

      if (!hojaExiste) {
        await this.crearHojaCliente(numero);
      }

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[nombre, categoria, descripcion, monto, fecha]],
        },
      });
    } catch (error) {
      console.error("Error al agregar transacción del cliente:", error);
    }
  }

  async consultarDatosCliente(numero: string) {
    const sheetName = "Users";

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:F`,
      });

      const rows = response.data.values || [];
      for (const row of rows) {
        if (row[1] === numero) {
          return {
            nombre: row[0],
            numero: row[1],
            email: row[2],
            gastosAnotados: parseInt(row[3] || "0", 10),
            resumenSolicitado: parseInt(row[4] || "0", 10),
            premium: row[5] === "true",
            notificaciones: row[6] === "true", // Consultar Notificaciones
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error al consultar datos del cliente:", error);
      return null;
    }
  }
}

export default new SheetManager(
  config.spreadsheetId,
  config.privateKey,
  config.clientEmail
);
