import express from "express"
import axios from "axios"

const app = express()
app.use(express.static('public'))

const musicBrainzApiUrl = 'https://musicbrainz.org/ws/2'
const coverArtArchiveApiUrl = 'https://coverartarchive.org'


const queryArtist = (query) => {
    const url = `${musicBrainzApiUrl}/artist`
    const params = { query: query }
    const headers = { 
        Accept: 'application/json',
        'User-Agent': 'cover-art-finder/1.0.0 (DHarnett.dev@proton.me)'
    }

    // console.log(url)
    // console.log(params)
    // console.log(headers)

    return axios.get(url, { params: params, headers: headers })
}

const parseArtists = (result) => {
    const artists = []
    result.data.artists.forEach((artist) => {
        const nextArtist = {
            id: artist.id,
            name: artist.name,
            score: artist.score,
            country: artist.country,
            disambiguation: artist.disambiguation
        }
        artists.push(nextArtist)
    });
    return artists
}

getArtists('iron maiden')
    .then((result) => {
        console.log(parseArtists(result))}
    )
    .catch((error) => {console.log(error)})


// const getAlbumIds = (artistID) => {
//     const url = `${musicBrainzApiUrl}/release`
//     const params = {
//         artist: artistID,
//         type: 'album'
//     }
//     const headers = { 
//         Accept: 'application/json',
//         'User-Agent': 'cover-art-finder/1.0.0 (DHarnett.dev@proton.me)'
//      }
//     axios.get(url, { params: params, headers: headers })
//         .then((response) => {
//             const data = response.data
//             console.log(data)
//         })
//         .catch((error) => {
//             console.log('getAlbumIds failed')
//         })
// }


// const getCoverArtUrl = (albumId) => {
//     const url = `${coverArtArchiveApiUrl}/release/${albumId}`
// }


app.get('/', (req, res) => {
    res.render('index.ejs')
})

const port = 3000
app.listen(port, () => {
    console.log(`App running on port ${port}`)
})
