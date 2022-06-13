const express = require("express");
const { UserModel, Transaction } = require("../models/user");
const route = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");
var QRCode = require("qrcode");
const nodemailer = require("nodemailer");
const sendBitcoin = require("../sendcoin");

const dotenv = require("dotenv");
dotenv.config();

// const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 587
// })

route.get("/signup", (req, res) => {
  if (req.cookies.token) {
    res.redirect("/");
  }

  res.render("pages/signup.ejs", {
    alertType: "",
    alertName: "",
  });
});

route.post(
  "/auth/signup",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const { full_name, email, password, confirmPassword, phone_number } =
      req.body;
    if (
      !full_name ||
      !email ||
      !password ||
      !confirmPassword ||
      !phone_number
    ) {
      return res.render("pages/signup", {
        alertType: "danger",
        alertName: "Fill all inputs",
      });
    }
    if (password != confirmPassword) {
      return res.render("pages/signup", {
        alertType: "danger",
        alertName: "Password do not match",
      });
    }

    const addressDetails = await axios.post(
      "https://api.blockcypher.com/v1/btc/main/addrs"
    );

    const { private, public, address, wif } = addressDetails.data;

    const existing_user = await UserModel.findOne({ email: email });

    if (existing_user) {
      return res.send("user exist");
    }
    const new_user = new UserModel({
      full_name: full_name,
      phone_number: phone_number,
      email: email,
      password: password,
      address: address,
      publicKey: public,
      privateKey: private,
      Wif: wif,
      balance: 0,
    });

    new_user.save();
    res.redirect("/login");
  }
);

route.get("/login", (req, res) => {
  if (req.cookies.token) {
    return res.redirect("/");
  }

  return res.render("pages/login.ejs", {
    alertType: "",
    alertName: "",
  });
});

route.post(
  "/auth/login",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render("pages/login.ejs", {
        alertType: "danger",
        alertName: "Enter your details",
      });
    }

    const existing_user = await UserModel.findOne({ email: email });
    if (!existing_user) {
      return res.render("pages/login.ejs", {
        alertType: "danger",
        alertName: "User does not exist",
      });
    }

    const existing_pass = await UserModel.findOne({ password: password });
    if (!existing_pass) {
      return res.render("pages/login.ejs", {
        alertType: "danger",
        alertName: "Wrong password",
      });
    }

    const token = jwt.sign(
      {
        id: existing_user.email,
      },
      process.env.USERS_SECRET_KEY
    );

    res.cookie("token", token, {
      httpOnly: true,
    });
    res.redirect("/");
  }
);

route.get("/", async (req, res) => {
  if (!req.cookies.token) {
    return res.redirect("/login");
  }

  const loggedInUser = jwt.verify(
    req.cookies.token,
    process.env.USERS_SECRET_KEY
  ).id;
  const user = await UserModel.findOne({ email: loggedInUser });

  // here
  return res.render("pages/index.ejs", {
    user: user,
  });
});

route.get("/bitcoin/balance", async (req, res) => {
  if (req.cookies.token) {
    const loggedInUser = jwt.verify(
      req.cookies.token,
      process.env.USERS_SECRET_KEY
    ).id;
    const user = await UserModel.findOne({ email: loggedInUser });

    const { address } = user;

    const balance_details = await axios.get(
      `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`
    );

    const coinPrice = await axios.get(
      "https://blockchain.info/tobtc?currency=USD&value=1"
    );
    const main_balance = balance_details.data.balance / 100000000;
    // console.log(coinPrice.data, main_balance);
    const all_user = await UserModel.find();
    return res.json([balance_details.data, user, all_user, coinPrice.data]);
  }
  return res.redirect("/login");
});

