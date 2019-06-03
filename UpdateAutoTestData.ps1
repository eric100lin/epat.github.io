#Run "Set-ExecutionPolicy RemoteSigned" with admin before you run this script
#Reference: https://officeguide.cc/powershell-set-execution-policy-remote-signed/
Write-Host "Congratulations! UpdateAutoTestData.ps1 started"

#Start-Sleep with progress bar
#Reference: https://gist.github.com/ctigeek/bd637eeaeeb71c5b17f4
function Start-Sleep($seconds) {
    $doneDT = (Get-Date).AddSeconds($seconds)
    while($doneDT -gt (Get-Date)) {
        $secondsLeft = $doneDT.Subtract((Get-Date)).TotalSeconds
        $percent = ($seconds - $secondsLeft) / $seconds * 100
        Write-Progress -Activity "Sleeping" -Status "Sleeping..." -SecondsRemaining $secondsLeft -PercentComplete $percent
        [System.Threading.Thread]::Sleep(500)
    }
    Write-Progress -Activity "Sleeping" -Status "Sleeping..." -SecondsRemaining 0 -Completed
}

#For Production
$user = "shr_he_at_admin"
$pword = ConvertTo-SecureString -String "mediatek" -AsPlainText -Force
$cred = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $user, $pword
$url = "http://ep.mediatek.inc/Monitor/getAutoTestData"
$params = @{"group_id"="144";}
$output = "AutoTestData.json"
#For Testing
#$url = "https://eric100lin.github.io/AutoTestData.json"
#$output = "AutoDownloadData.json"

While($true)
{
    $start_time = Get-Date
    #Reference: https://blog.jourdant.me/post/3-ways-to-download-files-with-powershell
    #Reference: https://stackoverflow.com/questions/35722865/making-a-powershell-post-request-if-a-body-param-starts-with
    #For Production
    Invoke-WebRequest -Uri $url -Method POST -Credential $cred -Body ($params|ConvertTo-Json) -ContentType "application/json" -OutFile $output
    #For Testing
    #Invoke-WebRequest -Uri $url -Method GET -OutFile $output
    Write-Output "Time taken: $((Get-Date).Subtract($start_time).Seconds) second(s) to pull $output"

    #For Production
    Write-Host "Update $output at $start_time"
    git add --all
    git commit -m "Update $output at $start_time"
    git push origin master
    #For Testing
    #git status

    Start-Sleep(120)
}
