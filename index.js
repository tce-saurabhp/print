const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const load = async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    //await page.goto(`file:${path.join(__dirname, 'test.html')}`);
    await page.goto(`file:${path.join(__dirname, 'container-question.html')}`, { waitUntil: 'networkidle0' });
    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${i}: ${msg.args()[i]}`);
    });
    //Dont use Node variables in Puppeteer
    //Use exposeFunction to expose Node function to Puppeteer
    const data = await page.evaluate(async () => {
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
            "subject": "Maths",
            "grade": "Level 2",
            "title": "Parts of the body"
        }
        loadQuestions(json);
        return document.querySelector('*').outerHTML
    });
    
    fs.writeFileSync('test.html', data);
    await browser.close();
}

load();