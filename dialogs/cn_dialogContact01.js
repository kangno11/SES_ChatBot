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
var _ = require('lodash');
var path = require('path');

var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');
var adapter = new FileSync(path.resolve(__dirname, "../db/cnDB_Contact01.json"));
var lowdb = low(adapter);


const CN_DIALOG_CONTACT01 = 'CN_DIALOG_CONTACT01';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_QUERYMODE = 'PROMPT_CHOICE_QUERYMODE';
const PROMPT_TEXT_KEYWORD = 'PROMPT_TEXT_KEYWORD';
const PROMPT_CHOICE_REGION = 'PROMPT_CHOICE_REGION';
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
//const NUMBER_PROMPT = 'NUMBER_PROMPT';

class CN_DialogContact01 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_CONTACT01);
        this.logger = logger;

        //this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_QUERYMODE));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_REGION, this.regionPromptValidator));
        this.addDialog(new TextPrompt(PROMPT_TEXT_KEYWORD, this.branchPromptValidator));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_FEEDBACK));
        this.addDialog(new WaterfallDialog(DIALOG_WATERFALL, [
            this.queryModeStep.bind(this),
            this.keyWordStep.bind(this),
            this.queryDBStep.bind(this),
            this.finalStep.bind(this)
        ]));

        this.initialDialogId = DIALOG_WATERFALL;
    }
    async queryModeStep(stepContext) {
        return await stepContext.prompt(PROMPT_CHOICE_QUERYMODE, {
            prompt: Hint.promptQueryMode,
            retryPrompt: Hint.retryChoice,
            choices: Menu.Contact01_QueryMode
        });
    }

    async keyWordStep(stepContext) {
        // Set the user's name to what they entered in response to the name prompt.
        stepContext.values.queryMode = stepContext.result;

        switch (stepContext.result.index) {
            case 0: //查询区域主管
                return await stepContext.prompt(PROMPT_CHOICE_REGION, {
                    prompt: Hint.Contact01_SelectRegion,
                    retryPrompt: Hint.retryChoice,
                    choices: lowdb.get('db').map('region').value()
                    //choices: Menu.Contact01_QueryMode
                });
            case 1://查询分公司工程师
                return await stepContext.prompt(PROMPT_TEXT_KEYWORD, {
                    prompt: Hint.Contact01_SelectBranch
                });


        }

    }
    async queryDBStep(stepContext) {

        switch (stepContext.values.queryMode.index) {
            case 0://查询区域主管
                var d = stepContext.result;
                var c = JSON.stringify(Card.Contact01_AdaptiveRegion);
                c = _.replace(c, '<region>', d.region)
                    .replace('<super>', d.super)
                    .replace('<superPhone>', d.superPhone)
                    .replace('<superMail>', d.superMail)
                    .replace('<lastrefreshdate>', d.lastrefreshdate)
                    ;
                await stepContext.context.sendActivity(
                    {
                        attachments: [CardFactory.adaptiveCard(JSON.parse(c))]
                    });
                break;
            case 1://查询分公司工程师
                var d = stepContext.result;
                var c = JSON.stringify(Card.Contact01_AdaptiveBranch);
                c = _.replace(c, '<branch>', d.branch)
                    .replace('<engineer>', d.engineer)
                    .replace('<engineerPhone>', d.engineerPhone)
                    .replace('<engineerMail>', d.engineerMail)
                    .replace('<backup>', d.backup)
                    .replace('<backupPhone>', d.backupPhone)
                    .replace('<backupMail>', d.backupMail)
                    .replace('<lastrefreshdate>', d.lastrefreshdate)
                    ;
                await stepContext.context.sendActivity(
                    {
                        attachments: [CardFactory.adaptiveCard(JSON.parse(c))]
                    });
                break;
        }


        return await stepContext.prompt(PROMPT_CHOICE_FEEDBACK,
            {
                prompt: Hint.promptFeedback,
                choices: Menu.feedbackMenu
            }
        );
    }
    async finalStep(stepContext) {
        //console.log(stepContext.result);
        return await stepContext.endDialog(stepContext.result);

    }


    async branchPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value;
            k = _.trim(k);
            k = _.toUpper(k);
            if (_.size(k) < 2) {
                promptContext.context.sendActivity(Hint.Contact01_ValideBranch);
                return false;
            }
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
                return true;
            }
            else {
                promptContext.context.sendActivity(Hint.messageQueryFailure);
            }



        }
    }

    async regionPromptValidator(promptContext) {
        if (promptContext.recognized.succeeded) {
            var k = promptContext.recognized.value.value;
            var d = lowdb.get('db').find({ region: k }).value();
            if (d) {
                promptContext.recognized.value = d;
                promptContext.recognized.value.lastrefreshdate = lowdb.get("lastRefresh.date").value();
                return true;
            }
        }
    }



}

module.exports.CN_DialogContact01 = CN_DialogContact01;
module.exports.CN_DIALOG_CONTACT01 = CN_DIALOG_CONTACT01;
