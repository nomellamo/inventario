// src/server.js
const { env } = require("./config/env");
const { app } = require("./app");

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
