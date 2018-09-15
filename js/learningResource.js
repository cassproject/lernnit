Vue.component('resources', {
    props: [],
    data: function () {
        return {
            resourcesResult: null,
            empty: false
        };
    },
    computed: {
        resources: {
            get: function () {
                var me = this;
                if (this.resourcesResult != null) {
                    this.empty = this.resourcesResult.length == 0;
                    return this.resourcesResult;
                }
                var search = "@type:CreativeWork AND educationalAlignment.url:\"" + app.selectedCompetency.shortId() + "\"";
                repo.searchWithParams(search, {
                        size: 50
                    },
                    null,
                    function (resources) {
                        me.resourcesResult = resources;
                    }, console.error);
                return null;
            }
        }
    },
    template: '<div>' +
        '<div v-if="empty"><br>None found...</div>' +
        '<div v-else>' +
        '<ul v-if="resources"><resourceSelect v-for="item in resources" v-bind:key="item.id" :uri="item.id"></resourceSelect></ul>' +
        '<div v-else><br>Loading Resources...</div>' +
        '</div>' +
        '</div>'
});

Vue.component('resourceSelect', {
    props: ['uri'],
    computed: {
        name: {
            get: function () {
                if (this.uri == null) return "Untitled Resource.";
                return EcRepository.getBlocking(this.uri).getName();
            }
        },
        description: {
            get: function () {
                if (this.uri == null) return null;
                return EcRepository.getBlocking(this.uri).getDescription();
            }
        },
    },
    methods: {
        setResource: function () {
            app.selectedResource = EcRepository.getBlocking(this.uri);
            $("#rad4").click();
        }
    },
    template: '<li v-on:click="setResource">' +
        '<span>{{ name }}</span>' +
        '<small v-if="description" class="block">{{ description }}</small>' +
        '</li>'
});

Vue.component('history', {
    props: [],
    data: function () {
        return {
            assertionResult: null,
            empty: false
        };
    },
    computed: {
        resources: {
            get: function () {
                var me = this;
                if (this.assertionResult != null) {
                    this.empty = this.assertionResult.length == 0;
                    return this.assertionResult;
                }
                var search = "\"" + EcIdentityManager.ids[0].ppk.toPk().toPem() + "\" AND competency:\"" + app.selectedCompetency.shortId() + "\"";
                EcAssertion.search(search,
                    function (assertions) {
                        me.assertionResult = resources;
                    }, console.error, {
                        size: 50
                    });
                return null;
            }
        }
    },
    template: '<div>' +
        '<div v-if="empty"><br>None found...</div>' +
        '<div v-else>' +
        '<ul v-if="resources"><assertion v-for="item in assertionResult" v-bind:key="item.id" :uri="item.id"></assertion></ul>' +
        '<div v-else><br>Loading History...</div>' +
        '</div>' +
        '</div>'
});

Vue.component('resourceSelect', {
    props: ['uri'],
    computed: {
        name: {
            get: function () {
                if (this.uri == null) return "Untitled Resource.";
                return EcRepository.getBlocking(this.uri).getName();
            }
        },
        description: {
            get: function () {
                if (this.uri == null) return null;
                return EcRepository.getBlocking(this.uri).getDescription();
            }
        },
    },
    methods: {
        setResource: function () {
            app.selectedResource = EcRepository.getBlocking(this.uri);
            $("#rad4").click();
        }
    },
    template: '<li v-on:click="setResource">' +
        '<span>{{ name }}</span>' +
        '<small v-if="description" class="block">{{ description }}</small>' +
        '</li>'
});
