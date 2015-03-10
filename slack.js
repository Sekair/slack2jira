var request = require('request');

var Slack = function (config) {
    this.token = config.token;
    return this;
};

Slack.prototype.send = function (method, args) {
    args = args || {} ;
    args.token = this.token;
    request.post({
        url: 'https://slack.com/api/' + method,
        json: true,
        form: args
    }, function (error, response, body) {
        if (error || !body.ok) {
            console.log('Error:', error || body.error);
        }
    });
};

exports.Slack = Slack;