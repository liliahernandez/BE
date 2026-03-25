require('dotenv').config();
const { User } = require('./src/models');
const request = require('supertest');
const express = require('express');
const connectDB = require('./src/config/database');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use('/favorites', require('./src/routes/favorites'));

async function test() {
    await connectDB();
    const user = await User.findOne();
    if(!user) return console.log('No user');
    
    // sign token manually since we know secret
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    
    console.log('Sending GET /favorites...');
    let res = await request(app).get('/favorites').set('Authorization', 'Bearer ' + token);
    console.log('GET STATUS:', res.status);
    console.log('GET BODY:', res.body);

    console.log('Sending POST /favorites to add id 1...');
    res = await request(app).post('/favorites').set('Authorization', 'Bearer ' + token).send({ pokemonId: 1 });
    console.log('POST STATUS:', res.status);
    console.log('POST BODY:', res.body);

    process.exit(0);
}
test();
