var fs = require("fs"),
    Steam = require("steam"),
    SteamID = require("steamid"),
    IntervalIntArray = {},
    readlineSync = require("readline-sync"),
    Protos = require("./protos/protos.js"),
    CountReports = 0,
    Long = require("long"),
    SteamClients = {},
    SteamUsers = {},
    SteamGCs = {},
    SteamFriends = {},
    process = require("process"),
    steamID = readlineSync.question("SteamID64 which will be reported: "),
    ClientHello = 4006,
    ClientWelcome = 4004;

var accounts = [];

var arrayAccountsTxt = fs.readFileSync("accounts.txt").toString().split("\n");
for (i in arrayAccountsTxt) {
    var accInfo = arrayAccountsTxt[i].toString().trim().split(":");
    var username = accInfo[0];
    var password = accInfo[1];
    accounts[i] = [];
    accounts[i].push({
        username: username,
        password: password
    });
}

arrayAccountsTxt.forEach(processSteamReport);

function processSteamReport(element, indexElement, array) {
    if (element != "") {
        var account = element.toString().trim().split(":");
        var account_name = account[0];
        var password = account[1];
        SteamClients[indexElement] = new Steam.SteamClient();
        SteamUsers[indexElement] = new Steam.SteamUser(SteamClients[indexElement]);
        SteamGCs[indexElement] = new Steam.SteamGameCoordinator(SteamClients[indexElement], 730);
        SteamFriends[indexElement] = new Steam.SteamFriends(SteamClients[indexElement]);

        SteamClients[indexElement].connect();

        SteamClients[indexElement].on("connected", function() {
            SteamUsers[indexElement].logOn({
                account_name: account_name,
                password: password
            });
        });

        SteamClients[indexElement].on("logOnResponse", function(res) {
            if (res.eresult !== Steam.EResult.OK) {
                if (res.eresult == Steam.EResult.ServiceUnavailable) {
                    console.log("\n[STEAM CLIENT - " + account_name + "] Login failed - STEAM IS DOWN!");
                    console.log(res);
                    SteamClients[indexElement].disconnect();
                    process.exit();
                } else {
                    console.log("\n[STEAM CLIENT - " + account_name + "] Login failed!");
                    console.log(res);
                    SteamClients[indexElement].disconnect();
                    SteamClients.splice(indexElement, 1);
                    SteamFriends.splice(indexElement, 1);
                    SteamGCs.splice(indexElement, 1);
                    SteamUsers.splice(indexElement, 1);
                    IntervalIntArray.splice(indexElement, 1);
                }
            } else {
                SteamFriends[indexElement].setPersonaState(Steam.EPersonaState.Offline);

                SteamUsers[indexElement].gamesPlayed({
                    games_played: [{
                        game_id: 730
                    }]
                });

                if (SteamGCs[indexElement]) {
                    IntervalIntArray[indexElement] = setInterval(function() {
                        SteamGCs[indexElement].send({
                            msg: ClientHello,
                            proto: {}
                        }, new Protos.CMsgClientHello({}).toBuffer());
                    }, 2000);
                } else {
                    SteamClients[indexElement].disconnect();
                    SteamClients.splice(indexElement, 1);
                    SteamFriends.splice(indexElement, 1);
                    SteamGCs.splice(indexElement, 1);
                    SteamUsers.splice(indexElement, 1);
                    IntervalIntArray.splice(indexElement, 1);
                }
            }
        });

        SteamClients[indexElement].on("error", function(err) {
            console.log("[STEAM CLIENT - " + account_name + "] Account is probably ingame! Logged out!");
            SteamClients[indexElement].disconnect();
            SteamClients.splice(indexElement, 1);
            SteamFriends.splice(indexElement, 1);
            SteamGCs.splice(indexElement, 1);
            SteamUsers.splice(indexElement, 1);
            IntervalIntArray.splice(indexElement, 1);
        });

        SteamGCs[indexElement].on("message", function(header, buffer, callback) {
            switch (header.msg) {
                case ClientWelcome:
                    clearInterval(helloMsgInterval);
                    console.log("[INFO] Trying to commend the user!");

                    steamGameCoordinator.send({
                        msg: protos.ECsgoGCMsg.k_EMsgGCCStrike15_v2_ClientCommendPlayer,
                        proto: { }
                    }, new protos.CMsgGCCStrike15_v2_ClientCommendPlayer({
                        accountId: new steamID(process.argv[3]).accountid,
                        matchId: 8,
                        commendation: new protos.PlayerCommendationInfo({
                            cmdFriendly: 1,
                            cmdTeaching: 2,
                            cmdLeader: 4
                        }),
                        tokens: 10
                    }).toBuffer());

                    setTimeout(function() {
                        stop();
                    }, 3000);
                    break;
                case protos.ECsgoGCMsg.k_EMsgGCCStrike15_v2_MatchmakingGC2ClientHello:
                    console.log("[INFO] MM Client Hello sent!");
                    break;
                default:
                    console.log(header);
                    break;
            }
        });
    }
}

process.on("uncaughtException", function(err) {});

console.log("Initializing ReportBot by askwrite...\nCredits: Trololo - Idea");
