require('js-methods');
var dazeus = require('dazeus');

// 'constants', you may change these to more sensible defaults
var NBULLETS = 6;
var LOAD_GUN_CMD = 'load-gun';
var PULL_CMD = 'pull';
var ROULETTE_CMD = 'roulette';

// lets parse command line args
var argv = dazeus.optimist().argv;
dazeus.help(argv);
var options = dazeus.optionsFromArgv(argv);

// this array will store all active games
var games = {};

// create the client
var client = dazeus.connect(options, function () {

    /** Try your luck with a random try */
    client.onCommand(ROULETTE_CMD, function (network, user, channel, command, args) {
        if (bulletAt() === 4) {
            kill(client, network, user, channel);
        } else {
            click(client, network, user, channel);
        }
    });

    /** Start a new game */
    client.onCommand(LOAD_GUN_CMD, function (network, user, channel, command) {
        if (typeof games[network] === 'undefined') {
            games[network] = {};
        }

        this.nick(network, function (answer) {
            var where = channel;
            if (channel === answer.nick) {
                where = user;
            }

            games[network][where] = bulletAt();
            started(client, network, user, channel);
        });
    });

    /** Pull the trigger */
    client.onCommand(PULL_CMD, function (network, user, channel, command) {
        if (typeof games[network] === 'undefined') {
            games[network] = {};
        }

        this.nick(network, function (answer) {
            var where = channel;
            if (channel === answer.nick) {
                where = user;
            }

            if (typeof games[network][where] === 'undefined' || games[network][where] < 0) {
                notstarted(client, network, user, channel);
            } else {
                if (games[network][where] === 0) {
                    kill(client, network, user, channel);
                } else {
                    click(client, network, user, channel);
                }

                // we'll just count down until we're at 0
                games[network][where]--;
            }
        });
    });
});

/**
 * Determine the location of the bullet.
 * @return {Number} The location of the bullet (0...NBULLETS - 1)
 */
var bulletAt = function () {
    return Math.floor(Math.random() * NBULLETS);
};

/**
 * Notify someone they've been killed.
 * @param  {DaZeus} client  Client object
 * @param  {String} network Network the user is on
 * @param  {String} user    Name of the user
 * @param  {String} channel Name of the channel the user is on
 */
var kill = function (client, network, user, channel) {
    client.reply(network, channel, user, "*boom*", false);
};

/**
 * Notify someone they're lucky today, the gun only did 'click'.
 * @param  {DaZeus} client  Client object
 * @param  {String} network Network the user is on
 * @param  {String} user    Name of the user
 * @param  {String} channel Name of the channel the user is on
 */
var click = function (client, network, user, channel) {
    client.reply(network, channel, user, "_click_...", false);
};

/**
 * Notify that a game hasn't been started, show them how to start a new one
 * @param  {DaZeus} client  Client object
 * @param  {String} network Network the user is on
 * @param  {String} user    Name of the user
 * @param  {String} channel Name of the channel the user is on
 */
var notstarted = function (client, network, user, channel) {
    client.reply(
        network,
        channel,
        user,
        "A gun and some bullets are on the table, let's }" + LOAD_GUN_CMD + "...",
        false
    );
};

/**
 * Notify that a new game is started
 * @param  {DaZeus} client  Client object
 * @param  {String} network Network the user is on
 * @param  {String} user    Name of the user
 * @param  {String} channel Name of the channel the user is on
 */
var started = function (client, network, user, channel) {
    client.reply(network, channel, user, "*rattle*... the gun is loaded!", false);
};
