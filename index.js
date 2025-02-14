const express = require('express');
const app = express();
const { User,Kitten } = require('./db');

const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error)
  }
});

// Verifies token with jwt.verify and sets req.user
// TODO - Create authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(401);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// GET /kittens/:id
app.get('/kittens/:id', authenticateJWT, async (req, res) => {
  const kitten = await Kitten.findByPk(req.params.id);

  if (!kitten) {
    res.sendStatus(401);
  } else if (kitten.ownerId !== req.user.id) {
    res.sendStatus(401);
  } else {
    res.json(kitten);
  }
});
// POST /kittens
app.post('/kittens', authenticateJWT, async (req, res) => {
  if (!req.user) {
    res.sendStatus(401);
  } else {
    const kitten = await Kitten.create({
      name: req.body.name,
      age: req.body.age,
      color: req.body.color,
      ownerId: req.user.id
    });

    res.status(201).json({
      name: kitten.name,
      age: kitten.age,
      color: kitten.color
    });
  }
});

// DELETE /kittens/:id
app.delete('/kittens/:id', authenticateJWT, async (req, res) => {
  const kitten = await Kitten.findByPk(req.params.id);

  if (!kitten) {
    res.sendStatus(401);
  } else if (kitten.ownerId !== req.user.id) {
    res.sendStatus(401);
  } else {
    await kitten.destroy();
    res.sendStatus(204);
  }
});

// POST /register
// OPTIONAL - takes req.body of {username, password} and creates a new user with the hashed password

// POST /login
// OPTIONAL - takes req.body of {username, password}, finds user by username, and compares the password with the hashed version from the DB

// GET /kittens/:id
// TODO - takes an id and returns the cat with that id

// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
