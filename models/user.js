const mongoose = require("mongoose");

const UserSchema = mongoose.Schema;

const User = new UserSchema({
  full_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone_number: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  publicKey: {
    type: String,
  },
  privateKey: {
    type: String,
  },
  Wif: {
    type: String,
  },
  balance: {
    type: Number,
  },
});

const TransanctionSchema = new UserSchema({
  amount_to_receiver: {
    type: Number,
  },
  amount_remaining: {
    type: Number,
  },
  type: {
    type: String,
  },
  sender: {
    type: String,
  },

  date: {
    type: String,
  },
  receiver: {
    type: String,
  },
  status: {
    type: String,
  },
  price: {
    type: String,
  },
  main: {
    type: Number,
  },
});

// const profileData = new UserSchema({
//   firstName: { type: String },
//   LastName: { type: String },
//   ExternalWallet: { type: String },
//   email: { type: String },
//   address: { type: String },
//   zip: { type: String },
// });

const UserModel = mongoose.model("users", User);
const Transaction = mongoose.model("transaction", TransanctionSchema);
// const SaveprofileData = mongoose.model("profile", profileData);
module.exports = {
  UserModel,
  Transaction,
  // SaveprofileData
};
