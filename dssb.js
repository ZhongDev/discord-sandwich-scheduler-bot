/// requires
require('dotenv').config()
const TOKEN = process.env.TOKEN
const PREFIX = process.env.PREFIX || '!'
const ADMINROLE = process.env.ADMINROLE || 'Admin'
const BALANCEMANAGEROLE = process.env.BALANCEMANAGEROLE || 'Balance-Manage'
var schedule = require('node-schedule')
const Discord = require('discord.js')
const client = new Discord.Client()
const dssb = require('./dssbExport.js')

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
});

client.on('message', message => {
    const command = message.content.toLowerCase().split(' ')[0]
    const args = message.content.split(' ')
    args.shift()
    const guildowner = message.channel.guild.ownerID
    const messageauthor = message.author.id
    const isGuildOwner = guildowner == messageauthor
    const isAdmin = message.member.roles.find(role => role.name === ADMINROLE) || isGuildOwner
    const isBalanceManager = message.member.roles.find(role => role.name === BALANCEMANAGEROLE)

    switch (command) {
        case `${PREFIX}ping`:
            message.reply('Pong!')
            return

        case `${PREFIX}whatsmyid`:
            message.reply('Your discord author id is ' + messageauthor)
            return

        case `${PREFIX}choose`:
            dssb.choose(message, isAdmin, client, args)
            return

        case `${PREFIX}reroll`:
            dssb.reroll(message, isAdmin, client)
            return

        case `${PREFIX}setchannel`:
            dssb.setchannel(message, isAdmin, args)
            return

        case `${PREFIX}addbalance`:
            dssb.addbalance(message, isAdmin, isBalanceManager, args)
            break

        case `${PREFIX}addbal`:
            dssb.addbalance(message, isAdmin, isBalanceManager, args)
            break

        case `${PREFIX}subtractbalance`:
            dssb.subtractbalance(message, isAdmin, isBalanceManager, args)
            break

        case `${PREFIX}subbal`:
            dssb.subtractbalance(message, isAdmin, isBalanceManager, args)
            break

        case `${PREFIX}balance`:
            dssb.balance(message)
            break

        case `${PREFIX}bal`:
            dssb.balance(message)
            break

        case `${PREFIX}addchoice`:
            dssb.addchoice(message, isAdmin, args, PREFIX)
            break

        case `${PREFIX}removechoice`:
            dssb.removechoice(message, isAdmin, args, PREFIX)
            break

        case `${PREFIX}blacklistchoice`:
            dssb.blacklistchoice(message, isAdmin, args, PREFIX)
            break

        case `${PREFIX}choices`:
            dssb.choices(message)
            break
    }
})

client.login(TOKEN);