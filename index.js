const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
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

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})


async function run() {
  try {
    const usersCollection = client.db('aircncDb').collection('users')
    const roomsCollection = client.db('aircncDb').collection('rooms')
    const bookingsCollection = client.db('aircncDb').collection('bookings')
    // generate token
    app.post('/jwt',async(req,res)=>{
       const email = req.body.email
       console.log(email);
       res.send(email)
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
    app.get('/getRoomsData/:email',async(req,res)=>{
      const email = req.params.email
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