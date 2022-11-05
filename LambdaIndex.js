const chromium = require('chrome-aws-lambda');
const aws = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const s3 = new aws.S3();

const sourceBucketName = 'tce-predev-s3-bkt';

const questionIds = [
    "tqqb-cb6fd562-1e63-478d-822e-e62e522e002f",
    "tqqb-e16d3e03-0d12-40e6-94d6-47b221fb5729",
    "tqqb-259d7bd5-dffc-49ff-8eba-37f556f5a585",
    "tqqb-2ed80696-966f-43b1-810a-9c5bd502cb4f",
    "tqqb-63841eba-5d71-4106-a017-8a8b46de5df3",
    "tqqb-211dd728-3d47-49ec-81e3-2b710f41897d",
    "tqqb-7d218cfe-2c3d-4e05-be96-fc148d396bc3",
    "tqqb-412a58b2-c41c-42b4-9f50-5b7da2166ae1",
    "tqqb-60a67806-dd26-4171-b004-dba1db4d7a9e",
    "tqqb-b716b873-6c59-41d2-ae7a-2686510b1171",
    "tqqb-cea5e982-ab7e-4359-86a3-d31a8a6bd069",
    "tqqb-ea220128-6bed-48d8-9ff5-ffb70315fc4d",
    "tqqb-fa0bc849-068a-4639-b3f7-1d46f39a246d",
    "tqqb-68f70c60-38e3-499b-92d6-f35ca315f5f2",
    "tqqb-84f27b6e-d2e1-4110-a7cf-d884844adc99",
    "tqqb-bcb39b40-d0ed-4ad2-885b-95b700d91195",
    "tqqb-fde3802c-c91e-42b9-bca2-06968659f841",
    "tqqb-e2ae8d62-b5a0-4ffb-a180-0f1d37ef9a55"
];

exports.handler = async (event) => {
    // const printRequestVo = JSON.parse(JSON.stringify(event.body));
    // console.log(Object.keys(printRequestVo));
    // const questionIds = printRequestVo['questionIds'];
    // console.log(questionIds[0]);

    for (let i = 0; i < questionIds.length; i++) {
        let path = extractQuestionPath(questionIds[i]);
        const location = `/tmp/${questionIds[i]}.html`;
        const params = {
            Bucket: sourceBucketName,
            Key: path,
        };
        const { Body } = await s3.getObject(params).promise();
        await fs.writeFileSync(location, Body);
    }

    const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.goto(`file:${path.join(__dirname, 'container-question.html')}`, { waitUntil: 'networkidle0' });

    const data = await page.evaluate(async () => {
        const json = {
            "question_grp": [{
                    "instruction": "( Subjective Section A )",
                    "questions": [
                        "/tmp/tqqb-e16d3e03-0d12-40e6-94d6-47b221fb5729.html?rand=02"
                    ]
                },
                {
                    "instruction": "( Non-Subjective Section B )",
                    "questions": [
                        "/tmp/tqqb-e2ae8d62-b5a0-4ffb-a180-0f1d37ef9a55.html?rand=01",
                        "/tmp/tqqb-cea5e982-ab7e-4359-86a3-d31a8a6bd069.html?rand=03"
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
        };
        loadQuestions(json);
        return document.querySelector('*').outerHTML;
    });

    //TODO Set our html String here
    page.setContent(data);
    const options = await page.pdf({
        printBackground: true,
        format: 'A4',
        //format: "Letter",
        margin: {
            top: "20px",
            bottom: "40px",
            left: "20px",
            right: "20px"
        },
    });
    const pdf = await page.pdf(options);

    await browser.close();

    const response = {
        headers: {
            'Content-type': 'application/pdf',
        },
        statusCode: 200,
        body: pdf.toString('base64'),
        isBase64Encoded: true
    };
    return response;
};

function extractQuestionPath(questionId) {
    let path = "content/tqqb/";
    const parts = questionId.split("-");
    //Skip the first part, as it is = tqqb
    for (let i = 1; i < parts.length; i++) {
        //Get the first letter from each questionId
        path = path + parts[i].charAt(0) + '/';
    }
    return path + questionId + "/print.html";
}

const json = {
    "question_grp": [{
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
};
