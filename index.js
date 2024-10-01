import express from "express";
import bodyParser from "body-parser";
import mysql from "mysql2";
import bcrypt from 'bcrypt';

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

app.get('/', (req, res) => {
    res.render('signup1');
});

app.get("/login", (req, res) => {
    res.render("login1.ejs");
});
app.get("/login1", (req, res) => {
    res.render("index.ejs");
});
app.get('/index', (req, res) => {
    const username = req.query.username;
    // res.render('index.ejs', { username });
    db.query('SELECT * FROM checkuserlocation WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Database query error.');
        }

        res.render('index.ejs', { username, locations: results }); // Pass the results to the template
    });

});

app.get('/user-details', (req, res) => {
    const username = req.query.username; // Get the username from query parameters

    const query = 'SELECT * FROM checkuserlocation WHERE username = ? ORDER BY `check-in` DESC';
    
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Database query error.');
        }
        res.json(results); // Send the results as JSON
    });
});

app.get('/index', (req, res) => {
    const username = req.query.username;

    // Query to get all locations for the username
    db.query('SELECT * FROM checkuserlocation WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Database query error.');
        }

        res.render('index.ejs', { username, locations: results }); // Pass the results to the template
    });
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Query the database for the user
    const query = `SELECT * FROM users WHERE username = ?`;

    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Database query error.');
        }

        if (results.length > 0) {
            const user = results[0];

            // Compare the hashed password with the input password
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                // Successful login, redirect to index
                res.redirect('/index?username=' + encodeURIComponent(username));
            } else {
                // Incorrect password
                res.status(401).send('Invalid username or password.');
            }
        } else {
            // User not found
            res.status(404).send('User not found.');
        }
    });
});

app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into the database
    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;

    db.query(query, [username, hashedPassword], (err, result) => {
        if (err) {
            console.error('Error inserting user into database:', err);
            return res.status(500).send('Error during signup. Please try again.'); // Better error response
        }
        res.redirect("login");
    });
});



// Update location and check in/out functionality
app.post('/update-location', (req, res) => {
    const { latitude, longitude, username, distance, fixedRadius } = req.body;

    console.log(`Latitude: ${latitude}, Longitude: ${longitude}, Username: ${username}, Distance: ${distance}, Fixed Radius: ${fixedRadius}`);

    // Check if within the fixed radius
    if (distance <= fixedRadius) {
        db.query('SELECT * FROM checkuserlocation WHERE username = ? AND `check-out` IS NULL', [username], (err, results) => {
            if (err) {
                console.error('Error querying the database:', err);
                return res.status(500).send('Database query error.');
            }

            if (results.length > 0) {
                // Update existing check-in location
                db.query('UPDATE checkuserlocation SET latitude = ?, longitude = ? WHERE username = ? AND `check-out` IS NULL', [latitude, longitude, username], (err) => {
                    if (err) {
                        console.error('Error updating the database:', err);
                        return res.status(500).send('Database update error.');
                    }
                    res.status(200).send('Location updated successfully.');
                });
            } else {
                // Insert new check-in location
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
                // Update check-out time
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
