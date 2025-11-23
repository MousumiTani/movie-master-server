const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.y9d5q6q.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let moviesCollection;

async function run() {
  try {
    const db = client.db("movie-db");
    moviesCollection = db.collection("movies");
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}
run();

app.get("/", async (req, res) => {
  try {
    const movies = await moviesCollection.find().toArray();
    res.send(movies);
  } catch (error) {
    res.status(500).send({ message: "Error fetching movies", error });
  }
});

app.get("/movies", async (req, res) => {
  try {
    const { genres, minRating, maxRating } = req.query;
    const query = {};
    if (genres) query.genre = { $in: genres.split(",") };
    if (minRating)
      query.rating = { ...query.rating, $gte: parseFloat(minRating) };
    if (maxRating)
      query.rating = { ...query.rating, $lte: parseFloat(maxRating) };

    const movies = await moviesCollection.find(query).toArray();
    res.send(movies);
  } catch (error) {
    res.status(500).send({ message: "Error fetching all movies", error });
  }
});

//hero movies
app.get("/movies/featured", async (req, res) => {
  try {
    const movies = await moviesCollection.find().limit(5).toArray();
    res.send(movies);
  } catch (error) {
    res.status(500).send({ message: "Error fetching featured movies", error });
  }
});

//top-rated
app.get("/movies/top-rated", async (req, res) => {
  try {
    const topRated = await moviesCollection
      .find()
      .sort({ rating: -1 })
      .limit(5)
      .toArray();
    res.send(topRated);
  } catch (error) {
    res.status(500).send({ message: "Error fetching top rated movies", error });
  }
});

//movie by ID
app.get("/movies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const movie = await moviesCollection.findOne({ _id: new ObjectId(id) });
    if (!movie) return res.status(404).send({ message: "Movie not found" });

    res.send(movie);
  } catch (error) {
    res.status(500).send({ message: "Error fetching movie", error });
  }
});

// Add
app.post("/movies/add", async (req, res) => {
  try {
    const movieData = req.body;
    const result = await moviesCollection.insertOne(movieData);
    res.send({ message: "Movie added", movieId: result.insertedId });
  } catch (error) {
    res.status(500).send({ message: "Error adding movie", error });
  }
});

//update
app.put("/movies/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    if (!updatedData.userId)
      return res.status(400).send({ message: "User email is required" });

    const movie = await moviesCollection.findOne({ _id: new ObjectId(id) });
    if (!movie) return res.status(404).send({ message: "Movie not found" });

    if (movie.addedBy !== updatedData.userId)
      return res.status(403).send({ message: "Not authorized" });

    delete updatedData.addedBy;
    delete updatedData.userId;

    await moviesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    res.send({ message: "Movie updated" });
  } catch (error) {
    res.status(500).send({ message: "Error updating movie", error });
  }
});

//dlt
app.delete("/movies/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId)
      return res.status(400).send({ message: "User email is required" });

    const movie = await moviesCollection.findOne({ _id: new ObjectId(id) });
    if (!movie) return res.status(404).send({ message: "Movie not found" });

    if (movie.addedBy !== userId)
      return res.status(403).send({ message: "Not authorized" });

    await moviesCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ message: "Movie deleted" });
  } catch (error) {
    res.status(500).send({ message: "Error deleting movie", error });
  }
});

app.get("/movies/my-collection", async (req, res) => {
  try {
    const { userId } = req.query;
    const movies = await moviesCollection.find({ addedBy: userId }).toArray();
    res.send(movies);
  } catch (error) {
    res.status(500).send({ message: "Error fetching collection", error });
  }
});

app.get("/users", (req, res) => {
  const totalUsers = Math.floor(Math.random() * 451) + 50;
  res.send([{ totalUsers }]);
});

//watchlist
app.patch("/movies/:id/watchlist", async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!userEmail)
      return res.status(400).send({ message: "userEmail is required" });

    const movie = await moviesCollection.findOne({ _id: new ObjectId(id) });
    if (!movie) return res.status(404).send({ message: "Movie not found" });

    const currentWatchlist = movie.watchlist || [];
    const updatedWatchlist = currentWatchlist.includes(userEmail)
      ? currentWatchlist.filter((email) => email !== userEmail)
      : [...currentWatchlist, userEmail];

    await moviesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { watchlist: updatedWatchlist } }
    );

    res.send({
      message: updatedWatchlist.includes(userEmail)
        ? "Added to watchlist"
        : "Removed from watchlist",
      watchlist: updatedWatchlist,
    });
  } catch (err) {
    res.status(500).send({ message: "Failed to update watchlist", error: err });
  }
});

module.exports = app;

//some lines are added to solve the deploy related problem
