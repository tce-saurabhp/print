const puppeteer = require('puppeteer');

const containerQuestionLink = 'https://tce-print.s3.ap-south-1.amazonaws.com/Print-Player/container-question.html';

const json = {
    "question_grp": [
        {
            "instruction": "( Subjective Section A )",
            "questions": [
                "qhtml/html2.html?rand=02"
            ]
        },
        {
            "instruction": "( Non-Subjective Section B )",
            "questions": [
                "qhtml/html1.html?rand=01",
                "qhtml/html3.html?rand=03",
                "qhtml/html4.html?rand=04",
                "qhtml/html5.html?rand=05",
                "qhtml/html6.html?rand=06",
                "qhtml/html7.html?rand=07",
                "qhtml/html8.html?rand=08",
                "qhtml/html9.html?rand=09"
            ]
        }
    ],
    "classes": "container-fluid quiz_print one-container lower-roman hide-intro hide-answers",
    "general_instructions": "<b>General Instructions</b><br><li>Answer on Plain Sheet</li><li>Number your answers correctly</li>",
    "duaration": "10",
    "marks": "30",
    "subject": "Biology",
    "grade": "Level 2",
    "title": "Parts of the body"
}

const load = async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://tce-print.s3.ap-south-1.amazonaws.com/Print-Player/container-question.html', { waitUntil: 'networkidle0' });
    const data = await page.evaluate((json) => {
        loadQuestions(json);
    }, json);
    console.log(data);
    await browser.close();
}

load();