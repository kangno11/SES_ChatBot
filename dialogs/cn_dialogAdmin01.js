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
const Card = require('../config/cn_card.json');
const Database = require('../config/cn_database.json');
const path = require('path');
const request = require('request');
const csv = require('csv');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
var _ = require('lodash');
var ACData = require("adaptivecards-templating");

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
        _.forEach(stepContext.result, function (value) {
            var db = new Array();
            request(value.contentUrl)
                .pipe(csv.parse({ delimiter: ',', ltrim: true, from: 2 }))
                .pipe(csv.transform(function (line) {
                    switch (value.id) {
                        case 'Contact01': //Tender/VO 业务联系人
                        case 'Contact02': //Order 业务联系人
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
                            break;
                        case 'Contact03':
                            db = _.concat(db, {
                                id: line[0],
                                question: line[1],
                                answer: line[2]
                            }
                            );
                            break;
                        case 'Project01':
                            var cscindex = _.findIndex(db, { csc_id: line[1], nps_version: line[2] });
                            if (cscindex === -1) {
                                db = _.concat(db, {
                                    csc_id: line[1],
                                    nps_version: line[2],
                                    kss_engineer: line[7],
                                    project_name: line[10],
                                    kss_name: line[54],
                                    fl_sending_date: line[55],
                                    kss_estimated_date: line[57]
                                });
                            }
                            break;
                        case 'Project02':
                            var projectindex = _.findIndex(db, { project_number: line[3] });
                            if (projectindex === -1) {
                                db = _.concat(db, {
                                    project_number: line[3],
                                    ss_engineer: line[0],
                                    fl_code: line[1],
                                    status: line[8],
                                    fl_sending_date: line[9]
                                });
                            }
                            break;
                        case 'Project03':
                            var projectindex = _.findIndex(db, { project_number: line[3] });
                            if (projectindex === -1) {
                                db = _.concat(db, {
                                    project_number: line[3],
                                    ss_engineer: line[0],
                                    fl_code: line[1],
                                    project_name: line[4],
                                    status: line[9],
                                    fl_sending_date: line[10],
                                    estimated_finish_date: line[14]
                                });
                            }
                            break;
                        case 'Price01':
                            db = _.concat(db, {
                                document_name: line[1],
                                document_version: line[2],
                                document_number: line[3],
                                release_date: line[4],
                                dl_version: line[5],
                                link: line[6],
                                choice_name: line[3]+'-'+line[1]
                            }
                            );
                            break;
                        case 'Component01': //进口件产地
                            db = _.concat(db, {
                                id: line[0],
                                name: line[1],
                                link: line[2]
                            });

                            break;
                        case 'Technical01':
                            db = _.concat(db, {
                                id: line[0],
                                hint: line[1]
                            }
                            );
                            break;

                    }

                }))
                .on('finish', function () {
                    try {
                        var adapter = new FileSync(
                            path.resolve(__dirname, "../db/" + value.db));
                        var lowdb = low(adapter);
                        var d = new Date();
                        lowdb.defaults({ db: [], lastRefresh: {}, countRefresh: 0 })
                            .write();
                        lowdb.set('lastRefresh.user', lastrefreshuser)
                            .write();
                        lowdb.set('lastRefresh.date', d.toLocaleDateString())
                            .write();
                        lowdb.set('lastRefresh.time', d.toLocaleTimeString())
                            .write();
                        lowdb.update('countRefresh', n => n + 1)
                            .write();
                        lowdb.set('db', db)
                            .write();
                        console.log('Database Completed Successfully');
                    }
                    catch (e) {
                        console.log(e);
                    }
                });
        }
        );


        await stepContext.context.sendActivity(Hint.messageLoadDBSuccess);
        return await stepContext.endDialog({ index: 2 });
    }

    async dbPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var message = "";
            _.forEach(promptContext.recognized.value, function (value) {
                var dbinfo = _.find(Database, { 'csv': value.name });
                if (dbinfo) {
                    value.db = dbinfo.db;
                    value.id = dbinfo.id;
                    value.delete = false;
                    //_.concat(message,value.name + Hint.messageCorrectFileName);
                    message += value.name + Hint.messageCorrectFileName;
                }
                else {
                    value.delete = true;
                    //_.concat(message,value.name + Hint.messageIncorrectFileName);
                    message += value.name + Hint.messageIncorrectFileName;
                }

            });
            //var template = new ACData.Template(Card.Admin01_AdaptiveAttachment);
            //var card = template.expand({ $root:message});
            //await promptContext.context.sendActivity(
            //    {
            //        attachments: [CardFactory.adaptiveCard(card)]
            //    });
            await promptContext.context.sendActivity(message);

            _.remove(promptContext.recognized.value, function (o) {
                return o.delete;
            });
            if (_.size(promptContext.recognized.value) !== 0) {
                return true;
            }
            else {
                await promptContext.context.sendActivity(Hint.messageLoadDBRetry);
            }
        }

    }






}

module.exports.CN_DialogAdmin01 = CN_DialogAdmin01;
module.exports.CN_DIALOG_ADMIN01 = CN_DIALOG_ADMIN01;
