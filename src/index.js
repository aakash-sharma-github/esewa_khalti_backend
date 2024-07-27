import { app } from "./app.js";
import connectDB from "./db/database.js";


const appPort = process.env.PORT || 3000

connectDB().then(() => {
    app.on("Database error", (error) => {
        console.log(`Express error: ${error}`)
    })
    app.listen(appPort, () => {
        console.log(`Server is running on port: ${appPort}`)
    })
}).catch((error) => {
    console.error(`Server connection failed: ${error}`)
})
