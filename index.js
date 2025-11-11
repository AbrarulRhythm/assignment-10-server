const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./plateshare-firebase-admin-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.token_email = decoded.email;
        next();
    }
    catch (error) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qrthjko.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Plate Share server is running...');
})

async function run() {
    try {
        await client.connect();

        const db = client.db('plateShare_db');
        const usersCollection = db.collection('users');
        const foodsCollection = db.collection('foods');

        // :::::::::::::::: Users related apis ::::::::::::::::

        // Users Post API
        app.post('/users', async (req, res) => {
            const newUser = req.body;

            const email = req.body.email;
            const query = { email: email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                res.send({ message: '⚡You already exist. Signed in successfully.' });
            }
            else {
                const result = await usersCollection.insertOne(newUser);
                res.send(result);
            }
        })

        // :::::::::::::::: Foods related apis ::::::::::::::::

        // Food Post API
        app.post('/foods', verifyFireBaseToken, async (req, res) => {
            const newFood = req.body;
            const result = await foodsCollection.insertOne(newFood);
            res.send(result);
        })

        // Get API for all available foods
        app.get('/foods', async (req, res) => {
            const query = { foodStatus: 'Available' };
            const cursor = foodsCollection.find(query).sort({ foodQuantity: -1 });
            const result = await cursor.toArray();
            res.send(result);
        })

        // Get API for Featured Foods
        app.get('/featured-foods', async (req, res) => {
            const query = { foodStatus: 'Available' };
            const cursor = foodsCollection.find(query).sort({ foodQuantity: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}

run().catch(console.dir)

app.listen(port, () => {
    console.log(`Plate Share server is running on port: ${port}`);
})