Vue.component('profile', {
    props: ['pk', 'displayName', 'onClick'],
    data: function () {
        return {
            editing: false,
            private: false,
            personObj: null,
            refreshesStuff: true,
            inContactList: null
        }
    },
    computed: {
        person: {
            get: function () {
                if (this.personObj != null)
                    return this.personObj;
                if (this.pk == null)
                    return null;
                this.getPerson();
                return null;
            },
            set: function (newPerson) {
                this.personObj = newPerson;
            }
        },
        name: {
            get: function () {
                if (this.person == null)
                    return "Loading...";
                if (this.person.givenName != null && this.person.familyName != null)
                    return this.person.givenName + " " + this.person.familyName;
                if (this.person.name == null)
                    return "<Restricted>";
                //EcIdentityManager.getIdentity(EcPk.fromPem(this.pk)).displayName = this.personObj.name;
                return this.person.name;
            },
            set: function (newName) {
                this.personObj.name = newName;
                if (EcIdentityManager.getIdentity(EcPk.fromPem(this.pk)) != null)
                    EcIdentityManager.getIdentity(EcPk.fromPem(this.pk)).displayName = this.personObj.name;
            }
        },
        email: {
            get: function () {
                if (this.person == null)
                    return "Loading...";
                if (this.person.name == null)
                    return "";

                return this.person.email;
            },
            set: function (newEmail) {
                this.personObj.email = newEmail;
            }
        },
        mine: {
            get: function () {
                if (app.me == null)
                    return false;
                if (this.personObj == null)
                    return false;
                return this.personObj.hasOwner(EcPk.fromPem(app.me));
            }
        },
        fingerprint: {
            get: function () {
                if (this.personObj == null)
                    return null;
                return this.personObj.getGuid();
            }
        },
        fingerprintUrl: {
            get: function () {
                if (this.personObj == null)
                    return null;
                if (this.personObj.email != null) {
                    return "https://www.gravatar.com/avatar/" + EcCrypto.md5(this.personObj.email.toLowerCase()) + "?s=44";
                }
                return "http://tinygraphs.com/spaceinvaders/" + this.personObj.getGuid() + "?theme=base&numcolors=16&size=44&fmt=svg";
            }
        },
        isContact: {
            get: function () {
                if (this.inContactList == null) this.inContactList = EcIdentityManager.getContact(EcPk.fromPem(this.pk)) != null;
                return this.inContactList;
            }
        },
        shareStatement: {
            get: function () {
                return "Share your claims about " + (app.subject == app.me ? "yourself" : app.subjectName) + " with " + this.name;
            }
        },
        unshareStatement: {
            get: function () {
                return "Unshare your claims about " + (app.subject == app.me ? "yourself" : app.subjectName) + " with " + this.name;
            }
        },
        isSubject: {
            get: function () {
                return app.subject == this.pk;
            }
        }
    },
    watch: {
        pk: function () {
            this.personObj = null;
            this.editing = false;
            this.private = false;
        },
        private: function () {}
    },
    methods: {
        savePerson: function () {
            this.editing = false;
            var thingToSave = this.personObj;
            var me = this;
            if (this.private) {
                if (thingToSave.reader == null) //Can delete when https://github.com/Eduworks/ec/issues/21 is resolved and integrated.
                    thingToSave.reader = []; //Can delete when https://github.com/Eduworks/ec/issues/21 is resolved and integrated.
                EcEncryptedValue.toEncryptedValueAsync(thingToSave, false, function (thingToSave) {
                    thingToSave.name = null; //Delete PII.
                    EcRepository.save(thingToSave, me.getPerson, console.error);
                }, console.error);
            } else {
                EcRepository.save(thingToSave, me.getPerson, console.error);
            }
        },
        getPerson: function () {
            this.personObj = null;
            if (this.refreshesStuff) {
                if (assertionHistory[this.pk] != null)
                    assertionHistory[this.pk].assertions = null;
                if (viewHistory[this.pk] != null)
                    viewHistory[this.pk].views = null;
            }
            var pk = EcPk.fromPem(this.pk);
            var me = this;
            EcRepository.get(repo.selectedServer + "data/schema.org.Person/" + pk.fingerprint(), function (person) {
                var e = new EcEncryptedValue();
                if (person.isAny(e.getTypes())) {
                    me.private = true;
                    e.copyFrom(person);
                    e.decryptIntoObjectAsync(function (person) {
                        var p = new Person();
                        p.copyFrom(person);
                        me.person = p;
                    }, console.error);
                } else {
                    me.private = false;
                    var p = new Person();
                    p.copyFrom(person);
                    me.person = p;
                }
            }, function (failure) {
                var pk = EcPk.fromPem(me.pk);
                var p = new Person();
                p.assignId(repo.selectedServer, pk.fingerprint());
                p.addOwner(pk);
                if (me.displayName == null)
                    p.name = "Unknown Person.";
                else
                    p.name = me.displayName;
                me.person = p;
                me.private = true;
                if (me.mine)
                    me.savePerson();
            });
        },
        cancelSave: function () {
            this.editing = false;
            this.getPerson();
        },
        clickTitle: function () {
            if (this.onClick != null)
                this.onClick(this.pk);
        },
        contact: function () {
            var c = new EcContact();
            c.pk = EcPk.fromPem(this.pk);
            c.displayName = this.name;
            EcIdentityManager.addContact(c);
            this.inContactList = true;
        },
        uncontact: function () {
            for (var i = 0; i < EcIdentityManager.contacts.length; i++) {
                if (EcIdentityManager.contacts[i].pk.toPem() == this.pk)
                    EcIdentityManager.contactChanged(EcIdentityManager.contacts.splice(i, 1));
            }
            this.inContactList = false;
        },
        shareAssertionsAboutSubjectWith: function () {
            var me = this;
            app.processing = true;
            app.processingMessage = "Fetching assertions about " + app.subjectName;
            var complete = 0;
            var count = 0;
            EcAssertion.search(repo,
                "@owner:\"" + app.subject + "\" AND \\*@reader:\"" + app.me + "\"",
                function (assertions) {
                    count = assertions.length;
                    app.processingMessage = count + " claims found. Sharing with " + me.name + ".";
                    var eah = new EcAsyncHelper();
                    eah.each(assertions, function (assertion, after) {
                        assertion.getSubjectAsync(function (subject) {
                            if (app.subject == subject.toPem()) {
                                assertion.getAgentAsync(function (agent) {
                                    if (app.me == agent.toPem()) {
                                        assertion.addReader(EcPk.fromPem(me.pk));
                                        EcRepository.save(assertion, function () {
                                            app.processingMessage = ++complete + " of " + count + " claims shared with " + me.name + ".";
                                            after();
                                        }, after);
                                    } else
                                        after();
                                }, console.error);
                            } else
                                after();
                        }, console.error);
                    }, function (assertions) {
                        app.processing = false;
                    });
                }, console.error, {
                    size: 5000
                });
        },
        unshareAssertionsAboutSubjectWith: function (evt, after) {
            var me = this;
            app.processing = true;
            app.processingMessage = "Fetching assertions about " + app.subjectName;
            var complete = 0;
            var count = 0;
            EcAssertion.search(repo,
                "@owner:\"" + app.subject + "\" AND \\*@reader:\"" + app.me + "\"",
                function (assertions) {
                    var eah = new EcAsyncHelper();
                    eah.each(assertions, function (assertion, after) {
                        count = assertions.length;
                        app.processingMessage = count + " claims found. Unsharing with " + me.name + ".";
                        assertion.getSubjectAsync(function (subject) {
                            if (app.subject == subject.toPem()) {
                                assertion.getAgentAsync(function (agent) {
                                    if (app.me == agent.toPem()) {
                                        assertion.removeReader(EcPk.fromPem(me.pk));
                                        EcRepository.save(assertion, function () {
                                            app.processingMessage = ++complete + " of " + count + " claims unshared with " + me.name + ".";
                                            after();
                                        }, after);
                                    } else
                                        after();
                                }, console.error);
                            } else
                                after();
                        }, console.error);
                    }, function (assertions) {
                        app.processing = false;
                    });
                }, console.error, {
                    size: 5000
                });
        }
    },
    template: '<div class="profileRow" v-if="person">' +
        '<span v-if="mine">' +
        '<span v-if="editing">' +
        '<i class="mdi mdi-content-save" aria-hidden="true" style="float:right;font-size:large" title="Save your person." v-on:click="savePerson()"></i>' +
        '<i class="mdi mdi-cancel" aria-hidden="true" style="float:right;font-size:large" title="Cancel editing." v-on:click="cancelSave();"></i>' +
        '</span>' +
        '<span v-else>' +
        '<i class="mdi mdi-pencil" aria-hidden="true" style="float:right;font-size:large" title="Edit your person." v-on:click="editing = true;"></i>' +
        '</span>' +
        '</span>' +
        '<span v-else>' +
        '<i class="mdi mdi-account-circle" aria-hidden="true" style="float:right;font-size:large" title="Remove person from contacts." v-if="isContact" v-on:click="uncontact();"></i> ' +
        '<i class="mdi mdi-account-circle-outline" aria-hidden="true" style="float:right;font-size:large" title="Add person to contacts." v-else v-on:click="contact();"></i> ' +
        '<i class="mdi mdi-comment-processing-outline" aria-hidden="true" style="float:right;font-size:large" :title="unshareStatement" v-if="isSubject == false" v-on:click="unshareAssertionsAboutSubjectWith();"></i> ' +
        '<i class="mdi mdi-comment-account" aria-hidden="true" style="float:right;font-size:large" :title="shareStatement" v-if="isSubject == false" v-on:click="shareAssertionsAboutSubjectWith();"></i> ' +
        '</span>' +
        '<img style="vertical-align: sub;" v-if="fingerprint" :src="fingerprintUrl" :title="fingerprint"/> <span v-if="editing">Name:</span><input type="text" v-if="editing" v-on:keyup.esc="cancelSave()" v-on:keyup.enter="savePerson()" v-model="name"> <span v-if="editing">Email:</span><input type="text" v-if="editing" v-on:keyup.esc="cancelSave()" v-on:keyup.enter="savePerson()" v-model="email">' +
        '<h2 v-else v-on:click="clickTitle" style="display:inline;">{{ name }}</h2>' +
        '<div v-if="editing"><br><br><input :id="pk" v-model="private" type="checkbox"><label :for="pk">Private</label></div>' +
        '</div>'
});