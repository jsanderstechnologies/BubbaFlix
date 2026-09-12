const axios = require('axios');
axios.get('https://api.themoviedb.org/3/search/movie?api_key=8d6d91941230817f7807d643736e8a49&query=The+Fifth+Element').then(res => {
    const movie = res.data.results[0];
    console.log("Language:", movie.original_language);
    console.log("Country:", movie.origin_country);
}).catch(console.error);