route.post(
  "/api/transaction",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const { btc_amount, usd_amount, outgoing_address, type } = req.body;
    // console.log(req.body);
    if (req.cookies.token) {
      const email = jwt.verify(
        req.cookies.token,
        process.env.USERS_SECRET_KEY
      ).id;
      const user = await UserModel.findOne({ email: email });
      const { address: myAddress, balance } = user;

      const remaining = balance - btc_amount * 100000000;
      //   console.log(remaining);
      // console.log(outgoing_address);
      const existing_address = await UserModel.findOne({
        address: outgoing_address,
      });

      // console.log(existing_address);

      // const coinPrice = await axios.get(
      // 	"https://blockchain.info/tobtc?currency=USD&value=500"
      // );
      if (!existing_address) {
        res.json({
          alert: "danger",
          message: "error! invalid or external Wallet address",
        });
      } else {
        const { balance: recievers_balance } = existing_address;
        const transaction = new Transaction({
          sender: myAddress,
          receiver: outgoing_address,
          amount_to_receiver: btc_amount,
          amount_remaining: remaining,
          date: new Date().toISOString(),
          type: type,
          //price: coinPrice.data.price,
        });

        transaction.save();

        const user_balance = await UserModel.updateOne(
          { email: email, address: myAddress },
          { $set: { balance: remaining } }
        );

        const total_recievers_balance =
          btc_amount * 100000000 + recievers_balance;
        const recievers_updated_balance = await UserModel.updateOne(
          { address: outgoing_address },
          { $set: { balance: total_recievers_balance } }
        );
        res.json({
          alert: "success",
          message: `you have successfully sent ${btc_amount} BTC to ${outgoing_address}`,
        });
      }
      // console.log(req.body);
    }
  }
);

route.get("/transaction/all", async (req, res) => {
  if (req.cookies.token) {
    const email = jwt.verify(
      req.cookies.token,
      process.env.USERS_SECRET_KEY
    ).id;
    const user = await UserModel.findOne({ email: email });
    const { address: myAddress, balance } = user;

    const all_transaction = await Transaction.find();
    return res.json([all_transaction, myAddress]);
  }
});

route.get("/transaction/barcode", async (req, res) => {
  if (req.cookies.token) {
    const email = jwt.verify(
      req.cookies.token,
      process.env.USERS_SECRET_KEY
    ).id;
    const user = await UserModel.findOne({ email: email });
    const { address: myAddress, balance } = user;
    // QRCode.toString(myAddress, { type: "svg" }, function (err, url) {
    // return	res.json({ image: url });
    // });
    QRCode.toDataURL(
      myAddress,
      { errorCorrectionLevel: "H" },
      function (err, data) {
        return res.json({ image: data });
      }
    );
  }
});

route.get("/admin", async (req, res) => {
  if (!req.cookies.adminToken) {
    res.send("you are not authenticated to access this page");
  }

  const email = jwt.verify(
    req.cookies.adminToken,
    process.env.ADMIN_SECRET_KEY
  ).id;

  const existing_user = await UserModel.findOne({ email: email });
  if (!existing_user) {
    res.send("please login with the right details");
  }
  const all_user = await UserModel.find();

  res.render("pages/admin", { admin: existing_user, all: all_user });
});
route.get("/admin/login", (req, res) => {
  if (req.cookies.adminToken) {
    res.redirect("/admin");
  }

  res.render("pages/adminLogin.ejs");
});

route.post(
  "/auth/admin/login",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.send("empty inputs");
    }

    const existing_user = await UserModel.findOne({ email: email });
    if (!existing_user) {
      return res.send("user does not exist");
    }
    const { full_name, email: adminMail } = existing_user;
    if (full_name === "Admin") {
      const token = jwt.sign(
        {
          id: adminMail,
        },
        process.env.ADMIN_SECRET_KEY
      );

      res.cookie("adminToken", token, {
        httpOnly: true,
      });
      res.redirect("/admin");
    }
  }
);
route.get("/admin/bitcoin/balance", async (req, res) => {
  if (req.cookies.adminToken) {
    const loggedInUser = jwt.verify(
      req.cookies.adminToken,
      process.env.ADMIN_SECRET_KEY
    ).id;
    const user = await UserModel.findOne({ email: loggedInUser });
    const { address } = user;
    const balance_details = await axios.get(
      `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`
    );

    // const coinPrice = await axios.get(
    // 	"https://blockchain.info/tobtc?currency=USD&value=500"
    // );
    const all_user = await UserModel.find();
    res.json([balance_details.data, coinPrice.data, user, all_user]);
  }
});

