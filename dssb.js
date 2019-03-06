/// requires
require('dotenv').config()
const TOKEN = process.env.TOKEN
const PREFIX = process.env.PREFIX || '!'
var schedule = require('node-schedule')
const Discord = require('discord.js')
const client = new Discord.Client()
const Keyv = require('keyv')
const dssbDB = new Keyv('sqlite://' + __dirname + '/dssbDB.sqlite', { namespace: 'dssb' })
const blacklistDB = new Keyv('sqlite://' + __dirname + '/dssbDB.sqlite', { namespace: 'blacklist' })
blacklistDB.on('error', (err) => { console.error(err) })
dssbDB.on('error', (err) => { console.error(err) })

/// Regex
var moneyRgx = /\$?(\d+)(\.\d{1,3})?/

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
});

client.on('message', message => {
    const command = message.content.toLowerCase().split(' ')[0]
    const arguments = message.content.split(' ')
    arguments.shift()
    const guildowner = message.channel.guild.ownerID
    const messageauthor = message.author.id
    const isGuildOwner = guildowner == messageauthor

    switch (command) {

        case `${PREFIX}ping`:
            message.reply('Pong!')
            return

        case `${PREFIX}whatsmyid`:
            message.reply('Your discord author id is ' + messageauthor)
            return

        case `${PREFIX}setchannel`:
            if (isGuildOwner) {
                dssbDB.get('channels')
                    .then((channels) => {
                        if (channels == undefined) {
                            var channelobj = {}
                        } else {
                            var channelobj = JSON.parse(channels)
                        }
                        if (channelobj[message.guild.id] == undefined) {
                            channelobj[message.guild.id] = {}
                        }
                        switch (arguments[0].toLowerCase()) {
                            case 'tommorows-sandwich':
                                channelobj[message.guild.id].tommorowssandwich = message.channel.id
                                message.reply('This channel has been set as the tommorows-sandwich channel')
                                break
                            default:
                                message.reply('Only valid channel to set is `tommorows-sandwich`')
                                break
                        }
                        var channeljson = JSON.stringify(channelobj)
                        dssbDB.set('channels', channeljson)
                    })
            } else {
                message.reply('Only the server owner can use this command.')
            }
            return

        case `${PREFIX}addbalance`:
            if (isGuildOwner) {
                if (arguments[0] == undefined) {
                    message.reply('Please define how much balance to add')
                } else {
                    var moneymatches = arguments[0].match(moneyRgx)
                    if (moneymatches) {
                        var centsAdding = Math.round(parseFloat(moneymatches[1] + moneymatches[2]) * 100)
                        message.reply('Adding $' + centsAdding / 100 + ' to the balance.')
                        dssbDB.get('balance')
                            .then((balance) => {
                                if (balance == undefined) {
                                    var balanceobj = {}
                                } else {
                                    var balanceobj = JSON.parse(balance)
                                }
                                if (balanceobj[message.guild.id] == undefined) {
                                    balanceobj[message.guild.id] = 0
                                }
                                balanceobj[message.guild.id] += centsAdding
                                dssbDB.set('balance', JSON.stringify(balanceobj))
                                message.reply('Balance is now $' + balanceobj[message.guild.id] / 100)
                            })
                    }else{
                        message.reply('The money value provided does not seem to be valid. Please try again.')
                    }
                }
            } else {
                message.reply('Only the server owner can use this command.')
            }
            break

        case `${PREFIX}subtractbalance`:
            if (isGuildOwner) {
                if (arguments[0] == undefined) {
                    message.reply('Please define how much balance to subtract')
                } else {
                    var moneymatches = arguments[0].match(moneyRgx)
                    if (moneymatches) {
                        var centsSubtracting = Math.round(parseFloat(moneymatches[1] + moneymatches[2]) * 100)
                        message.reply('Subtracting $' + centsSubtracting / 100 + ' from the balance.')
                        dssbDB.get('balance')
                            .then((balance) => {
                                if (balance == undefined) {
                                    var balanceobj = {}
                                } else {
                                    var balanceobj = JSON.parse(balance)
                                }
                                if (balanceobj[message.guild.id] == undefined) {
                                    balanceobj[message.guild.id] = 0
                                }
                                balanceobj[message.guild.id] -= centsSubtracting
                                dssbDB.set('balance', JSON.stringify(balanceobj))
                                message.reply('Balance is now $' + balanceobj[message.guild.id] / 100)
                            })
                    }else{
                        message.reply('The money value provided does not seem to be valid. Please try again.')
                    }
                }
            } else {
                message.reply('Only the server owner can use this command.')
            }
            break

        case `${PREFIX}bal`:
            dssbDB.get('balance')
                .then((balance) => {
                    if (balance == undefined) {
                        var balanceobj = {}
                    } else {
                        var balanceobj = JSON.parse(balance)
                    }
                    if (balanceobj[message.guild.id] == undefined) {
                        balanceobj[message.guild.id] = 0
                    }
                    message.reply('Balance is $' + balanceobj[message.guild.id] / 100)
                })
            break

        case `${PREFIX}balance`:
            dssbDB.get('balance')
                .then((balance) => {
                    if (balance == undefined) {
                        var balanceobj = {}
                    } else {
                        var balanceobj = JSON.parse(balance)
                    }
                    if (balanceobj[message.guild.id] == undefined) {
                        balanceobj[message.guild.id] = 0
                    }
                    message.reply('Balance is $' + balanceobj[message.guild.id] / 100)
                })
            break
        
        case `${PREFIX}addchoice`:
            if(isGuildOwner){
                if (arguments.length < 2) {
                    message.reply('To add a choice please use `' + PREFIX + 'addchoice <choice> <price in dollars>`')
                } else {
                    var moneymatches = arguments[arguments.length - 1].match(moneyRgx)
                    arguments.pop()
                    var sandwich = arguments.join(' ')
                    if (moneymatches) {
                        var choiceCostCents = Math.round(parseFloat(moneymatches[1] + moneymatches[2]) * 100)
                        message.reply('Adding ' + sandwich + ' with the price of $' + choiceCostCents / 100 + ' to the list of choices.')
                        dssbDB.get('choices')
                            .then((choices) => {
                                if (choices == undefined) {
                                    var choicesobj = {}
                                } else {
                                    var choicesobj = JSON.parse(choices)
                                }
                                if (choicesobj[message.guild.id] == undefined) {
                                    choicesobj[message.guild.id] = []
                                }
                                var alreadyExist = choicesobj[message.guild.id].some(sandwichObj => {
                                    return sandwichObj.sandwich === sandwich
                                })
                                if(alreadyExist){
                                    message.reply('A sandwich with the same name already exists. Please remove it first to readd it.')
                                    return
                                }
                                choicesobj[message.guild.id].push({
                                    sandwich,
                                    cost: choiceCostCents
                                })
                                dssbDB.set('choices', JSON.stringify(choicesobj))
                                message.reply(sandwich + ' with the price of $' + choiceCostCents / 100 + ' has been successfully added to the list of choices.')
                                var choicelist = []
                                choicesobj[message.guild.id].forEach(choice => {
                                    choicelist.push('`' + choice.sandwich + '` `$' + choice.cost/100 + '`')
                                });
                                var choicelistStr = choicelist.join('\n')
                                message.reply('Current Choices are :\n' + choicelistStr)
                            })
                    }else{
                        message.reply('The money value provided does not seem to be valid. Please try again.')
                    }
                }
            }else{
                message.reply('Only the server owner can use this command.')
            }
            break
        
        case `${PREFIX}removechoice`:
            if(isGuildOwner){
                if (arguments.length < 1) {
                    message.reply('To remove a choice please use `' + PREFIX + 'removechoice <choice>`')
                } else {
                    var sandwich = arguments.join(' ')
                    message.reply('Removing ' + sandwich + ' from the list of choices.')
                    dssbDB.get('choices')
                        .then((choices) => {
                            if (choices == undefined) {
                                var choicesobj = {}
                            } else {
                                var choicesobj = JSON.parse(choices)
                            }
                            if (choicesobj[message.guild.id] == undefined) {
                                choicesobj[message.guild.id] = []
                            }
                            var alreadyExist = choicesobj[message.guild.id].some(sandwichObj => {
                                return sandwichObj.sandwich === sandwich
                            })
                            if(!alreadyExist){
                                message.reply('The specified sanwich does not exist in the choice list. Please check your capilization and try again.')
                                return
                            }
                            choicesobj[message.guild.id] = choicesobj[message.guild.id].filter(obj => obj.sandwich !== sandwich)
                            dssbDB.set('choices', JSON.stringify(choicesobj))
                            message.reply(sandwich + ' has been removed from the list of choices.')
                            var choicelist = []
                            choicesobj[message.guild.id].forEach(choice => {
                                choicelist.push('`' + choice.sandwich + '` `$' + choice.cost/100 + '`')
                            });
                            var choicelistStr = choicelist.join('\n')
                            message.reply('Current Choices are :\n' + choicelistStr)
                        })
                }
            }else{
                message.reply('Only the server owner can use this command.')
            }
            break

        case `${PREFIX}choices`:
            dssbDB.get('choices')
                .then((choices) => {
                    if (choices == undefined) {
                        var choicesobj = {}
                    } else {
                        var choicesobj = JSON.parse(choices)
                    }
                    if (choicesobj[message.guild.id] == undefined) {
                        choicesobj[message.guild.id] = []
                    }
                    var choicelist = []
                    choicesobj[message.guild.id].forEach(choice => {
                        choicelist.push('`' + choice.sandwich + '` `$' + choice.cost/100 + '`')
                    });
                    var choicelistStr = choicelist.join('\n')
                    message.reply('Current Choices are :\n' + choicelistStr)
                })
            break
    }
});

client.login(TOKEN);