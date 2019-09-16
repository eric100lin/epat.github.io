var preProcessGroupDate = function p(groupList) {
    groupList.forEach(function(group) {
        var now = new Date()
        var testSuiteDict = group.test_suite_list.reduce((dict, suite) => {
            dict[suite.test_suite_id] = suite.test_suite
            return dict
        }, {})
        group.estM = group.estimate_time % 60
        group.estH = (group.estimate_time - group.estM) / 60
        group.dStat = {'BUSY':0,'IDLE':0,'ABNORMAL':0}
        group.test_pc_list.forEach(function(testPc) {
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
            itemsPerPageOptions: [4, 8, 12],
            itemsPerPage: 4,
            test_suite_headers: test_suite_headers,
            test_pc_headers: test_pc_headers,
            groups: [],
        }
    },
    created () {
        this.$vuetify.theme.dark = true
        var refreshAutoTestInfo = function f() {
            fetch('./AutoTestData.json')
                .then(response => response.json())
                .then(json => {
                    console.log(this)
                    console.log(this.app)
                    console.log(this.app.groups)
                    console.log(app.groups)
                    app.groups.push(json)
                })
                .then(() => {
                    preProcessGroupDate(app.groups)
                })
        }
        refreshAutoTestInfo()
        setInterval(refreshAutoTestInfo, 120000);
    },
    methods: {
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
                statusList.push(`${testPc.test_suite_id}: (${testPc.main_clno})`)
            if (testPc.fail_count)
                statusList.push(`Continue Fails: ${testPc.fail_count}`)
            if (testPc.status)
                statusList.push(`<font class="red">${testPc.status}</font>`)
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
        }
    },
})