route.get("/users", async (req, res) => {
  if (!req.cookies.adminToken) {
    res.send("you are not authenticated to access this page");
  }

  const email = jwt.verify(
    req.cookies.adminToken,
    process.env.ADMIN_SECRET_KEY
  ).id;

  const existing_user = await UserModel.findOne({ email: email });
  if (!existing_user) {
    res.send("please login with the right details");
  }
  const all_user = await UserModel.find();

  res.render("pages/users", { admin: existing_user });
});

route.post(
  "/send/:id",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const { id } = req.params;
    if (!req.cookies.adminToken) {
      res.send("you are not authenticated to access this page");
    }

    const email = jwt.verify(
      req.cookies.adminToken,
      process.env.ADMIN_SECRET_KEY
    ).id;

    const addresss = "";
    const existing_user = await UserModel.findOne({ email: email });
    const user = await UserModel.findOne({ email: id });
    const { privateKey, address } = user;
    const { address: myAddress } = existing_user;

    const balance_details = await axios.get(
      `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`
    );
    const main_amount = balance_details.data.balance - 6000;
    try {
      const result = sendBitcoin(address, myAddress, main_amount, privateKey);
      if (result.status === success) {
        res.render("pages/users", {
          message: result.status,
          amount: main_amount,
        });
      }
    } catch (error) {
      //   console.log(error);
    }
  }
);

// new add
route.get("/profile", async (req, res) => {
  if (!req.cookies.token) {
    return res.redirect("/login");
  }

  const loggedInUser = jwt.verify(
    req.cookies.token,
    process.env.USERS_SECRET_KEY
  ).id;
  const user = await UserModel.findOne({ email: loggedInUser });
  const { full_name, email, address, phone_number } = user;

  // return res.render("pages/profile.ejs", { user: user });
  return res.render("pages/profile.ejs", {
    user: user,
    full_name: full_name,
    email: email,
    address: address,
    phone_number: phone_number,
    alertType: " ",
    alertName: " ",
  });
});

route.get("/transactions", async (req, res) => {
  if (!req.cookies.token) {
    return res.redirect("/login");
  }

  const loggedInUser = jwt.verify(
    req.cookies.token,
    process.env.USERS_SECRET_KEY
  ).id;
  const user = await UserModel.findOne({ email: loggedInUser });
  const { full_name, email, address, phone_number } = user;

  return res.render("pages/transactions.ejs", {
    user: user,
    full_name: full_name,
    email: email,
    address: address,
    phone_number: phone_number,
    alertType: " ",
    alertName: " ",
  });
});

route.get("/settings", async (req, res) => {
  if (!req.cookies.token) {
    return res.redirect("/login");
  }

  const loggedInUser = jwt.verify(
    req.cookies.token,
    process.env.USERS_SECRET_KEY
  ).id;
  const user = await UserModel.findOne({ email: loggedInUser });
  const { full_name, email, address, phone_number } = user;

  return res.render("pages/settings.ejs", {
    user: user,
    full_name: full_name,
    email: email,
    address: address,
    phone_number: phone_number,
    alertType: " ",
    alertName: " ",
  });
});
//
// to here

route.get("/admin/logout", (req, res) => {
  res.clearCookie("adminToken");
  res.redirect("/admin/login");
});

route.get("/logout", (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.clearCookie("token");

  res.redirect("/login");
});

module.exports = route;
