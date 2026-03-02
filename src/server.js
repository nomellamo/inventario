// src/server.js
const { env } = require("./config/env");
const { app } = require("./app");

const PORT = env.PORT;
app.listen(PORT, (error) => {
  if (error) {
    if (error.code === "EADDRINUSE") {
      console.error(`[API] Puerto ${PORT} en uso. Cierra el proceso previo o cambia PORT en .env.`);
    } else {
      console.error("[API] Error al iniciar servidor:", error.message);
    }
    process.exit(1);
  }

  console.log(`API escuchando en http://localhost:${PORT}`);
});
