// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ComponentDialog, NumberPrompt, TextPrompt, WaterfallDialog,
    ChoicePrompt, ChoiceFactory,ConfirmPrompt } = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');
const { UserProfile } = require('../class/userProfile');
const Hint = require('../resources/hint.json');
const Menu = require('../resources/menu.json');
const AdaptiveCard1_1 = require('../resources/adaptiveCard1_1.json');

const DIALOG_CONTACT_TENDERVO = 'DIALOG_CONTACT_TENDERVO';
const DIALOG_WATERFALL = 'DIALOG_WATERFALL';
const PROMPT_CHOICE_QUERYMODE = 'PROMPT_CHOICE_QUERYMODE';
const PROMPT_TEXT_KEYWORD = 'PROMPT_TEXT_KEYWORD';
const PROMPT_CHOICE_FEEDBACK = "PROMPT_CHOICE_FEEDBACK";
//const NUMBER_PROMPT = 'NUMBER_PROMPT';

class DialogContactTenderVO extends ComponentDialog {
    constructor() {
        super(DIALOG_CONTACT_TENDERVO);
   

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
            prompt: Hint.promptQueryMode[stepContext.options],
            retryPrompt: Hint.retryChoice[stepContext.options],
            choices: Menu.queryMode1_1[stepContext.options]
            //choices: ["1","2"]
        });
    }

    async keyWordStep(stepContext) {
        // Set the user's name to what they entered in response to the name prompt.
        stepContext.values.queryMode = stepContext.result;

        // Ask the user to enter their age.
        return await stepContext.prompt(PROMPT_TEXT_KEYWORD, {
            prompt: Hint.promptKeyWord[stepContext.options]
        });
    }
    async queryDBStep(stepContext) {
        await stepContext.context.sendActivity(
            {
                attachments: [CardFactory.adaptiveCard(AdaptiveCard1_1[stepContext.options])]
            });
            return await stepContext.prompt(PROMPT_CHOICE_FEEDBACK,
                {
                 prompt:  Hint.promptFeedback[stepContext.options], 
                 choices: Menu.feedbackMenu[stepContext.options]
                }
                 );
    }
    async finalStep(stepContext){
        //console.log(stepContext.result);
        return await stepContext.endDialog(stepContext.result);

    }





}

module.exports.DialogContactTenderVO = DialogContactTenderVO;
module.exports.DIALOG_CONTACT_TENDERVO = DIALOG_CONTACT_TENDERVO;
