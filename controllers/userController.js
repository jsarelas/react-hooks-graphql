const User = require('../models/User')

const { OAuth2Client } = require('google-auth-library')

const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID)

exports.findOrCreateUser = async token => {
    // verify auth token
    const googleUser = await verifyAuthToken(token)
    // check if user exists 
    const user = await checkIfUserExists(googleUser.email)
    console.log("user: ", user)
    // if user exists, return user; otherwise, create a new user
    return user ? user : createNewUser(googleUser)
}

const verifyAuthToken = async token => {
    try{
       const ticket = await client.verifyIdToken({
           idToken: token,
           audience: process.env.OAUTH_CLIENT_ID
       })
       return ticket.getPayload() 
    }
    catch (err) {
        console.error("Error verifying auth token", err)
    }
}

const checkIfUserExists = async email => {
    try {
       return await User.findOne({email}).exec()
    } catch (err) {
        console.error("Error check if user exists", err)
    }
}
const createNewUser = googleUser =>  {
    try {
        const { name, email, picture } = googleUser
        const user = { name, email, picture }
        return new User(user).save()
    } catch (err) {
        console.error("Error create new user", err)
    }
    
}