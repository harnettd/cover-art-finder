import express from "express"
import axios from "axios"

const app = express()
app.use(express.static('public'))

const port = 3000

app.get('/', (req, res) => {
    res.render('index.ejs')
})

app.listen(port, () => {
    console.log(`App running on port ${port}`)
})
