const dssbDB = require('./dssbDbHandler.js')
const moment = require('moment')

/// Regex
var moneyRgx = /\$?(\d+)(\.\d{1,3})?/

class dssbExport {

    static choices(message){
        dssbDB.choices(message).then((choicesobj)=>{
            returnChoices(message, choicesobj)
        })
    }

    static blacklistchoice(message, isAdmin, args, PREFIX){
        if (!isAdmin) {return message.reply('Only server admins can use this command.')}
        if (args.length < 2) {return message.reply('To blacklist a choice please use `' + PREFIX + 'blacklistchoice <choice> <amount of days>`')}
        var currentMillisecondsEpoch = moment().unix()*1000
        var days = args[args.length - 1]
        if (isNaN(days)) {return message.reply('Please provide the amount of days as a number')}
        var blacklistEpoch = currentMillisecondsEpoch + days * 24 * 60 * 60 * 1000;
        args.pop()
        var sandwich = args.join(' ')
        message.reply('Blacklisting ' + sandwich + ' for ' + days + ' days')
        dssbDB.choices(message).then((choicesobj)=>{
            var alreadyExist = choicesobj[message.guild.id].some(sandwichObj => {
                return sandwichObj.sandwich === sandwich
            })
            if(!alreadyExist){
                message.reply('The specified sandwich does not exist in the choice list. Please check your capilization and try again.')
                return
            }
            choicesobj[message.guild.id] = choicesobj[message.guild.id].map(obj => obj.sandwich === sandwich ? { ...obj, blacklist: blacklistEpoch } : obj)
            dssbDB.setChoicesObj(choicesobj)
            message.reply('Successfully blacklisted ' + sandwich + ' for ' + days + ' days')
            returnChoices(message, choicesobj)
        })
    }

    static removechoice(message, isAdmin, args, PREFIX){
        if (!isAdmin) {return message.reply('Only server admins can use this command.')}
        if (args.length < 1) {return message.reply('To remove a choice please use `' + PREFIX + 'removechoice <choice>`')}
        var sandwich = args.join(' ')
        message.reply('Removing ' + sandwich + ' from the list of choices.')
        dssbDB.choices(message).then((choicesobj)=>{
            var alreadyExist = choicesobj[message.guild.id].some(sandwichObj => {
                return sandwichObj.sandwich === sandwich
            })
            if(!alreadyExist){
                message.reply('The specified sandwich does not exist in the choice list. Please check your capilization and try again.')
                return
            }
            choicesobj[message.guild.id] = choicesobj[message.guild.id].filter(obj => obj.sandwich !== sandwich)
            dssbDB.setChoicesObj(choicesobj)
            message.reply(sandwich + ' has been removed from the list of choices.')
            returnChoices(message, choicesobj)
        })
    }

    static addchoice(message, isAdmin, args, PREFIX){
        if (!isAdmin) {return message.reply('Only server admins can use this command.')}
        if (args.length < 2) {return message.reply('To add a choice please use `' + PREFIX + 'addchoice <choice> <price in dollars>`')}
        var moneymatches = args[args.length - 1].match(moneyRgx)
        if (!moneymatches) {message.reply('The money value provided does not seem to be valid. Please try again.')}
        args.pop()
        var sandwich = args.join(' ')
        var choiceCostCents = Math.round(parseFloat(moneymatches[1] + moneymatches[2]) * 100)
        message.reply('Adding ' + sandwich + ' with the price of $' + choiceCostCents / 100 + ' to the list of choices.')
        dssbDB.choices(message).then((choicesobj)=>{
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
            dssbDB.setChoicesObj(choicesobj)
            message.reply(sandwich + ' with the price of $' + choiceCostCents / 100 + ' has been successfully added to the list of choices.')
            returnChoices(message, choicesobj)
        })
    }

    static balance(message){
        var balanceobj
        dssbDB.balance(message).then((obj)=>{balanceobj = obj})
        .then(()=>{
            message.reply('Balance is now $' + balanceobj[message.guild.id] / 100)
        })
    }

    static subtractbalance(message, isAdmin, args){
        if (!isAdmin) {return message.reply('Only server admins can use this command.')}
        if (args[0] == undefined) {return message.reply('Please define how much balance to subtract')}
        var moneymatches = args[0].match(moneyRgx)
        if(!moneymatches){return message.reply('The money value provided does not seem to be valid. Please try again.')}
        var centsSubtracting = Math.round(parseFloat(moneymatches[1] + moneymatches[2]) * 100)
        message.reply('Subtracting $' + centsSubtracting / 100 + ' from the balance.')
        var balanceobj
        dssbDB.balance(message).then((obj)=>{balanceobj = obj})
        .then(()=>{
            balanceobj[message.guild.id] -= centsSubtracting
            dssbDB.setBalanceObj(balanceobj)
            message.reply('Balance is now $' + balanceobj[message.guild.id] / 100)
        })
    }

