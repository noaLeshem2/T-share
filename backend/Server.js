import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { register } from "./controllers/auth.js";
import User from "./models/User.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/users.js";
import messageRouter from './routes/messages.js';

import { login } from "./controllers/auth.js";

/* CONFIGURATIONS */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));
app.use("/assets", express.static(path.join(__dirname, "public/assets")));


/* FILE STORAGE */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/assets");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

/* ROUTES WITH FILES */
app.post("/auth/register", upload.single("picture"), register);

/* ROUTES */
app.use("/auth", authRouter);
app.use('/', messageRouter);
//app.use("/users", userRouter);



app.get('/getFriends', async (req, res) => {
  try {
      const { username } = req.query;
      const user = await User.findOne({ username });
      res.status(200).json({ friends: user.friends });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get("/getFullname", async (req,res) =>{
  try {
    const { username } = req.query;
    const user = await User.findOne({ username });
    res.status(200).json({ fullName: user.fullName });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.get("/getID", async (req,res) =>{
  try {
    const { username } = req.query;
    const user = await User.findOne({ username });
    res.status(200).json({ _id: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


// check if username is taken in registeration
app.get("/auth/checkUsername", async (req, res) => {
  const { username } = req.query;
  const user = await User.findOne({ username });
  if (user) {
    res.json({ exists: true });
  } else {
    res.json({ exists: false });
  }
});

// check if username is taken in registeration
app.get("/auth/checkEmail", async (req, res) => {
  const { email } = req.query;
  const user = await User.findOne({ email });
  if (user) {
    res.json({ exists: true });
  } else {
    res.json({ exists: false });
  }
});



const PORT = process.env.PORT || 6001;

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));


import http from "http";
import { Server } from "socket.io";


const server = http.createServer(app);
server.listen(3000, () => console.log(`listening at ${PORT}`));
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3001",
  },
});

io.on("connection", (socket) => {
  console.log('connected to socket.io');

  socket.on("setup", (userData)=>{
    socket.join(userData);
    
    socket.emit("connected");
  });

  socket.on("join room", (userId) => {
    console.log("join " + userId)
    socket.join(userId); // Join the user to their own room
  });
  
  socket.on("send message", (friendID, newMessage, user, flag) =>{
    console.log("friend is " +friendID);
    socket.in(friendID).emit("message recieved", newMessage, user, flag);
    socket.emit("message recieved", newMessage, user, flag);
  })

});



