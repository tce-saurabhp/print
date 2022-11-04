const cheerio = require('cheerio');
const axios = require("axios");

const containerQuestionLink = 'https://tce-print.s3.ap-south-1.amazonaws.com/Print-Player/container-question.html';


const load = async () => {
    const { data } = await axios.get(containerQuestionLink);
    const $ = cheerio.load(data);
    console.log($);
}

load();