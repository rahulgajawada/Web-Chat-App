const express = require('express')
const http = require('http')
const path =  require('path')
const port =  process.env.PORT || 3001
const Filter = require('bad-words')
const {generateMessage,generateLocationMessage} = require('./utils/messages')
const {addUser,getUser, getUsersInRoom, removeUser} = require('./utils/users')

const socketio = require('socket.io')

const app = express()
const server = http.createServer(app)

const io = socketio(server)

const publicDirectoryPath = path.join(__dirname, '../public')
console.log(publicDirectoryPath)
app.use(express.static(publicDirectoryPath))

// let count = 0

io.on('connection', (socket) => {
    console.log('New websocket connection')

    socket.on('join', ({username, room}, callback) => {
        const {error,user} = addUser({id: socket.id, username,room})

        if(error){
            return callback(error)
        }
        socket.join(user.room)

        socket.emit('message', generateMessage('Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage(user.username + ' has joined!'))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username,message))
        callback()
    })

    

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage(user.username+ ' has left'))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })

    socket.on('sendLocation', ({latitude, longitude}, callback) => {
        // io.emit('message','https://www.google.com/maps?q=' + latitude + ',' +longitude)
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,'https://www.google.com/maps?q=' + latitude + ',' +longitude))
        callback()
    })
})



server.listen(port, () => {
    console.log("Server is on port", port)
})
