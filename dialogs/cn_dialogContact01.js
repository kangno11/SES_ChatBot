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
const Hint = require('../resources/cn_hint.json');
const Menu = require('../resources/cn_menu.json');
const CN_AdaptiveCard1_1 = require('../resources/cn_adaptiveCard1_1.json');

const CN_DIALOG_CONTACT01 = 'CN_DIALOG_CONTACT01';//Tender&VO业务客服联系人
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_QUERYMODE = 'PROMPT_CHOICE_QUERYMODE';
const PROMPT_TEXT_KEYWORD = 'PROMPT_TEXT_KEYWORD';
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
//const NUMBER_PROMPT = 'NUMBER_PROMPT';

class CN_DialogContact01 extends ComponentDialog {
    constructor(logger) {
        super(CN_DIALOG_CONTACT01);
        this.logger = logger;

        //this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(PROMPT_CHOICE_QUERYMODE));
        this.addDialog(new TextPrompt(PROMPT_TEXT_KEYWORD));
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
            choices: Menu.queryMode1_1
            //choices: ["1","2"]
        });
    }

    async keyWordStep(stepContext) {
        // Set the user's name to what they entered in response to the name prompt.
        stepContext.values.queryMode = stepContext.result;

        // Ask the user to enter their age.
        return await stepContext.prompt(PROMPT_TEXT_KEYWORD, {
            prompt: Hint.promptKeyWord
        });
    }
    async queryDBStep(stepContext) {
        await stepContext.context.sendActivity(
            {
                attachments: [CardFactory.adaptiveCard(CN_AdaptiveCard1_1)]
            });
            return await stepContext.prompt(PROMPT_CHOICE_FEEDBACK,
                {
                 prompt:  Hint.promptFeedback, 
                 choices: Menu.feedbackMenu
                }
                 );
    }
    async finalStep(stepContext){
        //console.log(stepContext.result);
        return await stepContext.endDialog(stepContext.result);

    }





}

module.exports.CN_DialogContact01 = CN_DialogContact01;
module.exports.CN_DIALOG_CONTACT01 = CN_DIALOG_CONTACT01;
