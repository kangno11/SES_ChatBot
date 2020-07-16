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

const CN_DIALOG_COMPONENT01 = 'CN_DIALOG_COMPONENT01';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
const PROMPT_TEXT_QUESTION = 'PROMPT_TEXT_QUESTION';

class CN_DialogComponent01 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_COMPONENT01);
        this.logger = logger;

        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_FEEDBACK));
        this.addDialog(new TextPrompt(PROMPT_TEXT_QUESTION, this.questionPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.queryDisplayStep.bind(this),
            this.queryConfirmationStep.bind(this),
            this.queryRecordStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }

    async queryDisplayStep(stepContext) {
        var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Component01.db));
        var lowdb = low(adapter);
        var d = {
            "link":lowdb.get('db').value()[0].link,
            "lastrefreshdate":lowdb.get("lastRefresh.date").value(),
            "lastrefreshtime":lowdb.get("lastRefresh.time").value()
        };
        var template = new ACData.Template(Card.Component01_AdaptiveOrigin);
        var card = template.expand({ $root: d });

        await stepContext.context.sendActivity(
            {
                attachments: [CardFactory.adaptiveCard(card)]
            });
        return await stepContext.prompt(PROMPT_CHOICE_FEEDBACK,
            {
                prompt: Hint.promptFeedback,
                choices: Menu.feedbackMenu
            }
        );
    }
   
    async queryConfirmationStep(stepContext) {
        if (stepContext.result.index === 0) {
            return await stepContext.endDialog({ index: 0 })
        }
        else { // not statisfied or no result
            return await stepContext.prompt(PROMPT_TEXT_QUESTION, {
                prompt: Hint.Component01_promptQuestion,
                retryPrompt: Hint.Component01_retryQuestion,
            });
        }
    }
    async queryRecordStep(stepContext) {
        await stepContext.context.sendActivity(Hint.messageQuestionRecord);
        return await stepContext.endDialog({ index: 1 });
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
                    "id": "Component01",
                    "desc": "进口件产地清单"
                };
                lowdb.get('questions')
                    .push(question)
                    .write();
                return true;
            }

        }
    }
}

module.exports.CN_DialogComponent01 = CN_DialogComponent01;
module.exports.CN_DIALOG_COMPONENT01 = CN_DIALOG_COMPONENT01;
