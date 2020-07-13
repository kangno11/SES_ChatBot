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

const CN_DIALOG_COMPONENT03 = 'CN_DIALOG_COMPONENT03';
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_COMPONENT = 'PROMPT_CHOICE_COMPONENT';
const PROMPT_CHOICE_QUERYAGAIN = "PROMPT_CHOICE_QUERYAGAIN";
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
const PROMPT_TEXT_QUESTION = 'PROMPT_TEXT_QUESTION';

class CN_DialogComponent03 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_COMPONENT03);
        this.logger = logger;

        //this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_COMPONENT, this.componentPromptValidator));
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
        var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Component03.db));
        var lowdb = low(adapter);
        return await stepContext.prompt(PROMPT_CHOICE_COMPONENT, {
            prompt: Hint.Component03_SelectComponent,
            retryPrompt: Hint.retryChoice,
            choices: lowdb.get('db').map('component').value()
        });

    }
    async queryDisplayStep(stepContext) {
        var d = stepContext.result;
        var template = new ACData.Template(Card.Component03_AdaptiveComponent);
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
                prompt: Hint.Component03_promptQuestion,
                retryPrompt: Hint.Component03_retryQuestion,
            });
        }
    }
    async queryRecordStep(stepContext) {
        await stepContext.context.sendActivity(Hint.messageQuestionRecord);
        return await stepContext.endDialog({ index: 1 });
    }




    async componentPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var c = promptContext.recognized.value.value;
            var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Component03.db));
            var lowdb = low(adapter);
            var d = lowdb.get('db').filter({ component: c }).value();
            if (d.length>0) {
                promptContext.recognized.value = {"details":d[0].details};
                promptContext.recognized.value.component = c;
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
                    "id": "Component03",
                    "desc": "机械进口件清单"
                };
                lowdb.get('questions')
                    .push(question)
                    .write();
                return true;
            }

        }
    }
}

module.exports.CN_DialogComponent03 = CN_DialogComponent03;
module.exports.CN_DIALOG_COMPONENT03 = CN_DIALOG_COMPONENT03;
