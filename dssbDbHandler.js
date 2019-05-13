const Keyv = require('keyv')
const dssbDB = new Keyv('sqlite://' + __dirname + '/dssbDB.sqlite', { namespace: 'dssb' })
dssbDB.on('error', (err) => { console.error(err) })

class dssbDbHandler {
    static channels(message) {
        return new Promise((resolve, reject) => {
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
                    resolve(channelobj)
                })
        })
    }

    static choices(message) {
        return new Promise((resolve, reject) => {
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
                    resolve(choicesobj)
                })
        })
    }

    static balance(message) {
        return new Promise((resolve, reject) => {
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
                    resolve(balanceobj)
                })
        })
    }

    static setSelected(input, message) {
        return new Promise((resolve, reject) => {
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
                    selectedobj[message.guild.id] = input;
                    var selectedjson = JSON.stringify(selectedobj)
                    dssbDB.set('selected', selectedjson)
                    resolve()
                })
        })
    }

    static setChannelObj(input) {
        dssbDB.set('channels', JSON.stringify(input))
    }

    static setChoicesObj(input) {
        dssbDB.set('choices', JSON.stringify(input))
    }

    static setBalanceObj(input) {
        dssbDB.set('balance', JSON.stringify(input))
    }
}

module.exports = dssbDbHandler