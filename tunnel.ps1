while ($true) {
    Write-Host "Starting Serveo..."
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R 80:localhost:3000 serveo.net
    Write-Host "Serveo disconnected, restarting in 3 seconds..."
    Start-Sleep -Seconds 3
}
