const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const nodemailer = require("nodemailer");
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-o6iroya-shard-00-00.wymoxsw.mongodb.net:27017,ac-o6iroya-shard-00-01.wymoxsw.mongodb.net:27017,ac-o6iroya-shard-00-02.wymoxsw.mongodb.net:27017/?ssl=true&replicaSet=atlas-puyajh-shard-0&authSource=admin&retryWrites=true&w=majority`
// This is your test secret API key.
const stripe = require("stripe")(`${process.env.PAYMENT_SECRET_KEY}`);

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
//validate jwt
const verifyJwt = (req, res, next) =>{
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error:true, message:'unauthorized access'})
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({error:true, message:'unauthorized access'})
    }
    req.decoded = decoded
       next()
  })
  

}

//send mail function 
const sendMail = (emailDate, emailAddress ) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS
    }
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: emailAddress,
    subject: emailDate?.subject,
    html:`<p>${emailDate?.message}</p>`
  };
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
   console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
      // do something useful
    }
  });
}

async function run() {
  try {
    const usersCollection = client.db('aircncDb').collection('users')
    const roomsCollection = client.db('aircncDb').collection('rooms')
    const bookingsCollection = client.db('aircncDb').collection('bookings')
    //generate client secret and payment system
    app.post('/create-payment-intent',verifyJwt, async (req,res)=>{
      const {price} = req.body;
     
      if(price){
        const amount = parseFloat(price) * 100
        const paymentIntent = await stripe.paymentIntents.create({
         amount:amount,
         currency:'usd',
         payment_method_types:['card']
        })
        res.send({clientSecret:paymentIntent.client_secret})
      }
    })

    // generate token
    app.post('/jwt', (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h',
      })

      res.send({ token })
    })
    
    
    //Save user email or data in db 
    app.put('/users/:email',async(req,res)=>{
      const email = req.params.email
      const user = req.body
      const query = {email:email }
      const options = {upsert: true}
      const updateDoc = {
        $set: user 
      }
      const result = await usersCollection.updateOne(query,updateDoc,options)
  
      res.send(result)
    })
    //Save user email role in db
    app.put('/users/:email',async(req,res)=>{
      const email = req.params.email 
      const user = req.body
      const query = {email:email }
      const options = {upsert: true}
      const updateDoc = {
        $set: user 
      }
      const result = await usersCollection.updateOne(query,updateDoc,options)
      res.send(result)
    })
    //get users data from db 
    app.get('/user/:email',async(req,res)=>{
      const email = req.params.email
      const query = {email:email }
      const result = await usersCollection.findOne(query)
      res.send(result)
    })
    //save a room in db
    app.post('/rooms',async(req,res)=>{
      const room = req.body
      const result = await roomsCollection.insertOne(room)
      res.send(result)
    })
    app.patch('/rooms/status/:id',async(req,res)=>{
      const id = req.params.id
      const status = req.body.status
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          booked:status,
        }
      }
      const result = await roomsCollection.updateOne(filter,updateDoc)
      res.send(result)
    })
    //get rooms data from db
    app.get('/bookings',async(req,res)=>{
      const email = req.query.email
      if(!email){
        res.send([])
      }
      const query = {'guest.email':email}
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })
    //get rooms data from db
    app.get('/bookings/host',async(req,res)=>{
      const email = req.query.email
      if(!email){
        res.send([])
      }
      const query = {host:email}
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })
    //Save a booking data from db
    app.post('/bookings',async(req,res)=>{
      const booking = req.body
      const result = await bookingsCollection.insertOne(booking)
      //send confirmation email to gust email account
       // Send confirmation email to guest
       sendMail(
        {
          subject: 'Booking Successful!',
          message: `Booking Id: ${result?.insertedId}, TransactionId: ${booking.transactionId}`,
        },
        booking?.guest?.email
      )
      //send confirmation email to host email account
      sendMail(
        {
          subject: 'Your room got booked!',
          message: `Booking Id: ${result?.insertedId}, TransactionId: ${booking.transactionId}. Check dashboard for more info`,
        },
        booking?.host
      )
    
      res.send(result)
    })
   //delete a booking data from db
    app.delete('/bookings/:id',async(req,res)=>{
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })
 

    app.get('/getRoomsData',async(req,res)=>{
      const result = await roomsCollection.find().toArray()
      res.send(result)
    })
    app.get('/getRoomsData/:email',verifyJwt,async(req,res)=>{
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail);
      const email = req.params.email;
      if(email !== decodedEmail){
        return res.status(403).send({error:true, message:'Forbidden access'})
      }
      const query = {'host.email':email}
      const result = await roomsCollection.find(query).toArray()
      res.send(result)
    })
    //delete a mylibrary data from db
     // delete room
    //  app.delete('/getRoom/:id', async (req, res) => {
    //   const id = req.params.id
    //   const query = { _id: new ObjectId(id) }
    //   const result = await roomsCollection.deleteOne(query)
    //   res.send(result)
    // })

    app.get('/getRoom/:id', async (req, res) => {
      const id = req.params.id; // Retrieve id from req.params
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });
    //delete a booking data from db
    app.delete('/getRoom/:id',async(req,res)=>{
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.deleteOne(query)
      res.send(result)
    })
     //update room data
      // Update A room
    app.put('/rooms/:id', async (req, res) => {
      const room = req.body
      console.log(room)

      const filter = { _id: new ObjectId(req.params.id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: room,
      }
      const result = await roomsCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })
    
    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('AirCNC Server is running..')
})

app.listen(port, () => {
  console.log(`AirCNC is running on port ${port}`)
})