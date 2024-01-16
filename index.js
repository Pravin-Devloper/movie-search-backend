const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const fs = require('fs');
const DB = 'db.json';


const hostname = process.env.hostname;
const PORT = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


const getFavList = () => {
  try {
    const favoritesData = fs.readFileSync(DB);
    return JSON.parse(favoritesData);
  } catch (error) {
    console.error(`Error reading favorites: ${error.message}`);
    return [];
  }
};

const addToSave = (favorites) => {
  try {
    const favData = JSON.stringify(favorites);
    fs.writeFileSync(DB, favData);
  } catch (error) {
    console.error(`Error writing favorites: ${error.message}`);
  }
};


// API'S...!
app.get('/api/movies/search', async (req, res) => {
  try {
    const { search } = req.query;
    console.log(search)
    // const omdbapiUrl = `http://www.omdbapi.com/?apikey=${process.env.omdbApiKey}&t=${search}&plot=full`;
    const omdbapiUrl = `http://www.omdbapi.com/?apikey=${process.env.omdbApiKey}&s=${search}&plot=full`;
    const results = await axios.get(omdbapiUrl);
    if (results.data.Error) {
      throw new Error(results.data.Error);
    }

    const favorites = getFavList();
    const updatedData = results.data.Search.map(item => ({
      ...item,
      fav_status: favorites.some(fav_item => fav_item.imdbID === item.imdbID)
    }));
    console.log(updatedData);
    return res.status(200).send({totalResults:results.data.totalResults,Search:updatedData});
  } catch (error) {
    return res.status(500).send({ error: `Server ERROR : ${error.message}` });
  }
});

app.get('/api/movies/favorites', async (req, res) => {
  try {
    const favorites = getFavList();
    return res.status(200).send(favorites);
  } catch (error) {
    return res.status(500).send({ error: `Server ERROR: ${error.message}` });
  }
});

app.post('/api/movies/favorites', async (req, res) => {
  try {
    const { Poster, Title, Type, Year, fav_status, imdbID } = req.body;
    const favorites = getFavList();
    const exist_movie = favorites.find((movie) => movie.imdbID === imdbID);
    if (exist_movie) {
      return res.status(400).send({ error: 'This movie already in favorites' });
    }
    favorites.push({ Poster, Title, Type, Year, fav_status, imdbID });
    addToSave(favorites);
    return res.status(200).send({ success: true, msg:"This movie has been added to the favorites." });
  } catch (error) {
    return res.status(500).send({ error: `Server ERROR: ${error.message}` });
  }
});

app.delete('/api/movies/favorites/:imdbID', (req, res) => {
  try {
    const { imdbID } = req.params;

    const favorites = getFavList();
    const index = favorites.findIndex((movie) => movie.imdbID === imdbID);
    if (index === -1) {
      return res.status(404).send({ error: 'This movie not found in favorites' });
    }
    favorites.splice(index, 1);
    addToSave(favorites);

    return res.status(200).send({ success: true, msg:"This movie has been removed from the favorites."});
  } catch (error) {
    return res.status(500).send({ error: `Server ERROR: ${error.message}` });
  }
});


app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.listen(PORT, hostname, () => {
  console.log(`Server Running is ${hostname} : ${PORT}`);
});

module.exports = app;
