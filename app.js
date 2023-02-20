const HTMLParser = require('node-html-parser');

const fileSave = require('./fileSave.js')

const headers = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
};

async function getHTML(url) {
    return fetch(url, {
        method: "GET",
        headers,
    }).then(response => response.text().then(html => HTMLParser.parse(html)));
}

async function getEachIndividualQuestionElement(questions) {
    let Ids = [];
    for (const q of questions) {
        if (q.rawAttrs) {
            let string = q.rawAttrs;
            let qid = string.match(/question-summary-\d*/);
            Ids.push(qid[0]);
        }
    }
    return Ids;
}

async function getEachStats(Ids, root) {
    let stats = [];
    for (const id of Ids) {
        let question = root.getElementById(id);
        let children = question.childNodes;
        for (const child of children) {
            if (child.rawAttrs == 'class="s-post-summary--stats js-post-summary-stats"') { //dirty, doesn't matter? better if find by class
                stats.push(child);
            }
        }
    }
    return stats;
}

async function getEachContents(Ids, root) {
    let contents = [];
    for (const id of Ids) {
        let question = root.getElementById(id);
        let children = question.childNodes;
        for (const child of children) {
            if (child.rawAttrs == 'class="s-post-summary--content"') {//same thing
                contents.push(child);
            }
        }
    }
    return contents;
}

async function getTags(contents) {
    let tags = [];
    for (const content of contents) {
        let children = content.childNodes;
        let grandkids = children.find(val => val.rawAttrs == 'class="s-post-summary--meta"').childNodes; 
        let tagsClass = grandkids.find(val => {
            if (val.rawAttrs) { //the only one with raw attrs is the tags one, no need to match.
                // val.rawAttrs.match(/class="s-post-summary--meta-tags tags.*/)
                return true;
            }
        });
        let tagsList = tagsClass.childNodes.find(val => val.rawAttrs == "class='ml0 list-ls-none js-post-tag-list-wrapper d-inline'").childNodes;
        let questionTags = [];
        for (const tag of tagsList) {
            let actualTagList = tag.childNodes;
            for (const item of actualTagList) {
                questionTags.push(item.childNodes[0]._rawText);
            }
        }
        tags.push(questionTags);
    }
    return tags;
}

async function getStuff(stats) {//please rename this lol
    let stuff = [];
    for (const stat of stats) {
        let sav = [];
        let children = stat.childNodes;
        for (const child of children) {
            if (child.rawAttrs) {
                sav.push(child.rawAttrs);
            }
        }
        stuff.push(sav);
    }
    return await cleanStuff(stuff);
}

async function cleanStuff(stuff) {
    let cleanStuff = [];
    for (const i in stuff) {
        let individualClean = [];
        for (const j in stuff[i]) {
            individualClean.push(stuff[i][j].match(/title=".*"/)[0])
        }
        cleanStuff.push(individualClean);
    }
    return cleanStuff;
}



async function getTime(contents) {
    let times = [];
    for (const content of contents) {
        let children = content.childNodes;
        let grandkids = children.find(val => val.rawAttrs == 'class="s-post-summary--meta"').childNodes;
        let userCard = grandkids.find(val => val.rawAttrs == 'class="s-user-card s-user-card__minimal"').childNodes;
        let timeClass = userCard.find(val => val.rawAttrs == 'class="s-user-card--time"').childNodes;
        let time = timeClass.find(val => {
            let string = val.rawAttrs;
            if (string) {
                return true;
            }
        })
        if (time) {
            let firstCleanTime = time.rawAttrs.match(/title='.*Z'/)[0];
            let secondCleanTime = firstCleanTime.match(/'.*'/)[0];
            times.push(secondCleanTime);
        }
        else {
            times.push('Post is community owned so time is not available.');
        }
    }
    return times;
}

async function cleanId(id) {
    let numbers = id.match(/\d+/);
    return numbers[0];
}

async function cleanStats(stat) {
    let score = stat[0].match(/\d+/);
    // let answers = stat[1].match(/\d+/); //might give none so commented out
    let views = stat[2].match(/\d+/);
    let stats = {
        'score': score,
        'views': views
    }
    return stats;
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

async function main() {
    const urlBase = new URL("https://stackoverflow.com/questions?tab=newest&page=");
    for (page = 8100; page < 470000; page++) {
        if(page%5 == 0){
            await sleep(2000);
        }
        console.log('Getting page ' + page);
        let url = urlBase + page;
        let root = await getHTML(url);
        if(!root.getElementById('questions')){
            await sleep(960000);
            root = await getHTML(url);
        }
        let questions = root.getElementById('questions').childNodes;
        let ids = await getEachIndividualQuestionElement(questions);
        let stats = await getEachStats(ids, root);
        let contents = await getEachContents(ids, root);
        //these are the actual values, everything above is just DOM/HTML.
        let tags = await getTags(contents);
        let time = await getTime(contents);
        let stuff = await getStuff(stats);
        //everything is correct up until here. Now we need to cleanse data, and throw it into CSV. One thing at a time, now!
        // console.log(ids.length);
        for (i = 0; i < ids.length; i++) {
            let cleansedId = await cleanId(ids[i]);
            //time is already cleansed because I did things confusingly
            let cleansedStats = await cleanStats(stuff[i]);
            let questionObject = {
                'id': cleansedId,
                'creation_date': time[i],
                'views': cleansedStats.views,
                'score': cleansedStats.score,
                'tags': tags[i]
            }

            await fileSave.sendToWrite(questionObject);
        }
    }
}

main();