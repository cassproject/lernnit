var repo = new EcRepository();
if (window.location.origin.indexOf("127.0.0.1") == -1 && window.location.origin.indexOf("localhost") == -1 && window.location.origin.indexOf("vlrc.cassproject.org") == -1)
    repo.autoDetectRepository();
if (repo.selectedServer == null)
    repo.selectedServer = "https://dev.cassproject.org/api/";
EcRepository.caching = true;

$(document).ready(function () {
    $("#rad4").change(function (evt) {
        if ($("#rad4:checked").length > 0)
            $("#viewOutputFramework").attr("src", "cass-editor/index.html?server=" + repo.selectedServer + "&user=wait&origin=" + window.location.origin);
        else
            $("#viewOutputFramework").attr("src", "");
    });

    if (queryParams.user == "wait") {
        console.log("Sending waiting message");
        sendWaitingMessage();
    } else {
        setTimeout(function () {
            EcIdentityManager.readIdentities();
            if (EcIdentityManager.ids.length == 0) {
                var i = new EcIdentity();
                i.displayName = "You";
                EcPpk.generateKeyAsync(function (ppk) {
                    i.ppk = ppk;
                    EcIdentityManager.addIdentity(i);
                    ready2();
                    EcIdentityManager.saveIdentities();
                });
            } else {
                ready2();
            }
        }, 100);
        if (queryParams.frameworkId != null) {
            setTimeout(function () {
                app.selectedFramework = EcFramework.getBlocking(queryParams.frameworkId);
                $("#rad2").click();
            }, 100);
        } else {
            setTimeout(function () {
                $("#rad1").click();
            }, 100);
        }
    }
});

function ready2() {
    $("iframe").ready(function () {
        $(window).on("message", function (event) {
            if (event.originalEvent.data.message == "waiting") {
                //Identity
                $("iframe")[0].contentWindow.postMessage(JSON.stringify({
                    action: "identity",
                    identity: EcIdentityManager.ids[0].ppk.toPem()
                }), window.location.origin);
            };
        });
    });

    app.login = true;
    app.me = EcIdentityManager.ids[0].ppk.toPk().toPem();
}

//**************************************************************************************************
// CASS UI VLRC iFrame Communication Functions
//**************************************************************************************************

//**************************************************************************************************
// Constants

const ALIGN_MESSAGE = "gotoAlign";
const WAITING_MESSAGE = "waiting";

const FWK_TO_FWK_ALIGN_TYPE = "fwkToFwk";

const INIT_IDENTITY_ACTION = "initIdentity";

//**************************************************************************************************
// Action Executions
//**************************************************************************************************

function performInitIdentityAction(data) {
    repo.selectedServer = data.serverParm;
    var ident = new EcIdentity();
    ident.ppk = EcPpk.fromPem(data.pemParm);
    ident.displayName = data.nameParm;
    EcIdentityManager.addIdentity(ident);

    if (queryParams.frameworkId != null) {
        setTimeout(function () {
            app.selectedFramework = EcFramework.getBlocking(queryParams.frameworkId);
            $("#rad2").click();
        }, 100);
    } else {
        setTimeout(function () {
            $("#rad1").click();
        }, 100);
    }
}

//**************************************************************************************************
// Message Sender
//**************************************************************************************************

function sendWaitingMessage() {
    var message = {
        message: WAITING_MESSAGE
    };
    parent.postMessage(message, queryParams.origin);
}

//**************************************************************************************************
// Message Listener
//**************************************************************************************************

function performAction(action, data) {
    switch (action) {
        case INIT_IDENTITY_ACTION:
            performInitIdentityAction(data);
            break;
        default:
            break;
    }
}

var messageListener = function (evt) {
    var data = evt.data;
    if (data != null && data != "") {
        if (EcObject.isObject(data) || data.startsWith("{")) {
            if (!EcObject.isObject(data))
                data = JSON.parse(data);
            if (data != null && data != "") {
                if (data.action == null || data.action == "") {} else performAction(data.action, data);
            } else {}
        }
    } else {}
}

if (window.addEventListener) {
    window.addEventListener("message", messageListener, false);
} else {
    window.attachEvent("onmessage", messageListener);
}
