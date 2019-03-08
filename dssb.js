/// requires
require('dotenv').config()
const TOKEN = process.env.TOKEN
const PREFIX = process.env.PREFIX || '!'
var schedule = require('node-schedule')
const Discord = require('discord.js')
const client = new Discord.Client()
const Keyv = require('keyv')
const moment = require('moment')
const dssbDB = new Keyv('sqlite://' + __dirname + '/dssbDB.sqlite', { namespace: 'dssb' })
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

        case `${PREFIX}reroll`:
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
                        if (channelobj[message.guild.id].tommorowssandwich == undefined){
                            message.reply('Please set the tommorows-sandwich channel with `!setchannel tomorrows-sandwich`')
                            return
                        }
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
                                if (choicesobj[message.guild.id].length < 1){
                                    message.reply('Please add a choice to pick from')
                                    return
                                }
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
                                        if(balanceobj[message.guild.id] <= 0 ){
                                            message.reply('You have no balance. Please add balance to roll.')
                                            return
                                        }
                                        var choicesCanPayFor = choicesobj[message.guild.id].filter(choice => choice.cost <= balanceobj[message.guild.id])
                                        if(choicesCanPayFor.length < 1){
                                            message.reply('You don\'t have enough balance to pay for any choices. Please add balance enough balance to roll.')
                                            return
                                        }
                                        var choicesNotBlacklisted = choicesCanPayFor.filter(choice => choice.blacklist - moment().unix()*1000 <= 0)
                                        if(choicesNotBlacklisted.length < 1){
                                            message.reply('Everything you can pay for has been blacklisted. Please either add balance so that a non-blacklisted item can be purchased, or remove items from the blacklist.')
                                            return
                                        }
                                        var selected = choicesNotBlacklisted[Math.floor(Math.random() * choicesNotBlacklisted.length)]
                                        message.reply('The sandwich that has been rolled is ...')
                                        setTimeout(function(){
                                            var selectedSandwich = selected
                                            message.reply(selected.sandwich + " ($"+ selected.cost/100 + ")")
                                            dssbDB.get('selected')
                                                .then((selected) => {
                                                    if (selected == undefined) {
                                                        var selectedobj = {}
                                                    } else {
                                                        var selectedobj = JSON.parse(selected)
                                                    }
                                                    if (selectedobj[message.guild.id] == undefined) {
                                                        selectedobj[message.guild.id] = {}
                                                    }
                                                    selectedobj[message.guild.id] = selectedSandwich;
                                                    var selectedjson = JSON.stringify(selectedobj)
                                                    dssbDB.set('selected', selectedjson)
                                                })
                                            client.channels.get(channelobj[message.guild.id].tommorowssandwich).fetchMessages()
                                                .then((list)=>{
                                                    return client.channels.get(channelobj[message.guild.id].tommorowssandwich).bulkDelete(list);
                                                })
                                                .then(() => {
                                                    var remainingbalance = (balanceobj[message.guild.id] - selected.cost)/100
                                                    client.channels.get(channelobj[message.guild.id].tommorowssandwich).send(selected.sandwich + " ($"+ selected.cost/100 + ") -- $" + remainingbalance + " remain after purchase")
                                                })
                                                .catch((err) => {
                                                    console.err(err)
                                                    message.reply('Something went wrong while attempting to send the message to the tommorows-sandwich channel')
                                                })
                                        },1500)
                                    })
                            })
                    })
            } else {
                message.reply('Only the server owner can use this command.')
            }
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
                                    message.reply('A sandwich with the same name already exists. Please remove it first to re-add it.')
                                    return
                                }
                                choicesobj[message.guild.id].push({
                                    sandwich,
                                    cost: choiceCostCents,
                                    blacklist: 0
                                })
                                dssbDB.set('choices', JSON.stringify(choicesobj))
                                message.reply(sandwich + ' with the price of $' + choiceCostCents / 100 + ' has been successfully added to the list of choices.')
                                var choicelist = []
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
                                        choicesobj[message.guild.id].forEach(choice => {
                                            var blacklisted = ''
                                            var cantAfford = ''
                                            if(choice.blacklist - moment().unix()*1000 > 0){
                                                var time = moment(choice.blacklist).fromNow()
                                                blacklisted = ' `BLACKLISTED (expires ' + time + ')`'
                                            }
                                            if(choice.cost > balanceobj[message.guild.id]){
                                                var cantAfford = ' --Cannot afford'
                                            }
                                            var choiceStr = '`' + choice.sandwich + '` `$' + choice.cost/100 + '` ' + cantAfford + blacklisted
                                            choicelist.push(choiceStr.trim())
                                        });
                                        var choicelistStr = choicelist.join('\n')
                                        message.reply('Current Choices are :\n' + choicelistStr)
                                    })
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
                                    choicesobj[message.guild.id].forEach(choice => {
                                        var blacklisted = ''
                                        var cantAfford = ''
                                        if(choice.blacklist - moment().unix()*1000 > 0){
                                            var time = moment(choice.blacklist).fromNow()
                                            blacklisted = ' `BLACKLISTED (expires ' + time + ')`'
                                        }
                                        if(choice.cost > balanceobj[message.guild.id]){
                                            var cantAfford = ' --Cannot afford'
                                        }
                                        var choiceStr = '`' + choice.sandwich + '` `$' + choice.cost/100 + '` ' + cantAfford + blacklisted
                                        choicelist.push(choiceStr.trim())
                                    });
                                    var choicelistStr = choicelist.join('\n')
                                    message.reply('Current Choices are :\n' + choicelistStr)
                                })
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
                            choicesobj[message.guild.id].forEach(choice => {
                                var blacklisted = ''
                                var cantAfford = ''
                                if(choice.blacklist - moment().unix()*1000 > 0){
                                    var time = moment(choice.blacklist).fromNow()
                                    blacklisted = ' `BLACKLISTED (expires ' + time + ')`'
                                }
                                if(choice.cost > balanceobj[message.guild.id]){
                                    var cantAfford = ' --Cannot afford'
                                }
                                var choiceStr = '`' + choice.sandwich + '` `$' + choice.cost/100 + '` ' + cantAfford + blacklisted
                                choicelist.push(choiceStr.trim())
                            });
                            var choicelistStr = choicelist.join('\n')
                            message.reply('Current Choices are :\n' + choicelistStr)
                        })
                })
            break

        case `${PREFIX}blacklistchoice`:
            if (isGuildOwner) {
                if (arguments.length < 2){
                    message.reply('To blacklist a choice please use `' + PREFIX + 'blacklistchoice <choice> <amount of days>`')
                    return
                }
                var currentMillisecondsEpoch = moment().unix()*1000
                var days = arguments[arguments.length - 1]
                var blacklistEpoch = currentMillisecondsEpoch + days * 24 * 60 * 60 * 1000;
                arguments.pop()
                var sandwich = arguments.join(' ')
                if (isNaN(days)) {
                    message.reply('Please provide the amount of days as a number')
                    return
                }
                message.reply('Blacklisting ' + sandwich + ' for ' + days + ' days')
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
                        choicesobj[message.guild.id] = choicesobj[message.guild.id].map(obj => obj.sandwich === sandwich ? { ...obj, blacklist: blacklistEpoch } : obj)
                        dssbDB.set('choices', JSON.stringify(choicesobj))
                        message.reply('Successfully blacklisted ' + sandwich + ' for ' + days + ' days')
                        choicesobj[message.guild.id] = choicesobj[message.guild.id].filter(obj => obj.blacklist !== 0)
                        var choicelist = []
                        choicesobj[message.guild.id].forEach(choice => {
                            timeTillBlacklist = choice.blacklist - currentMillisecondsEpoch
                            if(timeTillBlacklist > 0){
                                var time = moment(choice.blacklist).fromNow()
                                choicelist.push('`' + choice.sandwich + '` expires `' + time + '`')
                            }
                        });
                        var choicelistStr = choicelist.join('\n')
                        message.reply('The blacklist is currently:\n' + choicelistStr)
                    })
            } else {
                message.reply('Only the server owner can use this command.')
            }
            break

    }
});

client.login(TOKEN);