const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const databasePath = path.join("cricketMatchDetails.db");
const app = express();
app.use(express.json());

let database = null;
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (err) {
    console.log(`DB Error: ${err.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();
const convertMatchDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.playerId,
    playerName: dbObject.playerName,
  };
};
app.get("/players/", async (request, response) => {
  const getPlayersQuery = `SELECT * FROM player_details;`;
  const playerArray = await database.all(getPlayersQuery);
  response.send(
    playerArray.map((each) => {
      return { playerId: each.player_id, playerName: each.player_name };
    })
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdQuery = `SELECT * FROM player_details WHERE player_id=${playerId};`;
  const player = await database.get(getPlayerIdQuery);
  response.send({
    playerId: player.player_id,
    playerName: player.player_name,
  });
});

app.put("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updateQuery = `UPDATE player_details SET 
    player_name=? WHERE player_id=?;`;
  await database.run(updateQuery, playerName, playerId);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchIdQuery = `SELECT * FROM match_details WHERE match_id=${matchId};`;
  const match = await database.get(getMatchIdQuery);
  response.send({
    matchId: match.match_id,
    matchName: match.match,
    matchYear: match.year,
  });
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchesQuery = `SELECT * FROM 
   player_match_score NATURAL JOIN match_details 
   WHERE player_id=${playerId};`;
  const playerMatches = await database.all(getPlayerMatchesQuery);
  response.send(
    playerMatches.map((each) => {
      return {
        matchId: each.match_id,
        match: each.match,
        year: each.year,
      };
    })
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `SELECT
	      player_details.player_id AS playerId,
	      player_details.player_name AS playerName
	    FROM player_match_score NATURAL JOIN player_details
        WHERE match_id=${matchId};`;
  const matchPlayers = await database.all(getMatchPlayersQuery);
  response.send(
    matchPlayers.map((each) => convertMatchDbObjectToResponseObject(each))
  );
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoresQuery = ` SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`;
  const playerScores = await database.all(getPlayerScoresQuery);
  response.send(
    playerScores.map((each) => {
      return {
        playerId: each.playerId,
        playerName: each.playerName,
        totalScore: each.totalScore,
        totalFours: each.totalFours,
        totalSixes: each.totalSixes,
      };
    })
  );
});
module.exports = app;
