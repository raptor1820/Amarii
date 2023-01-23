import express from "express";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import multer from "multer";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { spawn } from "child_process";
import bcrypt from "bcrypt";
import fetch, { FormData, fileFromSync } from "node-fetch";
import fs from "fs";
import { Blob } from "buffer";
//import contentDisposition from "content-disposition";
import cors from "cors";
const app = express();
const upload = multer();
import userModel from "./models/userModel.js";
import auth from "./middleware/auth.js";

dotenv.config();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false, limit: "20mb" }));
app.use(bodyParser.json({ limit: "20mb" }));
app.use(cookieParser());

//app.use(express.static("public")); using tailwind cdn for now
app.set("view-engine", "ejs");

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to database successfully");
  })
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/formSubmit", upload.single("image"), async (req, res) => {
  const { email, title, height, width, medium, artist, year, price } = req.body;
  const file = req.file;
  var { description } = req.body;
  if (
    !email ||
    !title ||
    !height ||
    !width ||
    !medium ||
    !artist ||
    !year ||
    !price ||
    !file
  ) {
    res.status(400).json({ message: "Information missing" });
  }
  if (!description) {
    description = "No description provided";
  }

  const created_user = await userModel
    .create({
      email: email,
      title: title,
      height: height,
      width: width,
      medium: medium,
      artist: artist,
      year: year,
      description: description,
      price: price,
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
      pending: true,
      approved: false,
    })
    .then(() => {
      console.log("Sent data to db");
    })
    .catch((err) => console.log(err));

  res.redirect("/formSubmitted");
});

app.get("/formSubmitted", (req, res) => {
  res.render("submitted.ejs");
});
app.get("/auth", (req, res, next) => {
  res.render("login.ejs");
});
app.post("/login", async (req, res) => {
  const id = req.body.user_id;
  const password = req.body.password;
  if (!password) {
    res.redirect("/auth");
  }
  const result = bcrypt.compare(password, process.env.HASHED_PWD);
  if (!result) {
    res.redirect("/auth");
  }
  const token = jwt.sign({ id: id }, process.env.SECRET);
  res.cookie("logged", token, {
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000,
  });
  res.redirect("/dashboard");
});

app.get("/dashboard", auth, async (req, res) => {
  const data = await userModel.find({ pending: true });
  res.render("dashboard.ejs", { data: data });
});

app.post("/approvedUser", auth, async (req, res) => {
  await userModel
    .findOneAndUpdate(
      {
        _id: req.body.id,
      },
      {
        pending: false,
        approved: req.body.approved,
      }
    )
    .then(() => {
      console.log("Updated fields successfully");
    })
    .catch((err) => {
      console.log(err);
    });
  if (req.body.approved) {
    for (const file of fs.readdirSync("./images")) {
      fs.unlinkSync("./images/" + file);
    }

    const data = await userModel.findOne({ _id: req.body.id });
    const sending_data = {
      type: "PHYSICAL",
      storePageId: process.env.SQUARESPACE_STORE_PAGE_ID,
      name: data.title,
      description:
        "<p>" +
        data.description +
        "</p><br>" +
        "<p>Artist: " +
        data.artist +
        "</p><br>" +
        "<p>Medium: " +
        data.medium +
        "</p><br>" +
        "<p>Dimensions: " +
        data.height +
        "cm X " +
        data.width +
        "cm" +
        "</p>",

      tags: ["art"],
      isVisible: true,
      variantAttributes: ["Artist", "Medium"],
      variants: [
        {
          sku: data._id,

          pricing: {
            basePrice: {
              currency: "USD",
              value: data.price,
            },
            onSale: false,
            salePrice: {
              currency: "USD",
              value: "0.00",
            },
          },
          stock: {
            quantity: 1,
            unlimited: false,
          },
          attributes: {
            Artist: data.artist,
            Medium: data.medium,
          },
          shippingMeasurements: {
            dimensions: {
              unit: "INCH",
              width: data.width,
              height: data.height,
              length: "0",
            },
          },
        },
      ],
    };
    const send = await fetch(
      "https://api.squarespace.com/1.0/commerce/products/",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.SQUARESPACE_API_KEY,
          "Content-Type": "application/json",
          "User-Agent": "Amarii",
        },
        body: JSON.stringify(sending_data),
      }
    );
    const response = await send.json();
    console.log(response);
    var img_id = response.id;

    var img_data = data.image.data.toString("base64");

    var buf = Buffer.from(img_data, "base64");

    fs.writeFileSync("./images/" + data._id + ".png", buf);
    const python = spawn("python", [
      "upload_image.py",
      img_id,
      "./images/" + data._id + ".png",
      process.env.SQUARESPACE_API_KEY,
    ]);
    python.stdout.on("data", function (data) {
      console.log("Pipe data from python script ...");
      console.log(data.toString());
    });

    // const dataOfImg = fs
    //   .readFileSync("./images/" + data._id + ".png")
    //   .toString();

    // console.log(dataOfImg);
    // const form = new FormData();
    // form.append(
    //   "file",
    //   new Blob(Array.from(dataOfImg), { type: "image/png" }),
    //   "testimg.png"
    // );

    // const send_img = await fetch(
    //   "https://api.squarespace.com/1.0/commerce/products/" + img_id + "/images",
    //   {
    //     method: "POST",
    //     headers: {
    //       Authorization: "Bearer " + process.env.SQUARESPACE_API_KEY,
    //       "User-Agent": "Amarii",
    //       // "Content-Type": "multipart/form-data",
    //     },
    //     body: form,
    //   }
    // );
    // const img_response = await send_img.json();
    // console.log(img_response);
    // fs.unlinkSync("./images/" + data._id + ".png");
  }
  res.status(200).end();
});
app.get("/*", (req, res) => {
  res.redirect("/");
});

app.listen(process.env.PORT || 8080, (err) => {
  if (err) {
    console.log(err);
  } else console.log("Server listening!");
});
// curl "https://api.squarespace.com/1.0/commerce/products/63ab0ff8796311649603ee49/images" \
//   -i \;
//   -H "Authorization: Bearer 0a02fcf2-5789-4b31-938b-97ed7c038cfa" \
//   -H "User-Agent: Amarii" \
//   -H "Content-Type: multipart/form-data" \
//   -X POST \
//   -F file=@images.jpg
