// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require('path');
const restify = require('restify');
const log4js = require('log4js');
const logconf = require('./config/cn_log.json');
log4js.configure(logconf);
const cn_logger = log4js.getLogger();

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { 
    BotFrameworkAdapter, 
    MemoryStorage, 
    UserState, 
    ConversationState 
} = require('botbuilder');

const { CN_BotSES } = require('./bots/cn_botSES');
const { CN_DialogRoot } = require('./dialogs/cn_dialogRoot');

// Read environment variables from .env file
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3977, function() {
    cn_logger.debug(`${ server.name } listening to ${ server.url }`);
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const cn_adapter = new BotFrameworkAdapter({
    appId: process.env.CN_MicrosoftAppId,
    appPassword: process.env.CN_MicrosoftAppPassword
});

// Define state store for your bot.
// See https://aka.ms/about-bot-state to learn more about bot state.
const cn_memoryStorage = new MemoryStorage();

// Create user and conversation state with in-memory storage provider.
const cn_userState = new UserState(cn_memoryStorage);
const cn_conversationState = new ConversationState(cn_memoryStorage);

// Create the main dialog.
const cn_dialogRoot = new CN_DialogRoot(cn_userState,cn_logger);
const cn_botSES = new CN_BotSES(cn_conversationState, cn_userState, cn_dialogRoot,cn_logger);

// Catch-all for errors.
cn_adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    cn_logger.error(`${context.activity.from.name}[onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    //await context.sendTraceActivity(
    //    'OnTurnError Trace',
    //    `${ error }`,
    //    'https://www.botframework.com/schemas/error',
    //    'TurnError'
    //);

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
    // Clear out state
    await cn_conversationState.clear(context);
    await cn_conversationState.saveChanges(context, false);
};

// Listen for incoming requests. 
server.post('/api/cn', (req, res) => {
    cn_adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await cn_botSES.run(context);
    });
});

server.get('/', (req, res,next) => {
    var d = new Date();
    res.send('The site is running, today a is: '+ d.toLocaleDateString() + ' time is:' + d.toLocaleTimeString());
    return next();

});
