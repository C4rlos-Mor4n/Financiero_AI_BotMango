import { addKeyword, EVENTS } from "@builderbot/bot";
import { MetaProvider as Provider } from "@builderbot/provider-meta";
import { mongoAdapter } from "../services/db/MongoAdapter";
import SheetManager from "../services/SheetManager";

export const Registroflow = addKeyword<Provider>(EVENTS.ACTION)
  .addAction(async (ctx, { provider }) => {
    try {
      await provider.sendText(
        ctx.from,
        "Hola, soy Mango 🥭💸! Te voy a ayudar a registrar y hacer un seguimiento de tus gastos diarios."
      );

      return await provider.sendButtons(
        ctx.from,
        [
          {
            body: "Registrarme",
          },
          {
            body: "Cancelar",
          },
        ],
        "Para empezar, necesitamos que te registres. ¿Empezamos? 🫡"
      );
    } catch (error) {
      console.error(error);
    }
  })
  .addAction({ capture: true }, async (ctx, { endFlow, provider }) => {
    if (!ctx.body.toLowerCase().includes("registrarme")) {
      return endFlow(
        "Lamentamos que no te unas a nuestra comunidad. Estamos acá para cuando quieras tomar las riendas de tus finanzas personales 💪"
      );
    } else {
      provider.sendButtons(
        ctx.from,
        [
          {
            body: "Cancelar",
          },
        ],
        "Para ofrecerte una experiencia más personalizada, ¿podrías compartir conmigo tu nombre y apellido?\nEsto nos ayudará a continuar y asegurarnos de brindarte la mejor atención posible. ¡Gracias! 🥭💸"
      );
    }
  })
  .addAction({ capture: true }, async (ctx, { state, provider, endFlow }) => {
    if (ctx.body.toLowerCase().includes("cancelar")) {
      return endFlow(
        "Lamentamos que no te unas a nuestra comunidad. Estamos acá para cuando quieras tomar las riendas de tus finanzas personales 💪"
      );
    }

    await state.update({ name: ctx.body });
    await provider.sendText(
      ctx.from,
      `!Perfecto, ${ctx.body}! Gracias por indicarnos tu nombre. 🥭💸`
    );
  })
  .addAnswer(
    "Por ultimo, ¿podrías indicarme tu correo electrónico? 📧",
    {
      capture: true,
    },
    async (ctx, { state, fallBack, provider }) => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(ctx.body)) {
        return fallBack("Por favor, ingresa un correo electrónico válido. 📧");
      }

      await state.update({ email: ctx.body });

      await provider.sendButtons(
        ctx.from,
        [
          {
            body: "Sí",
          },
          {
            body: "No",
          },
        ],
        `¿Deseas recibir notificaciones sobre tus gastos? 📬`
      );
    }
  )
  .addAction({ capture: true }, async (ctx, { endFlow, state, fallBack }) => {
    if (ctx.body.toLowerCase().includes("no")) {
      await state.update({ Notifications: false });
      const { name, email, Notifications } = state.getMyState();

      await SheetManager.agregarOActualizarUsuario(
        name,
        ctx.from,
        email,
        0,
        0,
        false,
        Notifications
      );

      await mongoAdapter.agregarOActualizarCliente({
        nombre: name,
        numero: ctx.from,
        email,
        gastosAnotados: 0,
        resumenSolicitado: 0,
        premium: false,
        notificaciones: Notifications,
      } as any);

      return endFlow(
        `¡Gracias por registrarte, ${name}! 🎉\n\nYa puedes comenzar a registrar tus gastos diarios. 💰📊\n\nPor favor, indícame qué te gustaría hacer:\n👉 Registrar un gasto o\n👉 Ver un resumen de tus gastos.`
      );
    } else if (ctx.body.toLowerCase().includes("sí")) {
      await state.update({ Notifications: true });

      const { name, email, Notifications } = state.getMyState();

      await SheetManager.agregarOActualizarUsuario(
        name,
        ctx.from,
        email,
        0,
        0,
        false,
        Notifications
      );

      await mongoAdapter.agregarOActualizarCliente({
        nombre: name,
        numero: ctx.from,
        email,
        gastosAnotados: 0,
        resumenSolicitado: 0,
        premium: false,
        notificaciones: Notifications,
      } as any);

      return endFlow(
        `¡Gracias por registrarte, ${name}! 🎉\n\nLYa puedes comenzar a registrar tus gastos diarios. 💰📊\n\nPor favor, indícame qué te gustaría hacer:\n👉 Registrar un gasto o\n👉 Ver un resumen de tus gastos.`
      );
    } else {
      return fallBack("Por favor, escríbeme 'Sí' o 'No'. 📬");
    }
  });

