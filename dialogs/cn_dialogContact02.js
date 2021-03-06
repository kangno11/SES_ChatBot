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
const { CardFactory } = require('botbuilder');
const Hint = require('../config/cn_hint.json');
const Menu = require('../config/cn_menu.json');
const Card = require('../config/cn_card.json');
const Database = require('../config/cn_database.json');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
var _ = require('lodash');
var ACData = require("adaptivecards-templating");


const CN_DIALOG_CONTACT02 = 'CN_DIALOG_CONTACT02';//排产业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_QUERYMODE = 'PROMPT_CHOICE_QUERYMODE';
const PROMPT_TEXT_BRANCH = 'PROMPT_TEXT_BRANCH';
const PROMPT_CHOICE_REGION = 'PROMPT_CHOICE_REGION';
const PROMPT_CHOICE_QUERYAGAIN = "PROMPT_CHOICE_QUERYAGAIN";
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
const PROMPT_TEXT_QUESTION = 'PROMPT_TEXT_QUESTION';
//const NUMBER_PROMPT = 'NUMBER_PROMPT';

class CN_DialogContact02 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_CONTACT02);
        this.logger = logger;

        //this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_QUERYMODE));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_REGION, this.regionPromptValidator));
        this.addDialog(new TextPrompt(PROMPT_TEXT_BRANCH, this.branchPromptValidator));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_QUERYAGAIN));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_FEEDBACK));
        this.addDialog(new TextPrompt(PROMPT_TEXT_QUESTION, this.questionPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.queryModeStep.bind(this),
            this.queryDatabaseStep.bind(this),
            this.queryDisplayStep.bind(this),
            this.queryAgainStep.bind(this),
            this.queryConfirmationStep.bind(this),
            this.queryRecordStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }
    async queryModeStep(stepContext) {
        return await stepContext.prompt(PROMPT_CHOICE_QUERYMODE, {
            prompt: Hint.promptQueryMode,
            retryPrompt: Hint.retryChoice,
            choices: Menu.Contact02_QueryMode
        });
    }

    async queryDatabaseStep(stepContext) {
        stepContext.values.queryMode = stepContext.result;
        switch (stepContext.result.index) {
            case 0: //查询区域主管
                var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Contact02.db));
                var lowdb = low(adapter);
                return await stepContext.prompt(PROMPT_CHOICE_REGION, {
                    prompt: Hint.Contact02_SelectRegion,
                    retryPrompt: Hint.retryChoice,
                    choices: lowdb.get('db').map('region').value()
                });
            case 1://查询分公司工程师
                return await stepContext.prompt(PROMPT_TEXT_BRANCH, {
                    prompt: Hint.Contact02_SelectBranch
                });
        }
    }
    async queryDisplayStep(stepContext) {

        switch (stepContext.values.queryMode.index) {
            case 0://查询区域主管
                var d = stepContext.result;
                var template = new ACData.Template(Card.Contact02_AdaptiveRegion);
                var card = template.expand({ $root: d });

                await stepContext.context.sendActivity(
                    {
                        attachments: [CardFactory.adaptiveCard(card)]
                    });
                break;
            case 1://查询分公司工程师
                var d = stepContext.result;
                var template = new ACData.Template(Card.Contact02_AdaptiveBranch);
                var card = template.expand({ $root: d });

                await stepContext.context.sendActivity(
                    {
                        attachments: [CardFactory.adaptiveCard(card)]
                    });
                break;
        }


        return await stepContext.prompt(PROMPT_CHOICE_QUERYAGAIN,
            {
                prompt: Hint.promptQueryAgain,
                choices: Menu.queryAgainMenu
            }
        );
    }
    async queryAgainStep(stepContext) {
        switch (stepContext.result.index) {
            case 0:
                return await stepContext.replaceDialog(this.initialDialogId);
            case 1:
                return await stepContext.prompt(PROMPT_CHOICE_FEEDBACK,
                    {
                        prompt: Hint.promptFeedback,
                        choices: Menu.feedbackMenu
                    }
                );
        }
    }
    async queryConfirmationStep(stepContext) {
        //console.log(stepContext.result);
        if (stepContext.result.index === 0) {
            return await stepContext.endDialog({ index: 0 })
        }
        else { // not statisfied or no result
            return await stepContext.prompt(PROMPT_TEXT_QUESTION, {
                prompt: Hint.Contact02_promptQuestion,
                retryPrompt: Hint.Contact02_retryQuestion,
            });
        }
    }
    async queryRecordStep(stepContext) {
        await stepContext.context.sendActivity(Hint.messageQuestionRecord);
        return await stepContext.endDialog({ index: 1 });
    }


    async branchPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value;
            k = _.trim(k);
            k = _.toUpper(k);
            if (_.size(k) < 2) {
                await promptContext.context.sendActivity(Hint.Contact02_ValidBranch);
                return false;
            }
            var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Contact02.db));
            var lowdb = low(adapter);
            var d = lowdb.get('db')
                .map("branches")
                .flattenDepth(1)
                .find(function (o) {
                    return (_.isEqual(_.toUpper(o.branchCode), k) || _.includes(_.toUpper(o.branch), k));
                })
                .value();
            if (d) {
                promptContext.recognized.value = d;
                promptContext.recognized.value.lastrefreshdate = lowdb.get("lastRefresh.date").value();
                promptContext.recognized.value.lastrefreshtime = lowdb.get("lastRefresh.time").value();
                return true;
            }
            else {
                await promptContext.context.sendActivity(Hint.messageQueryFailure);
            }
        }
    }

    async regionPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value.value;
            var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Contact02.db));
            var lowdb = low(adapter);
            var d = lowdb.get('db').find({ region: k }).value();
            if (d) {
                promptContext.recognized.value = d;
                promptContext.recognized.value.lastrefreshdate = lowdb.get("lastRefresh.date").value();
                promptContext.recognized.value.lastrefreshtime = lowdb.get("lastRefresh.time").value();
                return true;
            }
        }
    }
    async questionPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value;
            k = _.trim(k);
            if (_.size(k) >= 5) {
                //保存问题到问题数据库
                var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Admin02.db));
                var lowdb = low(adapter);
                var d = new Date();
                lowdb.defaults({ questions: [], lastExtract: {}, countExtract: 0 })
                    .write();
                var question = {
                    "user": promptContext.context.activity.from.name,
                    "date": d.toLocaleDateString(),
                    "time": d.toLocaleTimeString(),
                    "question": k,
                    "id": "Contact02",
                    "desc": "排产业务客服联系人"
                };
                lowdb.get('questions')
                    .push(question)
                    .write();
                return true;
            }

        }
    }
}

module.exports.CN_DialogContact02 = CN_DialogContact02;
module.exports.CN_DIALOG_CONTACT02 = CN_DIALOG_CONTACT02;
