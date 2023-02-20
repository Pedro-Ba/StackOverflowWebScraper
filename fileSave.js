const fs = require("fs");

module.exports = {sendToWrite};

const QUESTION_PATH = './questions.csv'
const QUESTION_TAGS_PATH = './questionTags.csv'

const questionWriteStream = fs.createWriteStream(QUESTION_PATH, { 'flags': 'a' });
const questionTagWriteStream = fs.createWriteStream(QUESTION_TAGS_PATH, { 'flags': 'a' });

async function writeQuestionToCSV(cleanInput){
    questionWriteStream.write(cleanInput);
    return;
}

async function writeQuestionTagsToCSV(cleanInput){
    questionTagWriteStream.write(cleanInput);
    return;
}

async function sendToWrite(questionObject){
    let questionInputString = (
        questionObject.id + ',' +
        questionObject.creation_date + ',' + 
        questionObject.score + ',' + 
        questionObject.views + '\n'
    );
    let questionTagInputString = '';
    for(const tag of questionObject.tags){
        questionTagInputString += questionObject.id + ',' + 
        tag + '\n'
    }
    await writeQuestionToCSV(questionInputString);
    await writeQuestionTagsToCSV(questionTagInputString);
    return;
}