require('js-methods');
var dazeus = require('dazeus');

var NBULLETS = 6;

var games = {};

var client = dazeus.connect({path: '/tmp/dazeus.sock'}, function () {
    client.onCommand('roulette', function (network, user, channel, command, args) {
        if (bulletAt() === 4) {
            kill(client, network, user, channel);
        } else {
            click(client, network, user, channel);
        }
    });

    client.onCommand('load-gun', function (network, user, channel, command) {
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

    client.onCommand('pull', function (network, user, channel, command) {
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
                games[network][where]--;
            }
        });
    });
});

var bulletAt = function () {
    return Math.floor(Math.random() * NBULLETS);
};

var kill = function (client, network, user, channel) {
    client.reply(network, channel, user, "*boom*", false);
};

var click = function (client, network, user, channel) {
    client.reply(network, channel, user, "_click_...", false);
};

var notstarted = function (client, network, user, channel) {
    client.reply(network, channel, user, "A gun and some bullets are on the table, let's }load-gun...", false);
};

var started = function (client, network, user, channel) {
    client.reply(network, channel, user, "*rattle*... the gun is loaded!", false);
};
