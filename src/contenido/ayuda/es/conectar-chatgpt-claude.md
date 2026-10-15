---
titulo: Conectar Clipfine a ChatGPT o Claude
descripcion: Agregá Clipfine como conector en ChatGPT o Claude y preguntá cómo rinden los clips de cada cliente, qué hay programado o cómo usar Clipfine.
categoria: app
orden: 3
funciones:
---
Con el conector de Clipfine, ChatGPT o Claude pueden consultar tus marcas, sus métricas y lo que tienen programado, y contestarte con la ayuda de Clipfine. Ven lo mismo que vos en el panel, con tus permisos.

## Qué necesitás

- Tu cuenta de Clipfine.
- La URL del conector: **{{mcp}}**. También la encontrás en **Perfil → Conectar con ChatGPT o Claude**, con un botón para copiarla.
- Una cuenta de ChatGPT o Claude que permita agregar conectores personalizados. Depende de tu plan con ellos.

## En Claude

1. Entrá a **Configuración → Conectores** y elegí **Agregar conector personalizado**.
2. Poné un nombre (por ejemplo, Clipfine) y pegá la URL del conector.
3. Tocá **Conectar**. Se abre Clipfine: entrá con tu cuenta y tocá **Permitir**.

## En ChatGPT

1. En chatgpt.com, entrá a **Plugins** (en el menú de la izquierda), tocá **+** y elegí **Add custom MCP server**.
2. Completá el formulario:
   - **Icon** (opcional): podés subir el [ícono de Clipfine](https://www.clipfine.io/icons/clipfine-256.png). Pide un PNG de hasta 10 KB.
   - **Name**: Clipfine.
   - **Description** (opcional): por ejemplo, "Métricas, clips y publicaciones de mis clientes en Clipfine".
   - **Connection**: dejá elegido **Server URL** y pegá la URL del conector, **{{mcp}}**.
   - **Authentication**: **OAuth**. No hace falta tocar **Advanced OAuth settings**: ChatGPT encuentra solo lo que necesita.
3. Marcá **I understand and want to continue** (el aviso que ChatGPT muestra para cualquier servidor propio) y tocá **Create as a plugin**.
4. ChatGPT muestra **Connect Clipfine**, con lo que comparte con la app (memorias y chats relevantes, según tu configuración de ChatGPT). Tocá **Continue to Clipfine**.
5. Se abre Clipfine (si no tenías la sesión abierta, entrá con tu cuenta). La pantalla **"ChatGPT quiere conectarse a tu Clipfine"** muestra qué va a poder ver: tus marcas, sus métricas y lo programado, y la ayuda de Clipfine, siempre en **solo lectura**. Tocá **Permitir**.
6. Volvés a ChatGPT y Clipfine aparece en **Plugins → Installed**. En un chat nuevo, elegí el plugin de Clipfine y preguntá.

Si en Plugins no aparece esa opción:

- Activá el **modo desarrollador** en **Configuración → Seguridad e inicio de sesión** (en versiones anteriores estaba en **Configuración → Conectores → Avanzado**). Con eso aparece **Create MCP App** en Plugins.
- Revisá tu plan: agregar servidores propios necesita un plan pago de ChatGPT.
- Si tu ChatGPT es de una empresa (Business o Enterprise), quien lo administra tiene que darte permiso para crear conexiones.

Los nombres de los menús pueden cambiar según la versión de cada app.

## Qué podés preguntar

- "¿Qué clips de Café Luna funcionaron mejor este mes?"
- "Armame el reporte de los últimos 30 días para mandarle al cliente."
- "¿Qué tiene programado cada cliente esta semana? ¿Hay algo esperando revisión?"
- "¿Cómo invito a un cliente para que solo apruebe?"

## Qué no puede hacer

Es de **solo lectura**: no programa, no aprueba, no edita ni borra nada. Para desconectarlo, entrá a **Perfil → Conectar con ChatGPT o Claude** y tocá **Desconectar**.

## Ver qué está conectado

En **Perfil → Conectar con ChatGPT o Claude** ves cada app conectada con su estado:

- **Activa**: se usó (o se conectó) en la última semana.
- **Sin uso**: hace más de una semana que nadie le pregunta. Si la quitaste en ChatGPT o Claude, desconectala acá también: ellos no nos avisan.
- **Vencida**: pasaron 60 días sin uso. Para volver a usarla, conectala de nuevo.

Si sos **propietario** de una marca, en **Equipo** ves quiénes del equipo tienen ChatGPT o Claude conectado y pueden preguntar por esa marca. Cada persona desconecta las suyas; si alguien no tiene que ver más la marca, sacalo del equipo.

> **Consejo:** si trabajás con varios clientes, nombrá la marca en la pregunta. Si no sabe cuál, te va a mostrar la lista de tus marcas.
