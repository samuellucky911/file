const express = require("express");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cookies = require("cookie-parser");
const dotenv = require("dotenv");
dotenv.config();
app.use(cookies());

// mongoose
//   .connect(process.env.MONGODB_URI || process.env.DATABASE_CONNECTION, {
//     useNewUrlParser: true,
//   })
//   .then((connect) => console.log("connected to mongodb.."))
//   .catch((e) => console.log("could not connect to mongodb", e));

mongoose.connect("mongodb://localhost/BTC_WALLET");
mongoose.Promise = global.Promise;
app.use(bodyParser.json());
const routes = require("./routes/routes");
app.set("view engine", "ejs");

app.use("/static", express.static("static"));

app.use(routes);
app.listen(process.env.PORT || 4040, () =>
  console.log("server is listening at port " + process.env.PORT)
);
