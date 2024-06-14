const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173", // for local testing client side URL
      "https://task-management-7bd2a.firebaseapp.com", // for Firebase hosting URL
      "https://task-management-7bd2a.web.app", // for Firebase hosting URL
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "API is working!" });
});

const uri = `mongodb+srv://doyermiojasermnb:${process.env.MONGODB_PASSWORD}@cluster0.wer52pn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userCollection = client.db("TaskManagement").collection("user");
    const taskCollection = client.db("TaskManagement").collection("task");

    // logger
    const logger = (req, res, next) => {
      console.log("log info", req.method);
      console.log("log info url", req.url);
      next();
    };

    // verifyJWTToken Middleware
    const verifyToken = (req, res, next) => {
      const token = req?.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: "unauthorize access token" });
      }
      jwt.verify(token, process.env.JWT_SECRETE_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access token" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // auth related Api JWT
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRETE_TOKEN, {
        expiresIn: "1d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true, //http://localhost:5173/
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logOut", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // users
    app.post("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ errors: "This email already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // taskCollection
    app.post("/task", verifyToken, async (req, res) => {
      try {
        const task = req.body;
        const result = await taskCollection.insertOne(task);
        res.send(result);
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/allTask", verifyToken, async (req, res) => {
      try {
        const result = await taskCollection.find({}).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.patch("/task/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "completed",
          },
        };
        const result = await taskCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/singleTask/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await taskCollection.findOne(filter);
        res.send(result);
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.put("/task/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const option = { upsert: true };
        const updateDoc = { $set: { ...req.body } };
        const result = await taskCollection.updateOne(
          filter,
          updateDoc,
          option
        );
        res.send(result);
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.delete("/task/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await taskCollection.deleteOne(filter);
        res.send(result);
      } catch (error) {
        console.error("Error adding project:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Server start
    app.get("/", (req, res) => {
      res.send(`Server is running on port: ${port}`);
    });

    app.listen(port, () => {
      console.log(`Server is running on port: ${port}`);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
