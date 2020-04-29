// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ComponentDialog, DialogSet, DialogTurnStatus, WaterfallDialog,
    ChoicePrompt,ChoiceFactory} = require('botbuilder-dialogs');
const { TopLevelDialog, TOP_LEVEL_DIALOG } = require('./topLevelDialog');

const DIALOG_ROOT = 'DIALOG_ROOT';
const DIALOG_ROOT_WATERFALL = 'DIALOG_ROOT_WATERFALL';
const PROMPT_ROOT_CHOICE_LANGUAGE = 'PROMPT_ROOT_CHOICE_LANGUAGE';

class DialogRoot extends ComponentDialog {
    constructor(userState) {
        super(DIALOG_ROOT);
        this.userState = userState;
        this.userProfileAccessor = userState.createProperty("UserProfileAccessor");

        //this.addDialog(new TopLevelDialog());
        this.addDialog(new ChoicePrompt(PROMPT_ROOT_CHOICE_LANGUAGE));
        this.addDialog(new WaterfallDialog(DIALOG_ROOT_WATERFALL, [
            this.languageStep.bind(this)
            //this.initialStep.bind(this),
            //this.finalStep.bind(this)
            
        ]));

        this.initialDialogId = DIALOG_ROOT_WATERFALL;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async languageStep(stepContext){
        return await stepContext.prompt(PROMPT_ROOT_CHOICE_LANGUAGE, {
            prompt: 'Please enter your preferred language.',
            choices: ChoiceFactory.toChoices(['English', '中文'])
        });
    }
    async initialStep(stepContext) {
        return await stepContext.beginDialog(TOP_LEVEL_DIALOG);
    }

    async finalStep(stepContext) {
        const userInfo = stepContext.result;

        const status = 'You are signed up to review ' +
            (userInfo.companiesToReview.length === 0 ? 'no companies' : userInfo.companiesToReview.join(' and ')) + '.';
        await stepContext.context.sendActivity(status);
        await this.userProfileAccessor.set(stepContext.context, userInfo);
        return await stepContext.endDialog();
    }
}

module.exports.DialogRoot = DialogRoot;
module.exports.DIALOG_ROOT = DIALOG_ROOT;
