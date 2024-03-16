require('dotenv').config(); // Load environment variables from .env file

const express = require("express");
const path = require("path");
const collection = require("./configAuth");
const bcrypt = require('bcrypt');
const multer = require("multer")
const mongoose = require("mongoose")
const File = require("../models/File")

const app = express();
// convert data into json format
app.use(express.json());
// Static file
app.use(express.static("public"));

app.use(express.urlencoded({ extended: false }));
//use EJS as the view engine
app.set("view engine", "ejs");
app.set('views', 'viewsAuth');

const upload = multer({ dest: "uploads" })

mongoose.connect(process.env.DATABASE_URL)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Failed to connect to MongoDB:', error);
    });

app.get("/", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

// Register User
app.post("/signup", async (req, res) => {

    const data = {
        name: req.body.username,
        password: req.body.password
    }

    // Check if the username already exists in the database
    const existingUser = await collection.findOne({ name: data.name });

    if (existingUser) {
        res.send('ERROR: User already exists. Please choose a different username.');
    } else {
        // Hash the password using bcrypt
        const saltRounds = 10; // Number of salt rounds for bcrypt
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);

        data.password = hashedPassword; // Replace the original password with the hashed one

        const userdata = await collection.insertMany(data);
        console.log(userdata);
        res.render("login");
    }

});

// Login user 
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.username });
        if (!check) {
            res.send("ERROR: User name cannot found")
        }
        // Compare the hashed password from the database with the plaintext password
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            res.send("ERROR: Invalid Password");
        }
        else {
            res.render("index");
        }
    }
    catch {
        res.send("Invalid Username or Password");
    }
});




//Logic for uploading file via the server file
app.post("/upload", upload.single("file"), async (req, res) => {
    const fileData = {
      path: req.file.path,
      originalName: req.file.originalname,
    }
    if (req.body.password != null && req.body.password !== "") {
      fileData.password = await bcrypt.hash(req.body.password, 10)
    }
  
    const file = await File.create(fileData)
  
    res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` })
  })
  
  app.route("/file/:id").get(handleDownload).post(handleDownload)
  
  async function handleDownload(req, res) {
    const file = await File.findById(req.params.id)
  
    if (file.password != null) {
      if (req.body.password == null) {
        res.render("password")
        return
      }
  
      if (!(await bcrypt.compare(req.body.password, file.password))) {
        res.render("password", { error: true })
        return
      }
    }
  
    file.downloadCount++
    await file.save()
    console.log(file.downloadCount)
  
    res.download(file.path, file.originalName)
      }


// Define Port for Application
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});
