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

const CN_DIALOG_PRICE01 = 'CN_DIALOG_PRICE01';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_DOCUMENT = 'PROMPT_CHOICE_DOCUMENT';
const PROMPT_CHOICE_QUERYAGAIN = "PROMPT_CHOICE_QUERYAGAIN";
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
const PROMPT_TEXT_QUESTION = 'PROMPT_TEXT_QUESTION';

class CN_DialogPrice01 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_PRICE01);
        this.logger = logger;

        //this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_DOCUMENT, this.documentPromptValidator));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_QUERYAGAIN));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_FEEDBACK));
        this.addDialog(new TextPrompt(PROMPT_TEXT_QUESTION, this.questionPromptValidator));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.queryDocumentStep.bind(this),
            this.queryDisplayStep.bind(this),
            this.queryAgainStep.bind(this),
            this.queryConfirmationStep.bind(this),
            this.queryRecordStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }
    async queryDocumentStep(stepContext) {
        var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Price01.db));
        var lowdb = low(adapter);
        return await stepContext.prompt(PROMPT_CHOICE_DOCUMENT, {
            prompt: Hint.Price01_SelectDocument,
            retryPrompt: Hint.retryChoice,
            choices: lowdb.get('db').map('document_number').value()
        });
    }

    async queryDisplayStep(stepContext) {
        var d = stepContext.result;
        var template = new ACData.Template(Card.Price01_AdaptiveDocument);
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
        if (stepContext.result.index === 0) {
            return await stepContext.endDialog({ index: 0 })
        }
        else { // not statisfied or no result
            return await stepContext.prompt(PROMPT_TEXT_QUESTION, {
                prompt: Hint.Price01_promptQuestion,
                retryPrompt: Hint.Price01_retryQuestion,
            });
        }

    }
    async queryRecordStep(stepContext) {
        await stepContext.context.sendActivity(Hint.messageQuestionRecord);
        return await stepContext.endDialog({ index: 1 });
    }




    async documentPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value.value;
            var adapter = new FileSync(path.resolve(__dirname, "../db/" + Database.Price01.db));
            var lowdb = low(adapter);
            var d = lowdb.get('db').find({ document_number: k }).value();
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
                    "id": "Price01",
                    "desc": "Open Offer非标价格"
                };
                lowdb.get('questions')
                    .push(question)
                    .write();
                return true;
            }

        }
    }
}

module.exports.CN_DialogPrice01 = CN_DialogPrice01;
module.exports.CN_DIALOG_PRICE01 = CN_DIALOG_PRICE01;
