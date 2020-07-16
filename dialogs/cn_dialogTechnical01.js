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


const CN_DIALOG_TECHNICAL01 = 'CN_DIALOG_TECHNICAL01';//特殊流程联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_TEXT_QUESTION = 'PROMPT_TEXT_QUESTION';
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";

class CN_DialogTechnical01 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_TECHNICAL01);
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
        var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Technical01.db));
        var lowdb = low(adapter);
        var d = {
            "list":lowdb.get('db').value(),
            "lastrefreshdate":lowdb.get("lastRefresh.date").value(),
            "lastrefreshtime":lowdb.get("lastRefresh.time").value()
        };
        var template = new ACData.Template(Card.Technical01_AdaptiveHint);
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
                prompt: Hint.Technical01_promptQuestion,
                retryPrompt: Hint.Technical01_retryQuestion,
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
                    "id": "Technical01",
                    "desc": "咨询接口"
                };
                lowdb.get('questions')
                    .push(question)
                    .write();
                return true;
            }

        }
    }
}

module.exports.CN_DialogTechnical01 = CN_DialogTechnical01;
module.exports.CN_DIALOG_TECHNICAL01 = CN_DIALOG_TECHNICAL01;
