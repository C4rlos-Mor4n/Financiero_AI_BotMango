import mongoose, { Schema, Document, Model } from "mongoose";
import { config } from "../../config";

// Definición de la interfaz para el Cliente
interface ICliente extends Document {
  nombre: string;
  numero: string;
  email: string;
  gastosAnotados: number;
  resumenSolicitado: number;
  premium: boolean;
  notificaciones: boolean;
}

// Definición de la interfaz para los Gastos
interface IGasto extends Document {
  cliente: mongoose.Types.ObjectId; // Referencia al Cliente
  nombre: string;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: Date;
}

// Esquema para el cliente
const ClienteSchema: Schema = new Schema({
  nombre: { type: String, required: true },
  numero: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  gastosAnotados: { type: Number, default: 0 },
  resumenSolicitado: { type: Number, default: 0 },
  premium: { type: Boolean, default: false },
  notificaciones: { type: Boolean, default: true },
});

// Esquema para los gastos
const GastoSchema: Schema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: "Cliente", required: true }, // Relación con Cliente
  nombre: { type: String, required: true },
  categoria: { type: String, required: true },
  descripcion: { type: String, required: true },
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
});

// Modelos de Mongoose
const Cliente: Model<ICliente> = mongoose.model<ICliente>(
  "Cliente",
  ClienteSchema
);
const Gasto: Model<IGasto> = mongoose.model<IGasto>("Gasto", GastoSchema);

// Clase MongoAdapter
export class MongoAdapter {
  private dbURI: string;

  constructor(dbURI: string) {
    this.dbURI = dbURI;
    this.connect();
  }

  private async connect() {
    try {
      await mongoose.connect(this.dbURI);
      console.log("Conectado a la base de datos MongoDB");
    } catch (error) {
      console.error("Error al conectar a MongoDB:", error);
    }
  }

  // Método para agregar o actualizar un cliente
  public async agregarOActualizarCliente(
    clienteData: ICliente
  ): Promise<ICliente | null> {
    try {
      const clienteExistente = await Cliente.findOne({
        numero: clienteData.numero,
      });

      if (clienteExistente) {
        clienteExistente.gastosAnotados += clienteData.gastosAnotados;
        clienteExistente.resumenSolicitado += clienteData.resumenSolicitado;
        clienteExistente.notificaciones = clienteData.notificaciones;
        await clienteExistente.save();
        console.log(`Cliente con número ${clienteData.numero} actualizado.`);
        return clienteExistente;
      } else {
        const nuevoCliente = new Cliente(clienteData);
        await nuevoCliente.save();
        console.log(`Cliente con número ${clienteData.numero} agregado.`);
        return nuevoCliente;
      }
    } catch (error) {
      console.error("Error al agregar o actualizar el cliente:", error);
      return null;
    }
  }

  // Método para buscar si un cliente ya existe por su número
  public async buscarClientePorNumero(
    numero: string
  ): Promise<ICliente | null> {
    return await Cliente.findOne({ numero }).exec();
  }

  // Método para agregar un gasto asociado a un cliente
  public async agregarGasto(
    numeroCliente: string,
    gastoData: Omit<IGasto, "cliente">
  ): Promise<IGasto | null> {
    try {
      // Buscar el cliente por su número
      const cliente = await this.buscarClientePorNumero(numeroCliente);

      if (!cliente) {
        console.error(`Cliente con número ${numeroCliente} no encontrado.`);
        return null;
      }

      // Crear el gasto asociado al cliente
      const gasto = new Gasto({ ...gastoData, cliente: cliente._id });
      await gasto.save();
      console.log(
        `Gasto registrado para el cliente con número ${numeroCliente}.`
      );
      return gasto;
    } catch (error) {
      console.error("Error al agregar gasto:", error);
      return null;
    }
  }

  // Método para obtener los gastos de un cliente por su número
  public async obtenerGastosPorCliente(numero: string): Promise<IGasto[]> {
    try {
      const cliente = await this.buscarClientePorNumero(numero);
      if (!cliente) {
        console.error(`Cliente con número ${numero} no encontrado.`);
        return [];
      }

      return await Gasto.find({ cliente: cliente._id }).exec();
    } catch (error) {
      console.error("Error al obtener gastos del cliente:", error);
      return [];
    }
  }
}

export const mongoAdapter = new MongoAdapter(config.MongoDB_URI);
