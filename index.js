const chromium = require('chrome-aws-lambda');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "ap-south-1" });
const url = require('url');

const sourceBucketName = 'tce-predev-s3-bkt';
const destinationBucketName = 'tce-predev-s3-bkt';

const QUESTION_CLASSES = "container-fluid quiz_print one-container lower-roman hide-intro hide-answers";

const SOLUTION_CLASSES = "container-fluid quiz_print one-container lower-roman hide-intro answers";

const options = {
    printBackground: true,
    format: 'A4',
    //format: "Letter",
    margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px"
    },
};

exports.handler = async (event) => {
    const questionJson = JSON.parse(JSON.stringify(event)); //Create deep copy
    questionJson["classes"] = QUESTION_CLASSES;
    //console.log(Object.keys(questionJson));

    const solutionJson = JSON.parse(JSON.stringify(event)); //Create deep copy
    solutionJson["classes"] = SOLUTION_CLASSES;

    var questionIds = questionJson['questionIds'];
    const userId = questionJson['userId'];
    const assignmentId = questionJson['assignmentId'];

    console.log(`userId ${userId}, assignmentId ${assignmentId}`);

    //Download html files for each question in parallel and save it in /tmp/ folder
    const promiseArray = [];
    for (let i = 0; i < questionIds.length; i++) {
        promiseArray.push(downloadAndSaveHtml(questionIds[i]));
    }
    await Promise.all(promiseArray);

    const browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });

    const prefix = extractUserIdPath(userId, assignmentId);
    const questionPdfFileName = prefix + "/" + assignmentId + "-question.pdf";
    const solutionPdfFileName = prefix + "/" + assignmentId + "-solution.pdf";

    //Create question and solution pdf parallely
    await Promise.all([createAndUploadPdf(browser, questionJson, questionPdfFileName),
    createAndUploadPdf(browser, solutionJson, solutionPdfFileName)
    ]);

    const questionResource = new ContentResourceVO("pdf", "question", questionPdfFileName, 0);
    const solutionResource = new ContentResourceVO("pdf", "solution", solutionPdfFileName, 0);

    await browser.close();
    return [questionResource, solutionResource];
};

/**
 * Pass the json to container-html and get merged html.
 * Convert the merged html to pdf
 */
async function createAndUploadPdf(browser, json, pdfFileName) {
    const htmlUrl = url.pathToFileURL(`${path.join(__dirname, 'container-question.html')}`).href;
    var page = await browser.newPage();
    await page.goto(htmlUrl, { waitUntil: 'networkidle0' });
    var mergedHtml = await page.evaluate(async (json) => {
        loadQuestions(json);
        return document.querySelector('*').outerHTML;
    }, json);
    //await upload("merged.html", destination, mergedHtml, 'text/html');

    await page.setContent(mergedHtml, {
        waitUntil: 'networkidle0'
    });
    const pdf = await page.pdf(options);
    await upload(pdfFileName, destinationBucketName, pdf, 'application/pdf');
}

/**
 * Download html file for the question and save it locally to /tmp/ folder
 */
async function downloadAndSaveHtml(questionId) {
    let s3Path = extractQuestionPath(questionId);
    const path = `/tmp/${questionId}.html`;
    if (!fs.existsSync(path)) {
        //Don't download if file already exists in /tmp/ folder
        console.log("Downloading " + path);
        //file exists
        const data = await s3.send(
            new GetObjectCommand({
                Key: s3Path,
                Bucket: sourceBucketName,
            })
        );
        fs.writeFileSync(path, await data.Body.transformToString());
    }
}

class ContentResourceVO {
    constructor(fileType, type, filename, order) {
        this.fileType = fileType;
        this.type = type;
        this.filename = filename;
        this.order = order;
    }
}

/**
 * Extract the destination path for storing the pdf 
 */
function extractUserIdPath(userId, assignmentId) {
    let path = "activity/usr/";
    let parts = userId.split("-");
    //Skip the first part, as it is = usr
    for (let i = 1; i < parts.length; i++) {
        //Get the first letter from splitted userId
        path = path + parts[i].charAt(0) + '/';
    }
    return path + userId + "/print/" + assignmentId;
}

/**
 * Extract the S3 path for questionId.html
 */
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

async function upload(outputFileName, destination, body, contentType) {
    let uploadParams = {
        Key: outputFileName,
        Body: body,
        Bucket: destination,
        contentType: contentType
    };
    return await s3.send(new PutObjectCommand(uploadParams));
}
