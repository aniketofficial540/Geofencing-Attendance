import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2";

// Create a connection to the SQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Aniket@12#34',
    database: 'message_db'
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});

const app = express();
const port = 5500;

app.set('view engine', 'ejs'); // Set EJS as the view engine
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const updateCounts = {};

app.get('/', (req, res) => {
    res.render('signup');
});

app.post('/signup', (req, res) => {
    const { username } = req.body;

    res.redirect(`/index?username=${username}`);
});

app.get('/index', (req, res) => {
    const username = req.query.username;
    res.render('index.ejs', { username });
});

let updateCount = 0;
app.post('/update-location', (req, res) => {
    const { latitude, longitude, username, distance, fixedRadius } = req.body;

    updateCount += 1;


    console.log(`${updateCount}: Latitude: ${latitude}, Longitude: ${longitude}`);

    if (distance <= fixedRadius) {
    
        db.query('SELECT * FROM checkuserlocation WHERE username = ? AND `check-out` IS NULL', [username], (err, results) => {
            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).send('Database query error.');
            }

            if (results.length > 0) {

                db.query('UPDATE checkuserlocation SET latitude = ?, longitude = ? WHERE username = ? AND `check-out` IS NULL', [latitude, longitude, username], (err) => {
                    if (err) {
                        console.error('Error updating the database:', err);
                        return res.status(500).send('Database update error.');
                    }
                    res.status(200).send('Location updated successfully.');
                });
            } else {

                db.query('INSERT INTO checkuserlocation (username, latitude, longitude, `check-in`) VALUES (?, ?, ?, NOW())', [username, latitude, longitude], (err) => {
                    if (err) {
                        console.error('Error inserting into the database:', err);
                        return res.status(500).send('Database insert error.');
                    }
                    res.status(200).send('Check-in recorded successfully.');
                });
            }
        });
    } else {
        db.query('SELECT * FROM checkuserlocation WHERE username = ? AND `check-out` IS NULL', [username], (err, results) => {
            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).send('Database query error.');
            }

            if (results.length > 0) {

                db.query('UPDATE checkuserlocation SET `check-out` = NOW(), duration = TIMEDIFF(NOW(), `check-in`) WHERE username = ? AND `check-out` IS NULL', [username], (err) => {
                    if (err) {
                        console.error('Error updating the database:', err);
                        return res.status(500).send('Database update error.');
                    }
                    res.status(200).send('Check-out recorded successfully.');
                });
            } else {

                res.status(400).send('User is not checked in.');
            }
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
