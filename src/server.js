// src/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const routes = require("./routes");      
const errorMiddleware = require("./middleware/error.middleware");

// Ensure master DB connects on startup
require("./config/masterDB");

const app = express();

const PORT = process.env.PORT || 3000;

// global middlewares

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" })); 

app.use(cors());

//app.options("*",cors())//keerthan

// API routes
app.use("/api", routes);

// error handler (last)
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

app.set("trust proxy", true);
});