    static addbalance(message, isAdmin, args){
        if (!isAdmin) {return message.reply('Only server admins can use this command.')}
        if (args[0] == undefined) {return message.reply('Please define how much balance to add')}
        var moneymatches = args[0].match(moneyRgx)
        if (!moneymatches) {return message.reply('The money value provided does not seem to be valid. Please try again.')}
        var centsAdding = Math.round(parseFloat(moneymatches[1] + moneymatches[2]) * 100)
        message.reply('Adding $' + centsAdding / 100 + ' to the balance.')
        var balanceobj
        dssbDB.balance(message).then((obj)=>{balanceobj = obj})
        .then(()=>{
            balanceobj[message.guild.id] += centsAdding
            dssbDB.setBalanceObj(balanceobj)
            message.reply('Balance is now $' + balanceobj[message.guild.id] / 100)
        })
    }

    static setchannel(message, isAdmin, args){
        if (!isAdmin) {return message.reply('Only server admins can use this command.')}
        var channelobj
        dssbDB.channels(message).then((obj)=>{channelobj = obj})
        .then(()=>{
            switch (args[0].toLowerCase()) {
                case 'tomorrows-sandwich':
                    channelobj[message.guild.id].tomorrowssandwich = message.channel.id
                    message.reply('This channel has been set as the tomorrows-sandwich channel')
                    break
                default:
                    message.reply('Only valid channel to set is `tomorrows-sandwich`')
                    break
            }
            dssbDB.setChannelObj(channelobj)
        })
    }

    static reroll(message, isAdmin, client) {
        if (!isAdmin) {return message.reply('Only server admins can use this command.')}

        /// get variables
        var channelobj, choicesobj, balanceobj
        dssbDB.channels(message).then((obj) => { channelobj = obj })
        .then(() => {
            return dssbDB.choices(message)
        })
        .then((obj) => { choicesobj = obj })
        .then(() => {
            return dssbDB.balance(message)
        })
        .then((obj) => { balanceobj = obj })
        .then(()=>{

            /// checks
            if (channelobj[message.guild.id].tomorrowssandwich == undefined){
                message.reply('Please set the tomorrows-sandwich channel with `!setchannel tomorrows-sandwich`')
                return
            }
            if (choicesobj[message.guild.id].length < 1){
                message.reply('Please add a choice to pick from')
                return
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

            /// selctor
            var selected = choicesNotBlacklisted[Math.floor(Math.random() * choicesNotBlacklisted.length)]
            message.reply('The sandwich that has been rolled is ...')
            setTimeout(function(){
                var selectedSandwich = selected
                message.reply(selected.sandwich + " ($"+ selected.cost/100 + ")")
                dssbDB.setSelected(selectedSandwich, message)
                .then(()=>{
                    client.channels.get(channelobj[message.guild.id].tomorrowssandwich).fetchMessages()
                    .then((list)=>{
                        return client.channels.get(channelobj[message.guild.id].tomorrowssandwich).bulkDelete(list);
                    })
                    .then(() => {
                        var remainingbalance = (balanceobj[message.guild.id] - selected.cost)/100
                        client.channels.get(channelobj[message.guild.id].tomorrowssandwich).send(selected.sandwich + " ($"+ selected.cost/100 + ") -- $" + remainingbalance + " remain after purchase")
                    })
                    .catch((err) => {
                        if(err.code == 50034){
                            message.reply('The message/s in the tomorrows-sandwich channel are older than 14 days old and cannot be auto-deleted.\nPlease manually delete the old message/s')
                            var remainingbalance = (balanceobj[message.guild.id] - selected.cost)/100
                            client.channels.get(channelobj[message.guild.id].tomorrowssandwich).send(selected.sandwich + " ($"+ selected.cost/100 + ") -- $" + remainingbalance + " remain after purchase")
                        }else{
                            console.error(err)
                            message.reply('Something went wrong while attempting to send the message to the tomorrows-sandwich channel')
                        }
                    })
                })
            },1500)
        })
    }
}

module.exports = dssbExport

function returnChoices(message, choicesobj){
    var choicelist = []
    dssbDB.balance(message).then((balanceobj)=>{
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
}