var http = require('http');
var slack = require('./slack');
var JiraApi = require('jira').JiraApi;

var Integration = function(config) {
	this.config = config || {};
	this.config.validateTokens = ['8gdt9aFOXUjt8UUiloVXvxZ8', //bot
		'iPFXObd2ViEJmY5Q10npnkkE', //and below - hooks
		'7BwmZNgth8RwNzg3ptyaxrun',
		'F0oHkW1bCz8hGeRF3Ser0pEb',
		'vRyebcEk72WDCLwTBnvUiGDU',
		'tmauGnZKyouV0EkzqIqRzWZu',
		'qHjWifPkjSZMqfIXb2OOTPSy',
		'iKZPv7HiJqTQrJPstkz23VF8'];
	this.config.token = 'xoxb-3901190303-N0o4LBSoTSu9goNZS8IqnlTl';
	this.config.jiraServer = 'jira.magenta-technology.ru/jira';
	this.jira = new JiraApi('http', "jira.magenta-technology.ru/jira", "", "goldfarb", "******", 'latest');
	this.slack = new slack.Slack(this.config);
	
	this.colors = {
		10: "good",
		3: "danger"
	}
}

Integration.prototype.parseRequest = function(chunk) {
	var result = {};
	var splitData = chunk.split('&');
	for (var i = 0; i < splitData.length; i++) {
		var data = splitData[i].split('=');
		result[data[0]] = data[1];
	}
	return result;
}

Integration.prototype.prepareMessage = function(issue, original) {
	var result = {};
	result.title = issue.key + " " + issue.fields.summary;
	result.title_link = "http://" + this.config.jiraServer + "/browse/" + issue.key;
	result.color = this.colors[issue.fields.priority.id] ? this.colors[issue.fields.priority.id] : "good";
	/*result.fields = [];
	result.fields.push({
			title: "Assignee",
			value: issue.fields.assignee ? issue.fields.assignee.displayName : "Unassigned",
			short: true
		},{
			title: "Status",
			value: issue.fields.status.name,
			short: true
		},{
			title: "Priority",
			value: issue.fields.priority.name,
			short: true
		}, {
			title: "Type",
			value: issue.fields.issuetype.name,
			short: true
		}
	);*/
	result = [result];
	return JSON.stringify(result);
}

Integration.prototype.parseSlashCommand = function(data, response) {
	self = this;
	issueNumber = "MD-" + data.text;
	this.jira.findIssue("MD-" + data.text, function(error, issue) {
		if (error) {
			console.log(error + " " + issueNumber);
		} else {
			console.log("Try to post message about " + issue.key + " to channel " + data.channel_name + " " + data.channel_id);
			self.slack.send('chat.postMessage', {
				channel: data.channel_id,
				text: "Called by: @" + data.user_name,
				username: "JIRA",
				attachments: self.prepareMessage(issue, data),
				link_names: 1,
				unfurl_links: 1
			});
		}
	}); 
}

Integration.prototype.parseCommonMessage = function(data, response) {
	self = this;
	var text = data.text.toLowerCase();
	var issue = [];
	while((index = text.indexOf("md-")) >= 0) {
		text = text.slice(index);
		var endIndex = this.findNextSpace(text);
		issue.push(text.substring(0, endIndex));
		text = text.slice(endIndex);
	}
	for(var i = 0; i < issue.length; i++) {
		issueNumber = issue[i];
		this.jira.findIssue(issueNumber, function(error, issue) {
			if (error) {
				console.log(error + " " + issueNumber + ".");
			} else {
				console.log("Try to post message about " + issue.key + " to channel " + data.channel_name + " " + data.channel_id);
				self.slack.send('chat.postMessage', {
					channel: data.channel_id,
					text: "Called by: @" + data.user_name,
					username: "JIRA",
					attachments: self.prepareMessage(issue, data),
					link_names: 1,
					unfurl_links: 1
				});
			}
		}); 
	}
}

Integration.prototype.findNextSpace = function(text){
	var space = ["%", "+", '.'];
	var nearest = text.length;
	for(var i = 0; i < space.length; i++) {
		var current = text.indexOf(space[i]);
		if (current < nearest && current > 0) {
			nearest = current;
		}
	}
	return nearest;
}

Integration.prototype.start = function() {
	self = this;
	http.createServer(function(request, response) {
		request.on('data', function(chunk) {
		    try {
			data = self.parseRequest(chunk.toString());
			if (self.config.validateTokens.indexOf(data.token) < 0) {
				var error = "Trying to use wrong token: " + data.token;
				console.log(error);
				response.end(error);
				return;
			} 
			if (data.user_name == 'slackbot') {
				response.end();	
				return;
			}
			if (data.command) {
				self.parseSlashCommand(data, response);
			} else {
				self.parseCommonMessage(data, response);
			}
		} catch(e) {
			console.log("Error: " + e);
		}
		response.end();	
		});
	}).listen(1337, "0.0.0.0");
}

new Integration().start();
