// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ComponentDialog,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog,
    ChoicePrompt,
    ChoiceFactory,
    ConfirmPrompt,
    AttachmentPrompt
} = require('botbuilder-dialogs');
const { CardFactory, TurnContext } = require('botbuilder');
const Hint = require('../config/cn_hint.json');
const Menu = require('../config/cn_menu.json');
const Database = require('../config/cn_database.json');;
var fs = require('fs');
var path = require('path');
var request = require('request');
var csv = require('csv');
var request = require('request');
var async = require('async');
var _ = require('lodash');

var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');


const CN_DIALOG_ADMIN01 = 'CN_DIALOG_ADMIN01';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_ATTACHMENT_DATABASE = 'PROMPT_ATTACHMENT_DATABASE';


class CN_DialogAdmin01 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_ADMIN01);
        this.logger = logger;


        this.addDialog(new AttachmentPrompt(PROMPT_ATTACHMENT_DATABASE, this.dbPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.attachmentStep.bind(this),
            this.loadDBStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }


    async attachmentStep(stepContext) {


        // Ask the user to enter their age.
        return await stepContext.prompt(PROMPT_ATTACHMENT_DATABASE, {
            prompt: Hint.promptDatabase,
            retryPrompt: Hint.retryDatabase
        });
    }
    async loadDBStep(stepContext) {
        var lastrefreshuser = stepContext.context.activity.from.name;
        var db = new Array();
        request(stepContext.result[0].contentUrl)
            .pipe(csv.parse({ delimiter: ',', ltrim: true, from: 2 }))
            .pipe(csv.transform(function (line) {

                var regionindex = _.findIndex(db, { region: line[0] });
                if (regionindex === -1) {
                    db = _.concat(db, {
                        region: line[0],
                        super: line[9],
                        superPhone: line[10],
                        superMail: line[11],
                        branches: [
                            {
                                branch: line[1],
                                branchCode: line[2],
                                engineer: line[3],
                                engineerPhone: line[4],
                                engineerMail: line[5],
                                backup: line[6],
                                backupPhone: line[7],
                                backupMail: line[8]
                            }
                        ]
                    });
                }
                else {
                    db[regionindex].branches = _.concat(db[regionindex].branches,
                        {
                            branch: line[1],
                            branchCode: line[2],
                            engineer: line[3],
                            engineerPhone: line[4],
                            engineerMail: line[5],
                            backup: line[6],
                            backupPhone: line[7],
                            backupMail: line[8]
                        }
                    );
                }
            }))
            //.pipe(csv.stringify({ quoted: true }))
            //.pipe(fs.createWriteStream(path.resolve(__dirname, "../csv/" + Database.Contact01.csv)))
            .on('finish', function () {
                try {
                    var adapter = new FileSync(path.resolve(__dirname, "../db/" + stepContext.result[0].db));
                    var lowdb = low(adapter);
                    var d = new Date();
                    lowdb.defaults({ db: [], lastRefresh: {}, countRefresh: 0 })
                        .write();

                    lowdb.set('lastRefresh.user', lastrefreshuser)//稍后处理
                        .write();
                    lowdb.set('lastRefresh.date', d.toLocaleDateString())
                        .write();
                    lowdb.set('lastRefresh.time', d.toLocaleTimeString())
                        .write();
                    lowdb.update('countRefresh', n => n + 1)
                        .write();
                    //console.log(JSON.stringify(db[0]));
                    lowdb.set('db', db)
                        .write();

                    console.log('Database Completed Successfully');
                }
                catch (e) {
                    console.log(e);
                }
            })
            ;
            

        await stepContext.context.sendActivity(Hint.messageLoadDBSuccess);
        return await stepContext.endDialog({ index: 2 });
    }

    async dbPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded && promptContext.recognized.value[0].contentType === "text/csv") {
            var dbinfo = _.find(Database, { 'csv': promptContext.recognized.value[0].name });
            if (dbinfo) {
                promptContext.recognized.value[0].db = dbinfo.db;
                return true;
            }
            else {
                promptContext.context.sendActivity(Hint.messageIncorrectFileName);
            }
        }

    }






}

module.exports.CN_DialogAdmin01 = CN_DialogAdmin01;
module.exports.CN_DIALOG_ADMIN01 = CN_DIALOG_ADMIN01;
