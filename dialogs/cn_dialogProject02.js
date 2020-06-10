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


const CN_DIALOG_PROJECT02 = 'CN_DIALOG_PROJECT02';//国内排产项目
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_TEXT_PROJECT = 'PROMPT_TEXT_PROJECT';
const PROMPT_TEXT_QUESTION = 'PROMPT_TEXT_QUESTION';
const PROMPT_CHOICE_QUERYAGAIN = "PROMPT_CHOICE_QUERYAGAIN";
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
//const NUMBER_PROMPT = 'NUMBER_PROMPT';

class CN_DialogProject02 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_PROJECT02);
        this.logger = logger;

        this.addDialog(new TextPrompt(PROMPT_TEXT_PROJECT, this.projectPromptValidator));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_QUERYAGAIN));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_FEEDBACK));
        this.addDialog(new TextPrompt(PROMPT_TEXT_QUESTION, this.questionPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.queryDatabaseStep.bind(this),
            this.queryDisplayStep.bind(this),
            this.queryAgainStep.bind(this),
            this.queryConfirmationStep.bind(this),
            this.queryRecordStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }
    async queryDatabaseStep(stepContext) {
        return await stepContext.prompt(PROMPT_TEXT_PROJECT, {
            prompt: Hint.Project02_SelectProject
        });
    }
    async queryDisplayStep(stepContext) {
        if (stepContext.result) {
            var d = stepContext.result;
            var template = new ACData.Template(Card.Project02_AdaptiveProject);
            var card = template.expand({ $root: d });
            await stepContext.context.sendActivity(
                {
                    attachments: [CardFactory.adaptiveCard(card)]
                });
            return await stepContext.prompt(PROMPT_CHOICE_QUERYAGAIN,
                {
                    prompt: Hint.promptQueryAgain,
                    choices: Menu.queryAgainMenu
                }
            );
        }
        else {
            return await stepContext.next({ index: 2 });
        }

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
            case 2:
                return await stepContext.next({ index: 2 });//no result
        }
    }
    async queryConfirmationStep(stepContext) {
        if (stepContext.result.index === 0) {
            return await stepContext.endDialog({ index: 0 })
        }
        else { // not statisfied or no result
            return await stepContext.prompt(PROMPT_TEXT_QUESTION, {
                prompt: Hint.Project02_promptQuestion,
                retryPrompt: Hint.Project02_retryQuestion,
            });
        }
    }
    async queryRecordStep(stepContext) {
        await stepContext.context.sendActivity(Hint.messageQuestionRecord);
        return await stepContext.endDialog({ index: 1 });
    }




    async projectPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {

            var k = promptContext.recognized.value;
            k = _.trim(k);
            if (_.size(k) < 7) {
                await promptContext.context.sendActivity(Hint.Project02_ValidProject);
                return false;
            }
            var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Project02.db));
            var lowdb = low(adapter);
            var d = lowdb.get('db')
                .find(function (o) {
                    return (_.includes(_.toUpper(o.project_number), _.toUpper(k)));
                })
                .value();
            if (d) {
                promptContext.recognized.value = d;
                promptContext.recognized.value.lastrefreshdate = lowdb.get("lastRefresh.date").value();
                promptContext.recognized.value.lastrefreshtime = lowdb.get("lastRefresh.time").value();
                return true;
            }
            else {
                if (promptContext.state.attemptCount >= 3) {
                    await promptContext.context.sendActivity(Hint.messageOverTry);
                    await promptContext.context.sendActivity(Hint.messageContactBranch);
                    promptContext.recognized.value = false; //没有找到
                    return true;
                }
                else {
                    await promptContext.context.sendActivity(Hint.messageQueryFailure);
                }
            }
        }
    }
    async questionPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value;
            k = _.trim(k);
            if (_.size(k) >= 7) {
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
                    "id": "Project02",
                    "desc": "国内排产项目"
                };
                lowdb.get('questions')
                    .push(question)
                    .write();
                return true;
            }

        }
    }
}
module.exports.CN_DialogProject02 = CN_DialogProject02;
module.exports.CN_DIALOG_PROJECT02 = CN_DIALOG_PROJECT02;
