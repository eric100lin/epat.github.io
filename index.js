var cdidsList = [
    { cdid: 329, image: "images/Uroboros3-10.png" }, //SONY_2K20_Uroboros3
    { cdid: 306, image: "images/Valhalla-10.png", }, //SONY_2K20_Valhalla
    { cdid: 144, image: "images/Uroboros3-P.png"  }, //Uroboros2-P
    { cdid: 271, image: "images/Uroboros3-P.png"  }, //Uroboros3-P
]

var preProcessGroupData = function p(groupList) {
    groupList.forEach(group => {
        var now = new Date()
        var testSuiteDict = group.test_suite_list.reduce((dict, suite) => {
            dict[suite.test_suite_id] = suite.test_suite
            return dict
        }, {})
        group.test_suite_list_hb.reduce((dict, suite) => {
            dict[suite.test_suite_id] = suite.test_suite
            return dict
        }, testSuiteDict)
        cdidsList.forEach(entry => {
            if (entry.cdid == group.group_id)
                group.cdid_image = entry.image
        })
        group.estM = group.estimate_time % 60
        group.estH = (group.estimate_time - group.estM) / 60
        group.dStat = {'BUSY':0,'IDLE':0,'ABNORMAL':0}
        group.test_pc_list.forEach(testPc => {
            if (testPc.main_clno && testPc.test_suite_id in testSuiteDict)
                testPc.test_suite_id = testSuiteDict[testPc.test_suite_id]
            var res = new Date(testPc.update_time)
            var diffMs = Math.abs(now - res)
            var diffMin = Math.floor((diffMs/1000)/60)
            if (testPc.status === "BUSY" && diffMin > 120 ||
                testPc.status === "BUSY" && !testPc.main_clno && diffMin > 10 ||
                testPc.status === "IDLE" && diffMin > 20) {
                testPc.status = 'ABNORMAL!!'
                group.dStat['ABNORMAL']+= 1
            } else {
                group.dStat[testPc.status]+= 1
                testPc.status = ''
            }
        })
    })
}

var app = new Vue({
    el: '#app',
    vuetify: new Vuetify(),
    data () {
        test_suite_headers = [
            { text: 'Suite', value: 'test_suite' },
            { text: 'Queue', value: 'queue', align: 'center' },
            { text: 'Now (M)', value: 'tree_day_avg', align: 'center' },
            { text: 'Week (M)', value: 'last_week_avg', align: 'center' },
            { text: '24H (%)', value: 'pass_rate', align: 'center' },
            { text: 'Top 30/20/10 (%)', value: 'top30_pass_rate', align: 'center' },
        ]
        test_pc_headers = [
            { text: 'Type', value: 'job_type' },
            { text: 'Host / Device', value: 'host_name' },
            { text: 'Status', value: 'main_clno' },
        ]
        return {
            pgbValue: 0,
            test_suite_headers: test_suite_headers,
            test_pc_headers: test_pc_headers,
            groups: [],
        }
    },
    created () {
        this.$vuetify.theme.dark = true
        this.refreshAutoTestInfo()
    },
    mounted () {
        this.startTimerInterval()
    },
    beforeDestroy () {
        this.clearTimerInterval()
    },
    watch: {
        pgbValue (val) {
            if (val < 100)
                return
            this.pgbValue = 0
        },
    },
    methods: {
        refreshAutoTestInfo () {
            var groupsList = []
            Promise.all(cdidsList.map(entry => 
                fetch(`./data/AutoTestData${entry.cdid}.json`)
            )).then(responses =>
                Promise.all(responses.map(response => response.json()))
            ).then(jsons => {
                Promise.all(jsons.map(json => groupsList.push(json)))
            }).then(() => {
                preProcessGroupData(groupsList)
                app.groups.splice(0, app.groups.length)
                Array.prototype.push.apply(app.groups, groupsList)
            })
        },
        getJobTypeIcon (jobType) {
            //Google Material Design Icons
            //https://material.io/resources/icons/?style=baseline
            if (jobType === 'HB')
                return 'schedule'
            return 'playlist_add'
        },
        getJobTypeColor (jobType) {
            if (jobType === 'HB')
                return 'orange'
            return 'green'
        },
        getHostPcCatDevice (testPc) {
            return testPc.host_name.replace('ATHQA0', '') + ' Device ' + testPc.device + ''
        },
        getTestStatus (testPc) {
            var statusList = []
            if (testPc.main_clno)
                statusList.push(`<font class="blink">${testPc.test_suite_id}: (${testPc.main_clno})</font>`)
            if (testPc.fail_count)
                statusList.push(`Continue Fails: ${testPc.fail_count}`)
            if (testPc.status)
                statusList.push(`<font class="red blink">${testPc.status}</font>`)
            if (statusList.length === 0)
                statusList.push(`Update: ${testPc.update_time}`)
            return statusList.join('<br/>')
        },
        getPassRateColor (passRate) {
            if (passRate < 60)
                return 'red'
            if (passRate < 70)
                return 'orange'
            if (passRate < 80)
                return 'yellow'
            return ''
        },
        getNowAvgColor (testSuite) {
            if (testSuite.tree_day_avg > (10 + testSuite.last_week_avg))
                return 'red'
            return ''
        },
        getQueueColor (queueSize) {
            if (queueSize > 8)
                return 'red'
            return ''
        },
        startTimerInterval () {
            this.clearTimerInterval()

            this.refereshInterval = setInterval(this.refreshAutoTestInfo, 120000)
            this.pgbInterval = setInterval(() => {
                this.pgbValue += 0.83
            }, 1000)
        },
        clearTimerInterval () {
            clearInterval(this.pgbInterval)
            clearInterval(this.refereshInterval)
        }
    },
})