export const Notificacionesflow = addKeyword<Provider>(EVENTS.ACTION)
  .addAction(async (ctx, { provider }) => {
    await provider.sendButtons(
      ctx.from,
      [
        {
          body: "Sí",
        },
        {
          body: "No",
        },
      ],
      `¿Deseas recibir notificaciones sobre tus gastos? 📬`
    );
  })
  .addAction({ capture: true }, async (ctx, { endFlow, state, fallBack }) => {
    if (ctx.body.toLowerCase().includes("no")) {
      await state.update({ Notifications: false });
      const {
        name,
        email,
        from,
        gastosAnotados,
        resumenSolicitado,
        premium,
        Notifications,
      } = state.getMyState();

      await mongoAdapter.agregarOActualizarCliente({
        nombre: name,
        numero: from,
        email: email,
        gastosAnotados: gastosAnotados,
        resumenSolicitado: resumenSolicitado,
        premium: premium,
        notificaciones: Notifications,
      } as any);

      const User = await SheetManager.consultarTransaccionesCliente(from);
      User.forEach(async (transaccion) => {
        if (transaccion.nombre === "Nombre") {
          return;
        }

        await mongoAdapter.agregarGasto(from, {
          nombre: transaccion.nombre,
          categoria: transaccion.categoria,
          descripcion: transaccion.descripcion || "Sin descripción", //si viene vacio, se guarda como "Sin descripción"
          monto: transaccion.monto,
          fecha: transaccion.fecha,
        } as any);
      });

      return endFlow(
        `¡Gracias por registrarte, ${name}! 🎉\n\nYa puedes comenzar a registrar tus gastos diarios. 💰📊\n\nPor favor, indícame qué te gustaría hacer:\n👉 Registrar un gasto o\n👉 Ver un resumen de tus gastos.`
      );
    } else if (ctx.body.toLowerCase().includes("sí")) {
      await state.update({ Notifications: true });
      const {
        name,
        email,
        from,
        gastosAnotados,
        resumenSolicitado,
        premium,
        Notifications,
      } = state.getMyState();

      await mongoAdapter.agregarOActualizarCliente({
        nombre: name,
        numero: from,
        email: email,
        gastosAnotados: gastosAnotados,
        resumenSolicitado: resumenSolicitado,
        premium: premium,
        notificaciones: Notifications,
      } as any);

      const User = await SheetManager.consultarTransaccionesCliente(from);
      User.forEach(async (transaccion) => {
        //is vienen los nombres los titulos de las tablas omitir
        if (transaccion.nombre === "Nombre") {
          return;
        }

        await mongoAdapter.agregarGasto(from, {
          nombre: transaccion.nombre,
          categoria: transaccion.categoria,
          descripcion: transaccion.descripcion || "Sin descripción", //si viene vacio, se guarda como "Sin descripción"
          monto: transaccion.monto,
          fecha: transaccion.fecha,
        } as any);
      });

      return endFlow(
        `¡Gracias por registrarte, ${name}! 🎉\n\nLYa puedes comenzar a registrar tus gastos diarios. 💰📊\n\nPor favor, indícame qué te gustaría hacer:\n👉 Registrar un gasto o\n👉 Ver un resumen de tus gastos.`
      );
    } else {
      return fallBack("Por favor, escríbeme 'Sí' o 'No'. 📬");
    }
  });
