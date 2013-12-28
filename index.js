#!/usr/bin/env node

require('js-methods');
var dazeus = require('dazeus');
var util = require('util');

// 'constants', you may change these to more sensible defaults
var CHAMBERS = 6;
var LOAD_GUN_CMD = 'load-gun';
var PULL_CMD = 'pull';
var PUSH_CMD = 'push';
var ROULETTE_CMD = 'roulette';
var SURVIVOR_CMD = 'survivor';

var CLICK_TXT = "_click_...";
var BOOM_TXT = "*boom*";
var VICTIMS_TXT = "The gun only has %d chambers, I'm counting %d depressed victims...";
var START_GAME_TXT = "A gun and some bullets are on the table, let's }%s...";
var GUN_LOADED_TXT = "*rattle*... the gun is loaded!";
var NOTHING_GIVEN_TXT = "Nothing can survive if there's nothing for the bullet to hit";
var SUICIDE_TXT = "Oh no! The gun fires itself as it is pushed off the table, killing %s...";
var WATCH_IT_TXT = "Watch it, you idiot! You might have set it off!";
var SURVIVOR_DUEL_TXT = "%s and %s are in an epic battle. There can only be one survivor... it is... %s";
var SURVIVOR_TXT = "There can only be one survivor... it is... %s";
var ROULETTE_SURVIVOR_TXT = "%s survives! ";
var ROULETTE_KILLED_TXT = "%s Alas, %s is no more... ";
var UNFAIR_FIGHT_TXT = "That is one fight I wouldn't want to join...";
var NOBODY_KILLED_TXT = "Everbody lives another day!";

// lets parse command line args
var argv = dazeus.optimist().argv;
dazeus.help(argv);
var options = dazeus.optionsFromArgv(argv);

// this array will store all active games
var games = {};

// create the client
var client = dazeus.connect(options, function () {

    /** Try your luck with a random try, or do a quick game */
    client.onCommand(ROULETTE_CMD, function (network, user, channel, command, args) {
        if (args.trim().length === 0) {
            if (bulletAt() === 4) {
                kill(client, network, user, channel);
            } else {
                click(client, network, user, channel);
            }
        } else {
            var users = [];
            for (var i in arguments) {
                if (arguments.hasOwnProperty(i) && parseInt(i, 10) > 4) {
                    users.push(arguments[i]);
                }
            }
            if (users.length > CHAMBERS) {
                client.reply(network, channel, user, util.format(
                    VICTIMS_TXT,
                    CHAMBERS,
                    users.length
                ), false);
            }
            var bullet = bulletAt();
            var response = "";
            var kills = false;

            for (var u = 0; u < users.length; u += 1) {
                if (bullet === 0) {
                    response += util.format(ROULETTE_KILLED_TXT, BOOM_TXT, users[u]);
                    kills = true;
                    break;
                } else {
                    response += util.format(ROULETTE_SURVIVOR_TXT, users[u]);
                    bullet -= 1;
                }
            }
            if (kills === false) {
                response += NOBODY_KILLED_TXT;
            }

            client.reply(network, channel, user, response, false);
        }
    });

    /** See who would survive... */
    client.onCommand(SURVIVOR_CMD, function (network, user, channel, command, args) {
        if (args.trim().length === 0) {
            client.reply(network, channel, user, NOTHING_GIVEN_TXT, false);
        } else {
            var users = [];
            for (var i in arguments) {
                if (arguments.hasOwnProperty(i) && parseInt(i, 10) > 4) {
                    users.push(arguments[i]);
                }
            }
            if (users.length === 1) {
                users.push(user);
            }

            users = users.unique();
            if (users.length === 1) {
                client.reply(network, channel, user, UNFAIR_FIGHT_TXT, false);
            } else {
                var survivor = users[bulletAt(users.length)];
                var fight = '';
                if (users.length === 2) {
                    fight = util.format(SURVIVOR_DUEL_TXT, users[0], users[1], survivor);
                } else {
                    fight = util.format(SURVIVOR_TXT, survivor);
                }
                client.reply(network, channel, user, fight, false);
            }
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

    /** Don't do that, you idiot! */
    client.onCommand(PUSH_CMD, function (network, user, channel, command) {
        if (bulletAt() === 4) {
            client.reply(network, channel, user, util.format(SUICIDE_TXT, user), false);
        } else {
            client.reply(network, channel, user, util.format(WATCH_IT_TXT));
        }
    });
});

/**
 * Determine the location of the bullet.
 * @return {Number} The location of the bullet (0...CHAMBERS - 1)
 */
var bulletAt = function (n) {
    if (typeof n === 'undefined' || n === null) {
        n = CHAMBERS;
    }
    return Math.floor(Math.random() * n);
};

/**
 * Notify someone they've been killed.
 * @param  {DaZeus} client  Client object
 * @param  {String} network Network the user is on
 * @param  {String} user    Name of the user
 * @param  {String} channel Name of the channel the user is on
 */
var kill = function (client, network, user, channel) {
    client.reply(network, channel, user, BOOM_TXT, false);
};

/**
 * Notify someone they're lucky today, the gun only did 'click'.
 * @param  {DaZeus} client  Client object
 * @param  {String} network Network the user is on
 * @param  {String} user    Name of the user
 * @param  {String} channel Name of the channel the user is on
 */
var click = function (client, network, user, channel) {
    client.reply(network, channel, user, CLICK_TXT, false);
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
        util.format(START_GAME_TXT, LOAD_GUN_CMD),
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
    client.reply(network, channel, user, GUN_LOADED_TXT, false);
};
